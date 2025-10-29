const crypto = require('crypto');

// Environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Full PEM RSA private key (PKCS#8, unencrypted)

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable is required');
}

// Log key format for debugging (redacted)
console.log('Private key format check (first 100 chars):', PRIVATE_KEY.substring(0, 100) + '...');

if (!PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----')) {
  console.error('Invalid key format: Must be PKCS#8 PEM (starts with -----BEGIN PRIVATE KEY-----)');
  throw new Error('Invalid private key format');
}

// Main Lambda handler (for Function URL)
exports.handler = async (event) => {
  console.log('=== LAMBDA INVOCATION START ===');
  // console.log('Full event:', JSON.stringify(event, null, 2)); // Uncomment for full payload debug

  try {
    const httpMethod = event.requestContext?.http?.method || 'GET';
    console.log('HTTP Method:', httpMethod);

    if (httpMethod !== 'POST') {
      console.log('Non-POST request - returning 405');
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // Parse body (handle base64 if needed)
    let body = event.body;
    if (event.isBase64Encoded) {
      body = Buffer.from(body, 'base64').toString('utf8');
    }
    body = typeof body === 'string' ? JSON.parse(body) : body;
    console.log('Body keys:', Object.keys(body));

    const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

    if (!encrypted_aes_key || !encrypted_flow_data || !initial_vector) {
      console.log('Missing required fields - returning 400');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request format' })
      };
    }

    // Decrypt the request
    let aesKeyBuffer, initialVectorBuffer, decryptedBody;
    try {
      console.log('Starting AES key decryption...');
      const encryptedAesKey = Buffer.from(encrypted_aes_key, 'base64');
      console.log('Encrypted AES key length:', encryptedAesKey.length); // Should be ~256 bytes for RSA 2048

      aesKeyBuffer = crypto.privateDecrypt(
        {
          key: PRIVATE_KEY,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        encryptedAesKey
      );
      console.log('AES key decrypted successfully (length:', aesKeyBuffer.length, ')');

      console.log('Starting flow data decryption...');
      initialVectorBuffer = Buffer.from(initial_vector, 'base64');
      const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');

      const TAG_LENGTH = 16;
      const ciphertext = flowDataBuffer.slice(0, -TAG_LENGTH);
      const authTag = flowDataBuffer.slice(-TAG_LENGTH);
      console.log('Ciphertext length:', ciphertext.length, 'Auth tag length:', authTag.length);

      const decipher = crypto.createDecipheriv(
        'aes-128-gcm',
        aesKeyBuffer,
        initialVectorBuffer
      );
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]).toString('utf8');

      decryptedBody = JSON.parse(decrypted);
      console.log('Decrypted body:', JSON.stringify(decryptedBody));
    } catch (decErr) {
      console.error('Decryption failed details:', {
        message: decErr.message,
        code: decErr.code,
        opensslErrorStack: decErr.opensslErrorStack,
        stack: decErr.stack
      });
      return {
        statusCode: 421,
        body: JSON.stringify({ error: 'Decryption error' })
      };
    }

    const { version, action } = decryptedBody;

    if (version !== '3.0') {
      console.log('Unsupported version:', version);
      const errorResponse = { error: 'Unsupported version' };
      // Encrypt error response (Meta expects encrypted responses)
      const flippedIV = Buffer.alloc(initialVectorBuffer.length);
      for (let i = 0; i < initialVectorBuffer.length; i++) {
        flippedIV[i] = initialVectorBuffer[i] ^ 0xFF;
      }
      const cipher = crypto.createCipheriv('aes-128-gcm', aesKeyBuffer, flippedIV);
      let encrypted = Buffer.concat([
        cipher.update(JSON.stringify(errorResponse), 'utf8'),
        cipher.final()
      ]);
      const authTag = cipher.getAuthTag();
      const output = Buffer.concat([encrypted, authTag]).toString('base64');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: output
      };
    }

    let responseData;
    if (action === 'ping') {
      console.log('Handling health check ping');
      responseData = {
        data: {
          status: 'active'
        }
      };
    } else {
      console.log('Unsupported action:', action);
      responseData = {
        error: 'Unsupported action'
      };
    }

    // Encrypt the response
    const flippedIV = Buffer.alloc(initialVectorBuffer.length);
    for (let i = 0; i < initialVectorBuffer.length; i++) {
      flippedIV[i] = initialVectorBuffer[i] ^ 0xFF;
    }

    const cipher = crypto.createCipheriv(
      'aes-128-gcm',
      aesKeyBuffer,
      flippedIV
    );
    let encrypted = Buffer.concat([
      cipher.update(JSON.stringify(responseData), 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();
    const output = Buffer.concat([encrypted, authTag]);
    const base64Response = output.toString('base64');

    console.log('Encrypted response (length):', base64Response.length);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: base64Response
    };

  } catch (error) {
    console.error('=== LAMBDA ERROR ===', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' })
    };
  } finally {
    console.log('=== LAMBDA INVOCATION END ===');
  }
};