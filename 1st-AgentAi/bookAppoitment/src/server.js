/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// STEP 1: Load .env variables at the very top
import "dotenv/config";
import { v4 as uuidv4 } from 'uuid';  // Add this import at the top if using UUID

import express from "express";
import crypto from "crypto";
import fetch from "node-fetch"; // Make sure to run: npm install node-fetch
import {
  decryptRequest,
  encryptResponse,
  FlowEndpointException,
} from "./encryption.js";
import { getNextScreen } from "./flow.js";

const app = express();
// const flowToken = uuidv4();  // Generate a unique token for this flow instance
// const flowActionData = {};   // Optional: Add initial data for the flow's first screen, e.g., { user_id: recipientPhone }

app.use(
  express.json({
    // store the raw request body to use it for signature verification
    verify: (req, res, buf, encoding) => {
      req.rawBody = buf?.toString(encoding || "utf8");
    },
  })
);

// Read all variables from .env
const {
  APP_SECRET,
  PRIVATE_KEY,
  PASSPHRASE = "",
  PORT = "3000",
  VERIFY_TOKEN,
  ACCESS_TOKEN,
  PHONE_NUMBER_ID,
} = process.env;

/**
 * ===================================================================================
 * 1. WEBHOOK VERIFICATION
 * This route handles the one-time 'GET' request from Meta to verify your webhook URL.
 * ===================================================================================
 */
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
      console.warn("Webhook verification failed: Invalid verify token.");
      res.sendStatus(403);
    }
  } else {
    // If it's not a verification request, just show a simple page
    res.send(
      `<pre>Nothing to see here.
Checkout README.md to start.</pre>`
    );
  }
});

/**
 * ===================================================================================
 * 2. MAIN POST ROUTE
 * This route handles all incoming 'POST' requests, which can be either:
 * A) A Message Webhook (e.g., a user sent "Hi")
 * B) A Flow Endpoint Request (e.g., Health Check or user data from a Flow)
 * ===================================================================================
 */
app.post("/", async (req, res) => {
  try {
    // 1. Verify request signature
    if (!isRequestSignatureValid(req)) {
      console.warn("Request signature validation failed.");
      return res.status(432).send();
    }

    // 2. Differentiate request type
    if (req.body.object === "whatsapp_business_account") {
      // TYPE A: It's a Message Webhook
      console.log("Received a Message Webhook.");
      
      // Acknowledge immediately with a 200
      res.sendStatus(200);
      
      // Process the message *after* acknowledging
      await handleMessageWebhook(req.body);

    } else if (req.body.encrypted_aes_key) {
      // TYPE B: It's a Flow Endpoint request
      console.log("Received a Flow Endpoint request.");
      
      // This function will handle decrypting and sending the encrypted response
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

/**
 * ===================================================================================
 * 3. HELPER FUNCTIONS
 * These functions contain the core logic for handling the different request types.
 * ===================================================================================
 */

/**
 * Handles incoming messages.
 * Its job is to reply with the "test_booking" Flow template.
 */
async function handleMessageWebhook(body) {
  try {
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    // Check if it's a valid incoming text message
    if (message && message.from && message.type === "text") {
      const recipientPhone = message.from;
      console.log(`Replying to message from: ${recipientPhone}`);
      const flowToken = uuidv4();  // Generate a unique token for this flow instance
      const flowActionData = {};   // Optional: Add initial data for the flow

      if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
        console.error("Missing ACCESS_TOKEN or PHONE_NUMBER_ID in .env");
        return; // Stop processing
      }

// / This is the payload to send your "test_booking" template
const templatePayload = {
  messaging_product: "whatsapp",
  to: recipientPhone,
  type: "template",
  template: {
    name: "cloudkitchen",
    language: {
      code: "en",  // Or "en_US" if your template specifies a locale
    },
    components: [  // This was missing—add it to match your template's button structure
      {
        type: "button",
        sub_type: "flow",
        index: 0,  // Assuming this is the first (and only) button in your template; adjust if needed
        parameters: [
          {
            type: "action",
            action: {
              flow_token: flowToken,  // Required: Unique token to track this flow session
              flow_action_data: flowActionData  // Optional: JSON object with initial data for the flow
            }
          }
        ]
      }
    ]
  },
};

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(templatePayload),
        }
      );

      const responseData = await response.json();
      if (!response.ok) {
        console.error("Failed to send template:", responseData);
      } else {
        console.log(`Sent 'test_booking' template to ${recipientPhone}`);
      }
    }
  } catch (error) {
    console.error("Error in handleMessageWebhook:", error);
  }
}

/**
 * Handles incoming Flow data (Health Check, screen submissions).
 * Its job is to decrypt, pass to flow.js, and encrypt the response.
 */
async function handleFlowRequest(req, res) {
  if (!PRIVATE_KEY) {
    // This check is critical and was failing before
    throw new Error(
      'Private key is empty. Please check your env variable "PRIVATE_KEY".'
    );
  }

  let decryptedRequest = null;
  try {
    decryptedRequest = decryptRequest(req.body, PRIVATE_KEY, PASSPHRASE);
  } catch (err) {
    console.error(err);
    if (err instanceof FlowEndpointException) {
      return res.status(err.statusCode).send();
    }
    return res.status(500).send();
  }

  const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
console.log("💬 Decrypted Flow Request (full):", JSON.stringify(decryptedBody, null, 2));  // ADD THIS: Full JSON
  // TODO: Uncomment this block and add your flow token validation logic.
  // If the flow token becomes invalid, return HTTP code 427 to disable the flow and show the message in `error_msg` to the user
  // Refer to the docs for details https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes#endpoint_error_codes

  /*
  if (!isValidFlowToken(decryptedBody.flow_token)) {
    const error_response = {
      error_msg: `The message is no longer available`,
    };
    return res
      .status(427)
      .send(
        encryptResponse(error_response, aesKeyBuffer, initialVectorBuffer)
      );
  }
  */

  const screenResponse = await getNextScreen(decryptedBody);
  console.log("👉 Full Response to Encrypt:", JSON.stringify(screenResponse, null, 2));  // ADD THIS: Full JSON

  res.send(encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer));
}

/**
 * Validates the request signature.
 * This is the corrected version that handles unsigned Health Checks.
 */
function isRequestSignatureValid(req) {
  if (!APP_SECRET) {
    console.warn(
      "App Secret is not set up. Skipping signature validation."
    );
    return true;
  }

  const signatureHeader = req.get("x-hub-signature-256");

  if (!signatureHeader) {
    // This happens during the Health Check. We must allow it.
    console.warn("Missing x-hub-signature-256 header. Allowing request.");
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

/**
 * ===================================================================================
 * 4. START THE SERVER
 * ===================================================================================
 */
app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});