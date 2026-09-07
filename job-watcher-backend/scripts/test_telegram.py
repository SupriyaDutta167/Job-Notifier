import os
import sys
from dotenv import load_dotenv

# Ensure we can load env
load_dotenv()

from app.core.config import settings
from app.services.notifications.telegram import TelegramNotificationProvider

def run_manual_test():
    print("Testing Telegram Notification Provider...")
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHAT_ID
    
    if not token or not chat_id:
        print("Error: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing in environment/config.")
        print("Please configure them in your .env file.")
        sys.exit(1)
        
    print(f"Using chat_id: {chat_id}")
    print("Token is configured. (Hidden for security)")
    
    provider = TelegramNotificationProvider(token=token)
    
    message = "🚨 Job Watcher test notification 🚨\n\nThis confirms that the Telegram Bot integration works correctly!"
    
    result = provider.send(destination=chat_id, message=message)
    
    if result.success:
        print("✅ Message sent successfully! Check your Telegram app.")
    else:
        print(f"❌ Failed to send message. Error: {result.error}")
        sys.exit(1)

if __name__ == "__main__":
    run_manual_test()
