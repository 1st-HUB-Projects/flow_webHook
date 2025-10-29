curl -X POST \
  "https://graph.facebook.com/v24.0/797482089499265/subscriptions" \
  -H "Authorization: Bearer EAALVTkSoyoEBP3nBMtnZCfnlyIxLfpANLByRZC7al6bJ9ZBiZC7FqlCNC9InLSAkrfw64ztuMtKxqkdt4gZBDq5auGtnkwLIzoOLeZBbXZAZBJK7B2kzXbe1ChvX19KTpUEwlGrNpNn9wc8vbZBNCFHDXoVkL0wGtAqqXuUT82L7xA41Q9PrxYCyP5XAk3j7alNAAjd2FgmTGOcAqzvQce6XPkIxpMGU4KTTZBmFxB2wk7ZCEEtjg19pXhhM7ah8ZAEUvVsZAWeGORHY8kAWzAvRAZAfQS7MqrLmAcLc43p2x6CwZDZD" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "callback_url": "https://ycwuerfvi5qun2ogdj36crimei0fjmic.lambda-url.us-east-1.on.aws/",
    "fields": ["messages", "message_deliveries", "message_reads"],
    "verify_token": "test_1234567890"
  }'