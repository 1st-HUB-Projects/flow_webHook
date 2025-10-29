curl -i -X POST \
  https://graph.facebook.com/v22.0/812378515295003/messages \
  -H 'Authorization: Bearer EAFnTTTOK5sYBPzDN6IMOPehfQEhZClaLckypw871mZBt1Fxe4CnYZB2oLyY6ulz41UifmpHmqWUmEvMgbMXGp3PBZC8MmV7gUGr0kMLpktCtSdfUycBhdEXu5T9yBncMIzZCwxZBhDd4VHVJL0FOQcYjfWMsP8BBMRLbUOOTPOoUT3gWwzgX7WtefphraF3x0ZAtAZDZD' \
  -H 'Content-Type: application/json' \
  -d '{ "messaging_product": "whatsapp", "to": "97339666081", "type": "template", "template": { "name": "hello_world", "language": { "code": "en_US" } } }'