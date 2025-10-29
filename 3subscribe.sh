curl -X POST \
  "https://graph.facebook.com/v18.0/2531934870513630/subscribed_apps" \
  -H "Authorization: Bearer EAAjZByAaNJ94BP1FW3qhjw0epHC3scY5RhP88b8UggFKx6aM2n09Pn1BbU3uXTtdt22TdbCDMO5ca03YLt13xt5cldFCOgaEn3yvxUzzMEZBJFzZBfUTdPhCkdYDWbHHkSqRPt4VwzdAeJI3JazZCTHIUN12N4M7ebo1XDfcfePZCoaSysCSMZCHaeZChB7XLFNtwZDZD" \
  -H "Content-Type: application/json" \
  -d '{
    "subscribed_fields": ["messages", "message_deliveries", "message_reads", "whatsapp_business_flow"]
  }'