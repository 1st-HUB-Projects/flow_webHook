/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import "dotenv/config";
import express from "express";
import { decryptRequest, encryptResponse, FlowEndpointException } from "./encryption.js";
import { getNextScreen } from "./flow.js";
import crypto from "crypto";


const app = express();

app.use(
  express.json({
    // store the raw request body to use it for signature verification
    verify: (req, res, buf, encoding) => {
      req.rawBody = buf?.toString(encoding || "utf8");
    },
  }),
);

const {
  APP_SECRET,
  PRIVATE_KEY,
  PASSPHRASE = "",
  PORT = "3000",
  VERIFY_TOKEN,
  ACCESS_TOKEN,
  PHONE_NUMBER_ID,
} = process.env;
/*
Example:
```-----[REPLACE THIS] BEGIN RSA PRIVATE KEY-----
MIIE...
...
...AQAB
-----[REPLACE THIS] END RSA PRIVATE KEY-----```
*/

// app.post("/", async (req, res) => {
//   if (!PRIVATE_KEY) {
//     throw new Error(
//       'Private key is empty. Please check your env variable "PRIVATE_KEY".'
//     );
//   }

//   if(!isRequestSignatureValid(req)) {
//     // Return status code 432 if request signature does not match.
//     // To learn more about return error codes visit: https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes
//     return res.status(432).send();
//   }

//   let decryptedRequest = null;
//   try {
//     decryptedRequest = decryptRequest(req.body, PRIVATE_KEY, PASSPHRASE);
//   } catch (err) {
//     console.error(err);
//     if (err instanceof FlowEndpointException) {
//       return res.status(err.statusCode).send();
//     }
//     return res.status(500).send();
//   }

//   const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
//   console.log("💬 Decrypted Request:", decryptedBody);

//   // TODO: Uncomment this block and add your flow token validation logic.
//   // If the flow token becomes invalid, return HTTP code 427 to disable the flow and show the message in `error_msg` to the user
//   // Refer to the docs for details https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes

//   /*
//   if (!isValidFlowToken(decryptedBody.flow_token)) {
//     const error_response = {
//       error_msg: `The message is no longer available`,
//     };
//     return res
//       .status(427)
//       .send(
//         encryptResponse(error_response, aesKeyBuffer, initialVectorBuffer)
//       );
//   }
//   */

//   const screenResponse = await getNextScreen(decryptedBody);
//   console.log("👉 Response to Encrypt:", screenResponse);

//   res.send(encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer));
// });

app.post("/", async (req, res) => {
  try {
    // 1. Verify signature.
    if (!isRequestSignatureValid(req)) {
      console.warn("Request signature validation failed.");
      return res.status(432).send(); // Use 432 as per docs
    }

    // 2. Differentiate request type
    if (req.body.object === "whatsapp_business_account") {
      // It's a Message Webhook.
      // Acknowledge immediately with a 200
      res.sendStatus(200);
      // Process the message *after* acknowledging
      await handleMessageWebhook(req.body);
    } else if (req.body.encrypted_aes_key) {
      // It's a Flow Endpoint request.
      // This function will handle decrypting and sending the response
      await handleFlowRequest(req, res);
    } else {
      console.warn("Received unknown POST request:", req.body);
      res.sendStatus(404);
    }
  } catch (error) {
    console.error("Error in main POST handler:", error);
    if (!res.headersSent) {
      res.sendStatus(500);
    }
  }
});
app.get("/", (req, res) => {
  // Parse query parameters
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Check if a token and mode is in the query string of the request
  if (mode && token) {
    // Check the mode and token sent is correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Respond with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Respond with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  } else {
    // If it's not a verification request, just send the original message
    res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});

function isRequestSignatureValid(req) {
  if (!APP_SECRET) {
    console.warn(
      "App Secret is not set up. Please Add your app secret in /.env file to check for request validation"
    );
    return true;
  }

  const signatureHeader = req.get("x-hub-signature-256");

  // A. Check if the header exists at all
  if (!signatureHeader) {
    console.warn("Missing x-hub-signature-256 header. Skipping validation.");
    // For the Health Check, we must allow the request to proceed
    // For other requests, you might want to return false here
    return true; 
  }

  const signatureBuffer = Buffer.from(
    signatureHeader.replace("sha256=", ""),
    "utf-8"
  );

  const hmac = crypto.createHmac("sha256", APP_SECRET);
  const digestString = hmac.update(req.rawBody).digest("hex");
  const digestBuffer = Buffer.from(digestString, "utf-8");

  if (!crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
    console.error("Error: Request Signature did not match");
    return false;
  }
  return true;
}