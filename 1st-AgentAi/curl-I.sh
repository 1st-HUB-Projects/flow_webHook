LAMBDA_ENDPOINT="https://myluczlb277cauc3gngtswy2vi0bzmfd.lambda-url.us-east-1.on.aws/"
# curl -s "$LAMBDA_ENDPOINT"
curl -X POST "$LAMBDA_ENDPOINT" -H "Content-Type: application/json" -d '{}'