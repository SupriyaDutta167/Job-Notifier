from typing import Protocol

class NotificationDeliveryResult:
    def __init__(self, success: bool, error: str | None = None):
        self.success = success
        self.error = error

class NotificationProvider(Protocol):
    def send(self, destination: str, message: str) -> NotificationDeliveryResult:
        """
        Sends a notification.
        :param destination: The channel-specific destination (e.g. chat_id).
        :param message: The formatted message string.
        :return: NotificationDeliveryResult indicating success or failure.
        """
        ...
