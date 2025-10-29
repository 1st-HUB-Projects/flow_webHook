#!/bin/bash

LAMBDA_URL="https://mkrpjwouaa7li764vzf6omgjvq0fpdgt.lambda-url.us-east-1.on.aws/"

echo "=== Testing 1: GET Request (Browser) ==="
curl -s "$LAMBDA_URL"

echo -e "\n\n=== Testing 2: POST Empty (Meta Health Check) ==="
RESPONSE=$(curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "Response: $RESPONSE"
echo "Base64 decoded:"
echo "$RESPONSE" | base64 --decode 2>/dev/null || echo "Not valid Base64"

echo -e "\n=== Testing 3: POST with Data ==="
RESPONSE=$(curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}')
echo "Response: $RESPONSE"
echo "Base64 decoded:"
echo "$RESPONSE" | base64 --decode 2>/dev/null || echo "Not valid Base64"

echo -e "\n=== Testing 4: Webhook Verification ==="
curl -s "$LAMBDA_URL?hub.mode=subscribe&hub.verify_token=test1234567890&hub.challenge=123456789"

echo -e "\n=== Tests Complete ===="