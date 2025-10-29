import json
import boto3
import datetime
import os
import urllib.request # Added for making HTTP requests

# --- Configuration  ---
# Environment variables
VERIFY_TOKEN = os.environ.get('VERIFY_TOKEN', 'undefined_token')
WA_ACCESS_TOKEN = os.environ.get('ACCESS_TOKEN', 'undefined_token')
WA_PHONE_NUMBER_ID = os.environ.get('PHONE_NUMBER_ID', 'undefined_token')

# --- New Function to Send a Message ---
def send_whatsapp_message(to_number, message_body):
    """
    Sends a WhatsApp text message to a specified number
    using the Meta Graph API.
    """
    print(f"Sending reply to {to_number}: {message_body}")
    
    # API URL
    api_url = f"https://graph.facebook.com/v20.0/{WA_PHONE_NUMBER_ID}/messages"
    
    # Headers
    headers = {
        "Authorization": f"Bearer {WA_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Message Payload
    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "text",
        "text": {"body": message_body}
    }
    
    # Convert payload to bytes
    data = json.dumps(payload).encode('utf-8')
    
    # Create and send the request
    req = urllib.request.Request(api_url, data=data, headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as response:
            response_body = response.read().decode('utf-8')
            print(f"Meta API Response Status: {response.status}")
            print(f"Meta API Response Body: {response_body}")
            
    except urllib.error.URLError as e:
        print(f"✘ Error sending message: {e.reason}")
    except Exception as e:
        print(f"✘ An unexpected error occurred: {str(e)}")

# --- Main Handler ---
def lambda_handler(event, context):
    print("Event received:", json.dumps(event))
    # print("Context received:", context) # Not needed for debugging

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

        # Handle POST request to receive and reply to messages
        elif http_method == 'POST':
            print("Message received from WhatsApp:")
            
            body = event.get('body', '{}')
            body_json = json.loads(body)
            
            # Print the message payload to CloudWatch
            print(json.dumps(body_json, indent=2))
            
            # --- START REPLY LOGIC ---
            try:
                # Check if 'entry' and 'changes' exist
                if 'entry' in body_json and body_json['entry']:
                    changes = body_json['entry'][0].get('changes', [])
                    if changes and 'value' in changes[0] and 'messages' in changes[0]['value']:
                        
                        # Get the first message
                        message_data = changes[0]['value']['messages'][0]
                        
                        # IMPORTANT: Only reply to 'text' messages
                        if message_data.get('type') == 'text':
                            from_number = message_data['from']
                            
                            # Define your welcome message here
                            welcome_msg = (
                                "Welcome to The Fresh Bite 🍽️! \n\n"
                                "Thanks for contacting us. How can we help you today?\n\n"
                                "You can type:\n"
                                "1. Show me the menu\n"
                                "2. Track my order\n"
                                "3. Speak to an agent"
                            )
                            
                            # Send the reply
                            send_whatsapp_message(from_number, welcome_msg)
            
            except Exception as e:
                print(f"✘ Error processing reply: {str(e)}")
                # Log the error but don't fail, so Meta gets a 200
            # --- END REPLY LOGIC ---
            
            # Always return 200 OK to Meta quickly
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