#!/bin/bash

# --- 1. CONFIGURE YOUR VARIABLES HERE ---
WABA_ID="1504486807253703"
ACCESS_TOKEN="EAATrwvMv7KQBP8bu8nogDFeor6uJH2Fi4PZCs9Gz7QxrdboQZARZBmHISG5KsTZA9Wcnfg619FSTx3CCMMFq6vqGQ5F1PFE4bHnPXjeX15pKnm5hFA8qxZAHoeVD5IgwIfe1OZBaaUtK8B3y1ZAL9EcYNeA4lxZAEB9K51jeE7HeSClWlYO4tMGue5LSm7PZCDoBXuwZDZD"  
LAMBDA_ENDPOINT="https://mkrpjwouaa7li764vzf6omgjvq0fpdgt.lambda-url.us-east-1.on.aws/"
FLOW_NAME="FoodOrder_1"
PUBLIC_KEY_FILE="public_key.pem"
FLOW_JSON_FILE="FoodOrder.json"
API_VERSION="v24.0"  # Match your config

# --- 2. CHECK FOR JQ ---
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Install it (e.g., brew install jq)."
    exit 1
fi

# --- 3. READ FILE CONTENTS ---
echo "Reading files..."
PUB_KEY_STRING=$(awk 'NF {sub(/\r/, ""); printf "%s\\n", $0;}' "$PUBLIC_KEY_FILE")
FLOW_JSON_STRING=$(cat "$FLOW_JSON_FILE")

# --- 4. BUILD THE JSON PAYLOAD WITH JQ ---
PAYLOAD=$(jq -n \
  --arg name "$FLOW_NAME" \
  --arg endpoint_uri "$LAMBDA_ENDPOINT" \
  --argjson flow_json "$FLOW_JSON_STRING" \
  '{
    name: $name,
    categories: ["OTHER"],
    endpoint_uri: $endpoint_uri,
    flow_json: $flow_json,
    publish: true
  }')

# --- 5. EXECUTE THE API CALL ---
echo "Publishing Flow to Meta..."
RESPONSE=$(curl -s -w "%{http_code}" -X POST "https://graph.facebook.com/$API_VERSION/$WABA_ID/flows" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_CODE="${RESPONSE: -3}"
BODY="${RESPONSE:0:${#RESPONSE}-3}"

if [ "$HTTP_CODE" -ne 200 ]; then
    echo "Error: Publishing failed (HTTP $HTTP_CODE)."
    echo "$BODY"
    exit 1
else
    echo "Success: $BODY"
fi