import json
import boto3
import datetime
import os

# --- Configuration  ---
# Environment variables
VERIFY_TOKEN = os.environ.get('VERIFY_TOKEN', 'undefined_token')

# --- Functions ---
def lambda_handler(event, context):
    print("Event received:", json.dumps(event))
    print("Context received:", context)

    try:
        http_method = event.get('httpMethod', '')
        print(f"HTTP Method: {http_method}")

        # Handle GET request for webhook verification
        if http_method == 'GET':
            params = event.get('queryStringParameters') or {}
            mode = params.get('hub.mode')
            token = params.get('hub.verify_token')
            challenge = params.get('hub.challenge')

            # Verify the token and respond with the challenge
            if mode == 'subscribe' and token == VERIFY_TOKEN:
                print("Token verified successfully")
                return {
                    'statusCode': 200,
                    'body': challenge
                }
            else:
                print("Token verification failed")
                return {
                    'statusCode': 403,
                    'body': json.dumps({'error': 'Invalid verification token'})
                }

        # Handle POST request to receive and store webhook data
        elif http_method == 'POST':

            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Ok'})
            }

        # Handle unsupported HTTP methods
        else:
            print(f"Unsupported HTTP method: {http_method}")
            return {
                'statusCode': 405,
                'body': json.dumps({'error': f'Method {http_method} not allowed'})
            }

    except Exception as e:
        print(f"✘ Exception occurred: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
To test the Lambda function, use the following payload:
{
  "httpMethod": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"object\":\"whatsapp_business_account\",\"entry\":[{\"id\":\"WHATSAPP_BUSINESS_ACCOUNT_ID\",\"changes\":[{\"value\":{\"messaging_product\":\"whatsapp\",\"metadata\":{\"display_phone_number\":\"1234567890\",\"phone_number_id\":\"PHONE_NUMBER_ID\"},\"contacts\":[{\"profile\":{\"name\":\"John Doe\"},\"wa_id\":\"12345678901\"}],\"messages\":[{\"from\":\"12345678901\",\"id\":\"wamid.ID\",\"timestamp\":\"1624555555\",\"text\":{\"body\":\"Hello, world!\"},\"type\":\"text\"}]} ,\"field\":\"messages\"}]}]",
  "isBase64Encoded": false
}