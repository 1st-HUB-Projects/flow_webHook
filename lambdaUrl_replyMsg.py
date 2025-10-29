import json
import os
import logging
from typing import Dict, Any
import base64
import urllib3

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

# Environment variables
VERIFY_TOKEN = os.environ.get('VERIFY_TOKEN', 'test1234567890')
ACCESS_TOKEN = os.environ.get('ACCESS_TOKEN')
PHONE_NUMBER_ID = os.environ.get('PHONE_NUMBER_ID', '812378515295003')
API_VERSION = os.environ.get('API_VERSION', 'v19.0')

# HTTP client for sending replies
http = urllib3.PoolManager()
WHATSAPP_API_URL = f"https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}/messages"

def send_whatsapp_reply(to: str, text: str):
    """Send a reply back to the user via WhatsApp Business API"""
    try:
        headers = {
            "Authorization": f"Bearer {ACCESS_TOKEN}", 
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text}
        }
        
        logger.info(f"📤 Sending reply to {to}: {text}")
        response = http.request(
            "POST", 
            WHATSAPP_API_URL, 
            body=json.dumps(payload), 
            headers=headers
        )
        
        logger.info(f"📨 Reply sent - Status: {response.status}")
        if response.status != 200:
            logger.error(f"❌ Reply failed: {response.data.decode('utf-8')}")
            
    except Exception as e:
        logger.error(f"❌ Error sending reply: {str(e)}")

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    WhatsApp Webhook Lambda Function
    """
    
    logger.info("🚀 WHATSAPP WEBHOOK RECEIVED")
    logger.info("=" * 50)
    
    # Extract HTTP method
    http_method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    query_params = event.get('queryStringParameters', {})
    
    logger.info(f"🔧 HTTP Method: {http_method}")
    
    # Handle GET request (Webhook verification)
    if http_method == 'GET':
        logger.info("🔐 Handling Webhook Verification")
        
        mode = query_params.get('hub.mode', '')
        token = query_params.get('hub.verify_token', '')
        challenge = query_params.get('hub.challenge', '')
        
        if mode == 'subscribe' and token == VERIFY_TOKEN:
            logger.info("✅ WEBHOOK VERIFICATION SUCCESSFUL!")
            return {
                'statusCode': 200,
                'body': challenge,
                'headers': {'Content-Type': 'text/plain'}
            }
        else:
            logger.error("❌ VERIFICATION FAILED")
            return {
                'statusCode': 403,
                'body': 'Verification failed',
                'headers': {'Content-Type': 'text/plain'}
            }
    
    # Handle POST request (WhatsApp messages)
    elif http_method == 'POST':
        logger.info("📨 HANDLING WHATSAPP MESSAGE")
        
        try:
            # Parse the request body
            body = event.get('body', '{}')
            if event.get('isBase64Encoded', False):
                body = base64.b64decode(body).decode('utf-8')
                logger.info("📄 Body was Base64 encoded - decoded")
            
            logger.info(f"📝 Raw body preview: {body[:500]}...")
            
            parsed_body = json.loads(body)
            logger.info(f"🔍 Parsed body structure: {json.dumps(parsed_body, indent=2)}")
            
            # Check if this is encrypted Flow data
            if 'encrypted_flow_data' in parsed_body:
                logger.info("🔄 Received FLOW data (encrypted)")
                return {
                    'statusCode': 200,
                    'body': json.dumps({'status': 'flow_data_received'}),
                    'headers': {'Content-Type': 'application/json'}
                }
            
            # Process WhatsApp webhook structure
            entries = parsed_body.get('entry', [])
            logger.info(f"📨 Found {len(entries)} entries")
            
            if not entries:
                logger.info("ℹ️ No entries found - might be a different webhook type")
                logger.info(f"📊 Available keys: {list(parsed_body.keys())}")
                return {
                    'statusCode': 200,
                    'body': json.dumps({'status': 'no_entries'}),
                    'headers': {'Content-Type': 'application/json'}
                }
            
            # Process each entry
            for i, entry in enumerate(entries):
                logger.info(f"📋 Processing entry {i}")
                
                changes = entry.get('changes', [])
                logger.info(f"🔄 Found {len(changes)} changes in entry {i}")
                
                for j, change in enumerate(changes):
                    value = change.get('value', {})
                    logger.info(f"📊 Change {j} fields: {list(value.keys())}")
                    
                    # Check for messages
                    messages = value.get('messages', [])
                    logger.info(f"💬 Found {len(messages)} messages in change {j}")
                    
                    # Process each message
                    for k, message in enumerate(messages):
                        from_number = message.get('from', 'Unknown')
                        message_type = message.get('type', 'Unknown')
                        message_id = message.get('id', 'Unknown')
                        timestamp = message.get('timestamp', 'Unknown')
                        
                        logger.info("=" * 40)
                        logger.info(f"📱 MESSAGE #{k+1} DETAILS:")
                        logger.info(f"   👤 From: {from_number}")
                        logger.info(f"   📋 Type: {message_type}")
                        logger.info(f"   🆔 ID: {message_id}")
                        logger.info(f"   ⏰ Timestamp: {timestamp}")
                        
                        # Handle different message types
                        if message_type == 'text':
                            text_content = message.get('text', {}).get('body', 'No text')
                            logger.info(f"   📝 Text: '{text_content}'")
                            
                            # AUTO-REPLY - Uncomment to enable
                            if ACCESS_TOKEN and PHONE_NUMBER_ID:
                                reply_text = f"Thanks for your message: '{text_content}'"
                                send_whatsapp_reply(from_number, reply_text)
                            else:
                                logger.info("   ⚠️  Auto-reply disabled (missing tokens)")
                            
                        elif message_type == 'image':
                            image_id = message.get('image', {}).get('id', 'No ID')
                            caption = message.get('image', {}).get('caption', 'No caption')
                            logger.info(f"   🖼️ Image ID: {image_id}")
                            logger.info(f"   📷 Caption: '{caption}'")
                            
                        elif message_type == 'document':
                            document = message.get('document', {})
                            logger.info(f"   📄 Document: {document.get('filename', 'Unnamed')}")
                            logger.info(f"   📊 MIME Type: {document.get('mime_type', 'Unknown')}")
                            
                        else:
                            logger.info(f"   🔍 Full message data: {json.dumps(message, indent=2)}")
                        
                        logger.info("=" * 40)
            
            logger.info("✅ All messages processed successfully")
            return {
                'statusCode': 200,
                'body': json.dumps({'status': 'success', 'message': 'Messages processed'}),
                'headers': {'Content-Type': 'application/json'}
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON decode error: {str(e)}")
            logger.error(f"📄 Problematic body: {body[:1000]}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid JSON'}),
                'headers': {'Content-Type': 'application/json'}
            }
            
        except Exception as e:
            logger.error(f"❌ Error processing message: {str(e)}")
            import traceback
            logger.error(f"🔍 Stack trace: {traceback.format_exc()}")
            return {
                'statusCode': 200,  # Still return 200 to acknowledge receipt
                'body': json.dumps({'error': 'Processing error'}),
                'headers': {'Content-Type': 'application/json'}
            }
    
    else:
        logger.error(f"❌ Unsupported HTTP method: {http_method}")
        return {
            'statusCode': 405,
            'body': 'Method not allowed',
            'headers': {'Content-Type': 'text/plain'}
        }