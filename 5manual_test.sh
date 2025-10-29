curl -X POST "https://graph.facebook.com/v18.0/812378515295003/messages" \
-H "Authorization: Bearer EAAjZByAaNJ94BP1FW3qhjw0epHC3scY5RhP88b8UggFKx6aM2n09Pn1BbU3uXTtdt22TdbCDMO5ca03YLt13xt5cldFCOgaEn3yvxUzzMEZBJFzZBfUTdPhCkdYDWbHHkSqRPt4VwzdAeJI3JazZCTHIUN12N4M7ebo1XDfcfePZCoaSysCSMZCHaeZChB7XLFNtwZDZD" \
-H "Content-Type: application/json" \
-d '{
  "messaging_product": "whatsapp",
  "to": "97333787388",
  "type": "interactive",
  "interactive": {
    "type": "flow",
    "header": {"type": "text", "text": "Start Your Order"},
    "body": {"text": "Tap below to begin."},
    "footer": {"text": "Powered by xAI"},
    "action": {
      "name": "flow",
      "parameters": {
        "flow_message_version": "3",
        "flow_id": "1380165446979952",
        "flow_cta": "Open Flow",
        "flow_token": "test_token",
        "flow_action": "navigate",
        "flow_action_payload": {"screen": "SELECT_ORDER"}
      }
    }
  }
}'