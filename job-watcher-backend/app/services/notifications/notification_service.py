import logging
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.db.models.notification import Notification
from app.db.models.job_match import JobMatch
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.job import Job
from app.db.models.watch_profile import WatchProfile
from app.services.notifications.interfaces import NotificationProvider
from app.services.notifications.message_builder import build_job_match_message
from app.core.exceptions import NotFoundError, ForbiddenError, BadRequestError
from app.schemas.notification import NotificationResponse, TelegramTestResponse

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, provider: NotificationProvider):
        self.provider = provider

    def _to_response(
        self,
        notif: Notification,
        job: Job | None = None,
        company: Company | None = None,
        profile: WatchProfile | None = None,
        match: JobMatch | None = None
    ) -> NotificationResponse:
        apply_url = None
        source_url = None
        job_title = None
        company_name = None
        profile_name = None
        match_reason = None
        match_score = None

        if job:
            job_title = job.title
            apply_url = str(job.apply_url) if job.apply_url else (str(job.source_url) if job.source_url else None)
            source_url = str(job.source_url) if job.source_url else None
        if company:
            company_name = company.name
        if profile:
            profile_name = profile.name
        if match:
            match_reason = match.match_reason
            match_score = match.score

        return NotificationResponse(
            id=notif.id,
            user_id=notif.user_id,
            job_id=notif.job_id,
            watch_profile_id=notif.watch_profile_id,
            channel=notif.channel,
            status=notif.status,
            recipient=notif.recipient,
            message=notif.message,
            sent_at=notif.sent_at,
            error_message=notif.error_message,
            created_at=notif.created_at,
            job_title=job_title,
            company_name=company_name,
            watch_profile_name=profile_name,
            apply_url=apply_url,
            source_url=source_url,
            match_reason=match_reason,
            match_score=match_score,
        )

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
        message = build_job_match_message(job, company, job_match, profile=profile)
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

    def list_notifications(
        self,
        db: Session,
        user_id: UUID,
        status: str | None = None,
        channel: str | None = None
    ) -> list[NotificationResponse]:
        """
        List notifications scoped strictly to the authenticated user.
        """
        stmt = (
            select(Notification, Job, Company, WatchProfile, JobMatch)
            .join(Job, Notification.job_id == Job.id)
            .join(Company, Job.company_id == Company.id)
            .join(WatchProfile, Notification.watch_profile_id == WatchProfile.id)
            .outerjoin(
                JobMatch,
                and_(
                    JobMatch.job_id == Notification.job_id,
                    JobMatch.watch_profile_id == Notification.watch_profile_id
                )
            )
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
        if status:
            stmt = stmt.where(Notification.status == status)
        if channel:
            stmt = stmt.where(Notification.channel == channel)

        results = db.execute(stmt).all()
        return [
            self._to_response(notif, job, company, profile, match)
            for notif, job, company, profile, match in results
        ]

    def get_notification(
        self,
        db: Session,
        user_id: UUID,
        notification_id: UUID
    ) -> NotificationResponse:
        """
        Get a specific notification scoped strictly to the authenticated user.
        """
        stmt = (
            select(Notification, Job, Company, WatchProfile, JobMatch)
            .join(Job, Notification.job_id == Job.id)
            .join(Company, Job.company_id == Company.id)
            .join(WatchProfile, Notification.watch_profile_id == WatchProfile.id)
            .outerjoin(
                JobMatch,
                and_(
                    JobMatch.job_id == Notification.job_id,
                    JobMatch.watch_profile_id == Notification.watch_profile_id
                )
            )
            .where(
                and_(
                    Notification.id == notification_id,
                    Notification.user_id == user_id
                )
            )
        )
        row = db.execute(stmt).first()
        if not row:
            raise NotFoundError("Notification not found")
        notif, job, company, profile, match = row
        return self._to_response(notif, job, company, profile, match)

    def retry_notification(
        self,
        db: Session,
        user_id: UUID,
        notification_id: UUID
    ) -> NotificationResponse:
        """
        Retry a pending or failed notification scoped strictly to the authenticated user.
        """
        notif = db.execute(
            select(Notification).where(
                and_(
                    Notification.id == notification_id,
                    Notification.user_id == user_id
                )
            )
        ).scalars().first()

        if not notif:
            raise NotFoundError("Notification not found")

        if notif.status == "sent":
            raise BadRequestError("Cannot retry a notification that has already been sent successfully")

        user = db.execute(select(User).where(User.id == user_id)).scalars().first()
        if not user:
            raise NotFoundError("User not found")

        chat_id = user.telegram_chat_id
        if not chat_id:
            raise BadRequestError("Telegram chat ID is not configured. Please configure your Chat ID in Settings.")

        job = db.execute(select(Job).where(Job.id == notif.job_id)).scalars().first()
        company = db.execute(select(Company).where(Company.id == job.company_id)).scalars().first() if job else None
        job_match = db.execute(
            select(JobMatch).where(
                and_(
                    JobMatch.job_id == notif.job_id,
                    JobMatch.watch_profile_id == notif.watch_profile_id
                )
            )
        ).scalars().first()

        if not notif.message and job and company and job_match:
            profile = db.execute(select(WatchProfile).where(WatchProfile.id == notif.watch_profile_id)).scalars().first()
            notif.message = build_job_match_message(job, company, job_match, profile=profile)

        notif.status = "pending"
        notif.recipient = chat_id
        notif.error_message = None
        db.commit()
        db.refresh(notif)

        message = notif.message or f"🚨 Job Alert: {job.title if job else 'New Job'}"
        result = self.provider.send(destination=chat_id, message=message)

        if result.success:
            notif.status = "sent"
            notif.sent_at = datetime.now(timezone.utc)
            notif.error_message = None
        else:
            notif.status = "failed"
            notif.error_message = result.error

        db.commit()
        db.refresh(notif)

        return self.get_notification(db, user_id, notif.id)

    def test_telegram(self, db: Session, user_id: UUID) -> TelegramTestResponse:
        """
        Send a safe test notification to the authenticated user's configured Telegram chat ID.
        """
        user = db.execute(select(User).where(User.id == user_id)).scalars().first()
        if not user:
            raise NotFoundError("User not found")

        chat_id = user.telegram_chat_id
        if not chat_id or not chat_id.strip():
            raise BadRequestError("Telegram chat ID is not configured. Please save your Chat ID first.")

        message = "🔔 Job Watcher Test Notification\n\nYour Telegram alerts are successfully configured and active!"
        result = self.provider.send(destination=chat_id.strip(), message=message)

        if not result.success:
            raise BadRequestError(f"Telegram delivery failed: {result.error}")

        return TelegramTestResponse(success=True, message="Test message sent successfully.")
