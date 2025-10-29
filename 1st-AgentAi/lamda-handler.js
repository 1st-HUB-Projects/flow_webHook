import crypto from 'crypto';
import querystring from 'querystring';

// --- Load Environment Variables ---
const VERIFY_TOKEN = process.env.MY_VERIFY_TOKEN;
const APP_SECRET = process.env.APP_SECRET;

console.log("✅ Environment Variables Loaded:");
console.log(`VERIFY_TOKEN: ${VERIFY_TOKEN ? 'Set' : 'MISSING!'}`);
console.log(`APP_SECRET: ${APP_SECRET ? 'Set' : 'MISSING!'}`);

// --- Main Lambda Handler ---
export const handler = async (event, context) => {
    console.log("🚀 LAMBDA INVOKED (Node.js Simple Logger)");
    // console.log("📦 Full event received:", JSON.stringify(event, null, 2)); // Uncomment for very detailed logs

    const httpMethod = event.requestContext?.http?.method;
    console.log(`🔧 HTTP Method detected: ${httpMethod}`);

    // --- GET: Health Check Verification ---
    if (httpMethod === 'GET') {
        console.log("🚦 Routing to GET handler (Verification)...");
        return handleGetRequest(event);
    }
    // --- POST: Message Data ---
    else if (httpMethod === 'POST') {
        console.log("🚦 Routing to POST handler (Webhook Data)...");
        return handlePostRequest(event);
    }
    // --- Other Methods ---
    else {
        console.warn(`❌ Unsupported HTTP method received: ${httpMethod}`);
        return {
            statusCode: 405,
            body: JSON.stringify({ error: `Unsupported method: ${httpMethod}` })
        };
    }
};

// --- GET Request Handler (Health Check) ---
function handleGetRequest(event) {
    console.log("🔍 HANDLING GET REQUEST (Webhook Verification)");
    const params = event.queryStringParameters || {};
    const mode = params['hub.mode'];
    const token = params['hub.verify_token'];
    const challenge = params['hub.challenge'];

    console.log(`📊 Verification params - Mode: ${mode}, Token received: ${token ? '******' : 'None'}, Challenge: ${challenge}`);

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("✅ Health Check VERIFIED SUCCESSFULLY");
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/plain' },
            body: challenge
        };
    } else {
        console.error(`❌ Health Check FAILED. Token mismatch or mode incorrect.`);
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Forbidden - Verification Failed' })
        };
    }
}

// --- POST Request Handler (Log Body) ---
function handlePostRequest(event) {
    console.log("🔍 HANDLING POST REQUEST (Webhook Data)");
    const bodyStr = getBody(event);
    console.log(`📨 RAW BODY RECEIVED (${bodyStr.length} chars): ${bodyStr.substring(0, 800)}...`); // Log more preview

    // --- SECURITY CHECK: Verify Signature ---
    const signature = event.headers ? (event.headers['x-hub-signature-256'] || event.headers['X-Hub-Signature-256']) : null;
    if (!signature) {
        console.error("❌ Signature validation SKIPPED - Header missing.");
        // Don't fail here in case Meta test events omit it, but log clearly
    } else {
        if (!verifySignature(bodyStr, signature)) {
            console.error("❌ Signature validation FAILED - Mismatch.");
            // Return 200 OK to Meta anyway to avoid retries, but log the failure
            return { statusCode: 200, body: JSON.stringify({ status: 'error - invalid signature' }) };
        }
        console.log("✅ Signature VERIFIED");
    }

    // --- Log Parsed Body (Best Effort) ---
    try {
        const bodyJson = JSON.parse(bodyStr);
        console.log("✅ Parsed Body JSON:");
        console.log(JSON.stringify(bodyJson, null, 2)); // Pretty print the JSON
    } catch (e) {
        console.warn(`⚠️ Could not parse body as JSON: ${e.message}`);
        // Continue anyway, we already logged the raw body
    }

    // Acknowledge receipt
    console.log("➡️ Acknowledging webhook receipt to Meta.");
    return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ok - logged' })
    };
}

// --- Helper Functions ---
function verifySignature(bodyStr, signature) {
    console.log("🔐 Verifying webhook signature...");
    if (!APP_SECRET) {
        console.warn("APP_SECRET not set, cannot verify signature. Skipping check (unsafe).");
        return true; // Skip verification if secret isn't configured
    }
    try {
        const expectedSignature = "sha256=" + crypto.createHmac('sha256', APP_SECRET)
            .update(bodyStr)
            .digest('hex');

        console.log(`🔐 Expected signature: ${expectedSignature}`);
        console.log(`🔐 Received signature: ${signature}`);

        // Use crypto.timingSafeEqual for security
        if (crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
            console.log("✅ Signature verification PASSED");
            return true;
        } else {
            console.warn("❌ Signature verification FAILED - Mismatch.");
            return false;
        }
    } catch (e) {
        console.error(`💥 Error during signature verification: ${e.message}`);
        return false;
    }
}

function getBody(event) {
    const body = event.body || '';
    const isBase64 = event.isBase64Encoded || false;
    console.log(`📦 Body isBase64Encoded flag: ${isBase64}`);
    if (isBase64 && body) {
        console.log("🔓 Decoding base64 body...");
        try {
            return Buffer.from(body, 'base64').toString('utf8');
        } catch (e) {
            console.error(`❌ Error decoding Base64 body: ${e.message}`);
            return "";
        }
    }
    return body;
}

