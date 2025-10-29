#!/bin/bash

# --- 1. CONFIGURE YOUR VARIABLES HERE ---
# (Get these from your Meta App Dashboard and AWS)
WABA_ID="1504486807253703"
# ACCESS_TOKEN="EAAjZByAaNJ94BP1FW3qhjw0epHC3scY5RhP88b8UggFKx6aM2n09Pn1BbU3uXTtdt22TdbCDMO5ca03YLt13xt5cldFCOgaEn3yvxUzzMEZBJFzZBfUTdPhCkdYDWbHHkSqRPt4VwzdAeJI3JazZCTHIUN12N4M7ebo1XDfcfePZCoaSysCSMZCHaeZChB7XLFNtwZDZD"
ACCESS_TOKEN="EAGqCVBCUVhwBPxKs8axYLM4pWSEb3QZA7Vxg443OZC7izFkD6uviZBYWnttuOY6rVGZC4GjOSVj44qAYnWsxk0RK3gDMGBn5nwHTZCkTykGwCkev3oisKUuFQSc4f1bZAhLwPDsb7XF0sbY7ScoUVDSnrqueoRoekIwNfa77MHX7ttEN6rLIvmZAZCmXNi2etMJs2wZDZD"
# LAMBDA_ENDPOINT="https://ycwuerfvi5qun2ogdj36crimei0fjmic.lambda-url.us-east-1.on.aws/"
LAMBDA_ENDPOINT="https://xqzgeh3df2nsj76pwemyxl25di0largr.lambda-url.us-east-1.on.aws/"
# FLOW_NAME="OrderFlow_v1" 
FLOW_NAME="FlowTest_1" 
PUBLIC_KEY_FILE="public_key.pem"
FLOW_JSON_FILE="FlowTest.json"

# --- 2. CHECK FOR JQ ---
if ! command -v jq &> /dev/null
then
    echo "Error: jq is not installed."
    echo "Please install it to proceed (e.g., brew install jq)"
    exit 1
fi

# --- 3. READ FILE CONTENTS ---
echo "Reading files..."
# Read the public key, remove newlines, and store it
PUB_KEY_STRING=$(awk 'NF {sub(/\r/, ""); printf "%s\\n", $0;}' $PUBLIC_KEY_FILE)
# Read the entire flow.json file and store it
FLOW_JSON_STRING=$(cat $FLOW_JSON_FILE)

# --- 4. BUILD THE JSON PAYLOAD WITH JQ ---
# This is the most reliable way to build complex JSON in a shell script.
# We pass the shell variables into jq, which handles all escaping.
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
curl -X POST "https://graph.facebook.com/v24.0/$WABA_ID/flows" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"

echo "" # Add a newline for clean output

