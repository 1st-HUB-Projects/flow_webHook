const crypto = require('crypto');

// Load env vars (PRIVATE_KEY, PASSPHRASE, APP_SECRET)
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PASSPHRASE = process.env.PASSPHRASE || '';
const APP_SECRET = process.env.APP_SECRET;

if (!PRIVATE_KEY) {
  throw new Error('Private key is empty. Please check your env variable "PRIVATE_KEY".');
}

// Flow logic (copied from flow.js, as function)
function getNextScreen(decryptedBody) {
  const { screen, data, version, action, flow_token } = decryptedBody;
  // handle health check request
  if (action === "ping") {
    return {
      data: {
        status: "active",
      },
    };
  }

  // handle error notification
  if (data?.error) {
    console.warn("Received client error:", data);
    return {
      data: {
        acknowledged: true,
      },
    };
  }

  // handle initial request when opening the flow
  if (action === "INIT") {
    return {
      screen: "MY_SCREEN",
      data: {
        // custom data for the screen
        greeting: "Hey there! 👋",
      },
    };
  }

  if (action === "data_exchange") {
    // handle the request based on the current screen
    switch (screen) {
      case "MY_SCREEN":
        // TODO: process flow input data
        console.info("Input name:", data?.name);

        // send success response to complete and close the flow
        return {
          screen: "SUCCESS",
          data: {
            extension_message_response: {
              params: {
                flow_token,
              },
            },
          },
        };
      default:
        break;
    }
  }

  console.error("Unhandled request body:", decryptedBody);
  throw new Error(
    "Unhandled endpoint request. Make sure you handle the request action & screen logged above."
  );
}

// Encryption logic (copied from encryption.js, as functions)
function decryptRequest(body, privatePem, passphrase) {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

  const privateKey = crypto.createPrivateKey({ key: privatePem, passphrase });
  let decryptedAesKey = null;
  try {
    // decrypt AES key created by client
    decryptedAesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encrypted_aes_key, "base64")
    );
  } catch (error) {
    console.error(error);
    throw new FlowEndpointException(
      421,
      "Failed to decrypt the request. Please verify your private key."
    );
  }

  // decrypt flow data
  const flowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
  const initialVectorBuffer = Buffer.from(initial_vector, "base64");

  const TAG_LENGTH = 16;
  const encrypted_flow_data_body = flowDataBuffer.subarray(0, -TAG_LENGTH);
  const encrypted_flow_data_tag = flowDataBuffer.subarray(-TAG_LENGTH);

  const decipher = crypto.createDecipheriv(
    "aes-128-gcm",
    decryptedAesKey,
    initialVectorBuffer
  );
  decipher.setAuthTag(encrypted_flow_data_tag);

  const decryptedJSONString = Buffer.concat([
    decipher.update(encrypted_flow_data_body),
    decipher.final(),
  ]).toString("utf-8");

  return {
    decryptedBody: JSON.parse(decryptedJSONString),
    aesKeyBuffer: decryptedAesKey,
    initialVectorBuffer,
  };
}

function encryptResponse(response, aesKeyBuffer, initialVectorBuffer) {
  // flip initial vector
  const flipped_iv = [];
  for (const pair of initialVectorBuffer.entries()) {
    flipped_iv.push(~pair[1]);
  }

  // encrypt response data
  const cipher = crypto.createCipheriv(
    "aes-128-gcm",
    aesKeyBuffer,
    Buffer.from(flipped_iv)
  );
  return Buffer.concat([
    cipher.update(JSON.stringify(response), "utf-8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
}

class FlowEndpointException extends Error {
  constructor (statusCode, message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

// Signature validation
function isRequestSignatureValid(rawBody, signatureHeader) {
  if (!APP_SECRET) {
    console.warn("App Secret is not set up. Skipping signature validation (unsafe for prod).");
    return true;
  }

  if (!signatureHeader) {
    console.error("No signature header provided");
    return false;
  }

  const signatureBuffer = Buffer.from(signatureHeader.replace("sha256=", ""), "utf-8");

  const hmac = crypto.createHmac("sha256", APP_SECRET);
  const digestString = hmac.update(rawBody).digest('hex');
  const digestBuffer = Buffer.from(digestString, "utf-8");

  if ( !crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
    console.error("Error: Request Signature did not match");
    return false;
  }
  return true;
}

// Main Lambda handler
module.exports.handler = async (event, context) => {
  console.log('=== LAMBDA INVOCATION START ===');
  console.log('HTTP Method:', event.requestContext.http.method);

  try {
    const httpMethod = event.requestContext.http.method;

    // Handle GET verification (webhook subscribe)
    if (httpMethod === 'GET') {
      const mode = event.queryStringParameters?.['hub.mode'];
      const token = event.queryStringParameters?.['hub.verify_token'];
      const challenge = event.queryStringParameters?.['hub.challenge'];

      if (mode === 'subscribe' && token === 'test1234567890') {  // Your verify token
        console.log('Webhook verified successfully');
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: challenge
        };
      }

      console.error('Webhook verification failed');
      return {
        statusCode: 403,
        body: 'Verification failed'
      };
    }

    // Handle POST (Flows payloads)
    if (httpMethod === 'POST') {
      let body = event.body;
      if (event.isBase64Encoded) {
        body = Buffer.from(body, 'base64').toString('utf8');
      }

      let parsedBody = typeof body === 'string' ? JSON.parse(body) : body;

      // Signature validation
      const signature = event.headers['x-hub-signature-256'];
      if (!isRequestSignatureValid(body, signature)) {
        return { statusCode: 432 };  // Meta code for invalid signature
      }

      let decryptedRequest;
      try {
        decryptedRequest = decryptRequest(parsedBody, PRIVATE_KEY, PASSPHRASE);
      } catch (err) {
        console.error(err);
        if (err instanceof FlowEndpointException) {
          return { statusCode: err.statusCode };
        }
        return { statusCode: 500 };
      }

      const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
      console.log("💬 Decrypted Request:", decryptedBody);

      const screenResponse = getNextScreen(decryptedBody);  // Sync call
      console.log("👉 Response to Encrypt:", screenResponse);

      const encryptedResponse = encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: encryptedResponse
      };
    }

    // Unsupported method
    return { statusCode: 405, body: 'Method Not Allowed' };

  } catch (error) {
    console.error('=== LAMBDA ERROR ===', error);
    return { statusCode: 500, body: 'Server error' };
  } finally {
    console.log('=== LAMBDA INVOCATION END ===');
  }
};