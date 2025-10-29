require('dotenv').config();  // Loads .env for local test

const { handler } = require('./index.js');

// Sample GET
const getEvent = {
  requestContext: { http: { method: 'GET' } },
  queryStringParameters: {
    'hub.mode': 'subscribe',
    'hub.verify_token': 'test1234567890',
    'hub.challenge': 'test-challenge-123'
  }
};

// Sample POST
const postEvent = {
  requestContext: { http: { method: 'POST' } },
  body: JSON.stringify({
    encrypted_aes_key: 'dummy-base64-key',
    encrypted_flow_data: 'dummy-base64-data',
    initial_vector: 'dummy-base64-iv'
  }),
  isBase64Encoded: false,
  headers: { 'x-hub-signature-256': 'sha256=dummy-signature' }
};

// Test GET
handler(getEvent, {}).then(result => console.log('GET Test:', result));

// Test POST
handler(postEvent, {}).then(result => console.log('POST Test:', result));