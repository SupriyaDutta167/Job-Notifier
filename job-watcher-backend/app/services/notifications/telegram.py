import httpx
import logging
from app.services.notifications.interfaces import NotificationProvider, NotificationDeliveryResult
from app.core.config import settings

logger = logging.getLogger(__name__)

class TelegramNotificationProvider(NotificationProvider):
    def __init__(self, token: str | None = None, base_url: str | None = None):
        self.token = token or settings.TELEGRAM_BOT_TOKEN
        self.base_url = (base_url or settings.TELEGRAM_API_BASE_URL).rstrip("/")
        
    def send(self, destination: str, message: str) -> NotificationDeliveryResult:
        if not self.token:
            logger.error("Telegram bot token is not configured.")
            return NotificationDeliveryResult(success=False, error="Configuration error: TELEGRAM_BOT_TOKEN missing")
            
        if not destination:
            return NotificationDeliveryResult(success=False, error="Destination (chat_id) missing")
            
        # Do not log the token or the full URL
        url = f"{self.base_url}/bot{self.token}/sendMessage"
        
        payload = {
            "chat_id": destination,
            "text": message,
            "disable_web_page_preview": True
        }
        
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(url, json=payload)
                
            response.raise_for_status()
            
            data = response.json()
            if not data.get("ok"):
                error_desc = data.get("description", "Unknown Telegram API Error")
                logger.error(f"Telegram API reported failure: {error_desc}")
                return NotificationDeliveryResult(success=False, error=error_desc)
                
            return NotificationDeliveryResult(success=True)
            
        except httpx.HTTPStatusError as e:
            # We don't log the URL directly from the exception as it contains the bot token
            logger.error(f"Telegram HTTP Error: {e.response.status_code}")
            return NotificationDeliveryResult(success=False, error=f"HTTP {e.response.status_code}")
        except httpx.TimeoutException:
            logger.error("Telegram request timed out.")
            return NotificationDeliveryResult(success=False, error="Timeout")
        except httpx.RequestError as e:
            logger.error("Telegram connection failed.")
            return NotificationDeliveryResult(success=False, error="Connection failed")
        except ValueError:
            logger.error("Telegram returned invalid JSON.")
            return NotificationDeliveryResult(success=False, error="Invalid JSON response")
        except Exception as e:
            logger.exception("Unexpected error in Telegram provider.")
            return NotificationDeliveryResult(success=False, error="Unexpected error")
