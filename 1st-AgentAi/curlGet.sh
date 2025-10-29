ACCESS_TOKEN="EAATrwvMv7KQBP8bu8nogDFeor6uJH2Fi4PZCs9Gz7QxrdboQZARZBmHISG5KsTZA9Wcnfg619FSTx3CCMMFq6vqGQ5F1PFE4bHnPXjeX15pKnm5hFA8qxZAHoeVD5IgwIfe1OZBaaUtK8B3y1ZAL9EcYNeA4lxZAEB9K51jeE7HeSClWlYO4tMGue5LSm7PZCDoBXuwZDZD"  # Your long-lived access token
LAMBDA_ENDPOINT="https://myluczlb277cauc3gngtswy2vi0bzmfd.lambda-url.us-east-1.on.aws/"
API_VERSION="v24.0"  # Match your config
curl -X GET "https://graph.facebook.com/$API_VERSION/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"