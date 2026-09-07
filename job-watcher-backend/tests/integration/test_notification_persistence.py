import pytest
import os
import uuid
from unittest.mock import MagicMock
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.company import Company
from app.db.models.job import Job
from app.db.models.watch_profile import WatchProfile
from app.db.models.job_match import JobMatch
from app.db.models.user import User
from app.db.models.notification import Notification
from app.services.notifications.notification_service import NotificationService
from app.services.notifications.interfaces import NotificationDeliveryResult
from app.core.config import settings

pytestmark = pytest.mark.skipif(
    not settings.DATABASE_URL,
    reason="DATABASE_URL not set, skipping integration tests"
)

@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def user(db):
    u = User(
        email=f"test-notify-{uuid.uuid4().hex[:8]}@example.com",
        telegram_chat_id="123456789"
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

@pytest.fixture
def watch_profile(db, user):
    wp = WatchProfile(
        user_id=user.id,
        name="Test Profile"
    )
    db.add(wp)
    db.commit()
    db.refresh(wp)
    return wp

@pytest.fixture
def job_match(db, watch_profile):
    c = Company(
        name="Notify Test Co",
        slug=f"notify-{uuid.uuid4().hex[:8]}",
        website_url="https://example.com"
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    
    j = Job(
        company_id=c.id,
        source="test",
        title="Software Engineer",
        fingerprint=uuid.uuid4().hex,
        is_active=True
    )
    db.add(j)
    db.commit()
    db.refresh(j)
    
    jm = JobMatch(
        job_id=j.id,
        watch_profile_id=watch_profile.id,
        matched=True,
        score=1.0,
        match_reason="Matched!"
    )
    db.add(jm)
    db.commit()
    db.refresh(jm)
    return jm

def test_notification_persistence_success(db: Session, user: User, job_match: JobMatch):
    # Setup mock provider
    provider = MagicMock()
    provider.send.return_value = NotificationDeliveryResult(success=True)
    
    service = NotificationService(provider=provider)
    
    # 1. Send first notification
    notification1 = service.send_job_match_notification(db, user.id, job_match.id)
    
    assert notification1 is not None
    assert notification1.status == "sent"
    assert notification1.user_id == user.id
    assert notification1.job_id == job_match.job.id
    
    provider.send.assert_called_once()
    
    # 2. Try to send again
    notification2 = service.send_job_match_notification(db, user.id, job_match.id)
    
    # Assert idempotency
    assert notification2 is not None
    assert notification2.id == notification1.id
    assert notification2.status == "sent"
    
    # Provider should not have been called a second time
    provider.send.assert_called_once()
    
def test_notification_persistence_failure_retry(db: Session, user: User, job_match: JobMatch):
    # Setup mock provider
    provider = MagicMock()
    provider.send.return_value = NotificationDeliveryResult(success=False, error="API Error")
    
    service = NotificationService(provider=provider)
    
    # 1. Send first notification (fails)
    notification1 = service.send_job_match_notification(db, user.id, job_match.id)
    
    assert notification1 is not None
    assert notification1.status == "failed"
    assert notification1.error_message == "API Error"
    
    provider.send.assert_called_once()
    
    # Setup for successful retry
    provider.send.return_value = NotificationDeliveryResult(success=True)
    
    # 2. Try to send again (retry)
    notification2 = service.send_job_match_notification(db, user.id, job_match.id)
    
    # Assert retry reused the record and succeeded
    assert notification2 is not None
    assert notification2.id == notification1.id
    assert notification2.status == "sent"
    
    # Provider should be called twice in total
    assert provider.send.call_count == 2
