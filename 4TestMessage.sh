curl -i -X POST \
  https://graph.facebook.com/v22.0/812378515295003/messages \
  -H 'Authorization: Bearer EAAjZByAaNJ94BP1FW3qhjw0epHC3scY5RhP88b8UggFKx6aM2n09Pn1BbU3uXTtdt22TdbCDMO5ca03YLt13xt5cldFCOgaEn3yvxUzzMEZBJFzZBfUTdPhCkdYDWbHHkSqRPt4VwzdAeJI3JazZCTHIUN12N4M7ebo1XDfcfePZCoaSysCSMZCHaeZChB7XLFNtwZDZD' \
  -H 'Content-Type: application/json' \
  -d '{ "messaging_product": "whatsapp", "to": "97333787388", "type": "template", "template": { "name": "hello_world", "language": { "code": "en_US" } } }'