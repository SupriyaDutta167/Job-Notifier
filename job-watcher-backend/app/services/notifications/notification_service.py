import logging
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.models.notification import Notification
from app.db.models.job_match import JobMatch
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.watch_profile import WatchProfile
from app.services.notifications.interfaces import NotificationProvider
from app.services.notifications.message_builder import build_job_match_message
from app.core.exceptions import NotFoundError, ForbiddenError

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, provider: NotificationProvider):
        self.provider = provider

    def send_job_match_notification(self, db: Session, user_id: UUID, job_match_id: UUID) -> Notification | None:
        """
        Sends a notification for a JobMatch to the user's Telegram.
        Ensures idempotency and proper security bounds.
        """
        # 1. Load the JobMatch
        job_match = db.execute(
            select(JobMatch).where(JobMatch.id == job_match_id)
        ).scalars().first()
        
        if not job_match:
            raise NotFoundError("JobMatch not found")
            
        # 2. Check Match State
        if not job_match.matched:
            # We don't notify for rejected jobs.
            return None
            
        # 3. Load associated entities
        user = db.execute(select(User).where(User.id == user_id)).scalars().first()
        if not user:
            raise NotFoundError("User not found")
            
        profile = db.execute(select(WatchProfile).where(WatchProfile.id == job_match.watch_profile_id)).scalars().first()
        if not profile:
            raise NotFoundError("WatchProfile not found")
            
        if profile.user_id != user.id:
            raise ForbiddenError("WatchProfile does not belong to the user")
            
        job = job_match.job
        company = db.execute(select(Company).where(Company.id == job.company_id)).scalars().first()
        
        # 4. Determine destination
        chat_id = user.telegram_chat_id
        if not chat_id:
            logger.warning(f"User {user.id} has no telegram_chat_id configured. Cannot send notification.")
            return None
            
        # 5. Check Idempotency
        existing_notification = db.execute(
            select(Notification).where(
                (Notification.user_id == user.id) &
                (Notification.job_id == job.id) &
                (Notification.watch_profile_id == profile.id) &
                (Notification.channel == "telegram")
            )
        ).scalars().first()
        
        if existing_notification and existing_notification.status == "sent":
            logger.info(f"Notification already sent for User {user.id}, Job {job.id}. Skipping.")
            return existing_notification
            
        # 6. Setup or update notification record
        if not existing_notification:
            notification = Notification(
                user_id=user.id,
                job_id=job.id,
                watch_profile_id=profile.id,
                channel="telegram",
                status="pending",
                recipient=chat_id
            )
            db.add(notification)
        else:
            notification = existing_notification
            notification.status = "pending"
            notification.error_message = None
            
        db.commit()
        db.refresh(notification)
        
        # 7. Build message
        message = build_job_match_message(job, company, job_match)
        notification.message = message
        
        # 8. Send
        logger.info(f"Sending notification {notification.id} to {chat_id}")
        result = self.provider.send(destination=chat_id, message=message)
        
        # 9. Update Result
        if result.success:
            notification.status = "sent"
            notification.sent_at = datetime.now(timezone.utc)
            logger.info(f"Successfully sent notification {notification.id}")
        else:
            notification.status = "failed"
            notification.error_message = result.error
            logger.error(f"Failed to send notification {notification.id}: {result.error}")
            
        db.commit()
        db.refresh(notification)
        
        return notification
