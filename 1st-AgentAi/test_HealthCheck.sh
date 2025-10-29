#!/bin/bash

LAMBDA_URL="https://mkrpjwouaa7li764vzf6omgjvq0fpdgt.lambda-url.us-east-1.on.aws/"

echo "=== Testing 1: Regular GET (Browser) ==="
curl -s "$LAMBDA_URL" | jq .

echo -e "\n=== Testing 2: Empty POST (Meta Test) ==="
curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/json" \
  -d '{}'

echo -e "\n=== Testing 3: Encrypted Flow Test ==="
curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "encrypted_flow_data": "test123",
    "encrypted_aes_key": "test456", 
    "initial_vector": "test789"
  }'

echo -e "\n=== Testing 4: Simple JSON Test ==="
curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/json" \
  -d '{"test": true, "health_check": true}'

echo -e "\n=== Tests Complete ===="