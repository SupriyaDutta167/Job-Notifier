import pytest
import uuid
from unittest.mock import MagicMock
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.job import Job
from app.db.models.watch_profile import WatchProfile
from app.db.models.watch_rule import WatchRule
from app.db.models.job_match import JobMatch
from app.db.models.notification import Notification
from app.services.matching.match_service import MatchService
from app.services.notifications.notification_service import NotificationService
from app.services.notifications.interfaces import NotificationDeliveryResult
from app.core.exceptions import ForbiddenError
from app.core.config import settings
from app.db.session import SessionLocal

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
def multi_profile_data(db: Session):
    created = []

    # 1. Users
    user = User(
        id=uuid.uuid4(),
        auth_user_id=uuid.uuid4(),
        email=f"multi-prof-{uuid.uuid4().hex[:8]}@example.com",
        telegram_chat_id="999888777"
    )
    other_user = User(
        id=uuid.uuid4(),
        auth_user_id=uuid.uuid4(),
        email=f"other-user-{uuid.uuid4().hex[:8]}@example.com",
        telegram_chat_id="111222333"
    )
    db.add_all([user, other_user])
    created.extend([user, other_user])
    db.flush()

    # 2. Company
    company = Company(
        id=uuid.uuid4(),
        name=f"Tech Corp {uuid.uuid4().hex[:6]}",
        slug=f"tech-corp-{uuid.uuid4().hex[:8]}",
        website_url="https://techcorp.com"
    )
    db.add(company)
    created.append(company)
    db.flush()

    # 3. User has two profiles: SDE Internship and Backend Engineer
    profile_sde = WatchProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        name="SDE Internship",
        is_active=True
    )
    profile_backend = WatchProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Backend Engineer",
        is_active=True
    )
    profile_inactive = WatchProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Inactive Profile",
        is_active=False
    )
    profile_other_user = WatchProfile(
        id=uuid.uuid4(),
        user_id=other_user.id,
        name="Other User Profile",
        is_active=True
    )
    db.add_all([profile_sde, profile_backend, profile_inactive, profile_other_user])
    created.extend([profile_sde, profile_backend, profile_inactive, profile_other_user])
    db.flush()

    # Rules for SDE Internship:
    # Requires 'Internship', excludes 'Senior'
    rule_sde = WatchRule(
        id=uuid.uuid4(),
        watch_profile_id=profile_sde.id,
        role_keywords=["SDE", "Software Engineer"],
        exclude_keywords=["Senior", "Staff"],
        job_type="Internship"
    )
    # Rules for Backend Engineer:
    # Requires 'Backend' or 'Engineer', allows FullTime, excludes 'Manager'
    rule_backend = WatchRule(
        id=uuid.uuid4(),
        watch_profile_id=profile_backend.id,
        role_keywords=["Backend", "Engineer"],
        exclude_keywords=["Manager"],
        job_type="FullTime"
    )
    db.add_all([rule_sde, rule_backend])
    created.extend([rule_sde, rule_backend])
    db.flush()

    # 4. Jobs:
    # Job A: Internship only (matches SDE Internship only)
    job_internship_only = Job(
        id=uuid.uuid4(),
        company_id=company.id,
        title="Software Engineer Intern",
        job_type="Internship",
        source="workday",
        fingerprint=uuid.uuid4().hex,
        is_active=True
    )
    # Job B: Senior Backend Full-Time (matches Backend Engineer only, SDE Internship rejects due to 'Senior' and 'FullTime')
    job_backend_only = Job(
        id=uuid.uuid4(),
        company_id=company.id,
        title="Senior Backend Engineer",
        job_type="FullTime",
        source="workday",
        fingerprint=uuid.uuid4().hex,
        is_active=True
    )
    # Job C: Matches neither (e.g. Finance Manager)
    job_unmatched = Job(
        id=uuid.uuid4(),
        company_id=company.id,
        title="Finance Manager",
        job_type="FullTime",
        source="workday",
        fingerprint=uuid.uuid4().hex,
        is_active=True
    )

    db.add_all([job_internship_only, job_backend_only, job_unmatched])
    created.extend([job_internship_only, job_backend_only, job_unmatched])
    db.commit()

    yield {
        "user": user,
        "other_user": other_user,
        "company": company,
        "profile_sde": profile_sde,
        "profile_backend": profile_backend,
        "profile_inactive": profile_inactive,
        "profile_other_user": profile_other_user,
        "job_internship_only": job_internship_only,
        "job_backend_only": job_backend_only,
        "job_unmatched": job_unmatched,
        "created": created,
    }

    try:
        for item in reversed(created):
            try:
                db.delete(item)
            except Exception:
                pass
        db.commit()
    except Exception:
        db.rollback()


# Test 1, 2, 3: Job matches ONLY SDE Internship -> Only SDE Internship creates Notification
def test_job_matching_only_sde_internship(db: Session, multi_profile_data: dict):
    user = multi_profile_data["user"]
    profile_sde = multi_profile_data["profile_sde"]
    profile_backend = multi_profile_data["profile_backend"]
    job = multi_profile_data["job_internship_only"]

    matcher = MatchService()
    provider_mock = MagicMock()
    provider_mock.send.return_value = NotificationDeliveryResult(success=True)
    notifier = NotificationService(provider=provider_mock)

    # Evaluate for SDE Internship
    match_sde = matcher.evaluate_job_for_profile(db, user.id, job.id, profile_sde.id)
    assert match_sde.matched is True

    # Evaluate for Backend Engineer
    match_backend = matcher.evaluate_job_for_profile(db, user.id, job.id, profile_backend.id)
    assert match_backend.matched is False  # Because job_type is Internship, but Backend requires FullTime

    # Notify for SDE Internship
    notif_sde = notifier.send_job_match_notification(db, user.id, match_sde.id)
    assert notif_sde is not None
    assert notif_sde.status == "sent"
    assert notif_sde.watch_profile_id == profile_sde.id
    assert "Profile: SDE Internship" in notif_sde.message

    # Notify for Backend Engineer (should be None because matched is False)
    notif_backend = notifier.send_job_match_notification(db, user.id, match_backend.id)
    assert notif_backend is None

    # Assert notifications in DB for this job
    notifs = db.execute(select(Notification).where(Notification.job_id == job.id)).scalars().all()
    assert len(notifs) == 1
    assert notifs[0].watch_profile_id == profile_sde.id


# Test 4, 5: Job matches ONLY Backend Engineer -> Only Backend Engineer creates Notification
def test_job_matching_only_backend_engineer(db: Session, multi_profile_data: dict):
    user = multi_profile_data["user"]
    profile_sde = multi_profile_data["profile_sde"]
    profile_backend = multi_profile_data["profile_backend"]
    job = multi_profile_data["job_backend_only"]

    matcher = MatchService()
    provider_mock = MagicMock()
    provider_mock.send.return_value = NotificationDeliveryResult(success=True)
    notifier = NotificationService(provider=provider_mock)

    # Evaluate for SDE Internship
    match_sde = matcher.evaluate_job_for_profile(db, user.id, job.id, profile_sde.id)
    assert match_sde.matched is False  # Contains 'Senior' and job_type is FullTime

    # Evaluate for Backend Engineer
    match_backend = matcher.evaluate_job_for_profile(db, user.id, job.id, profile_backend.id)
    assert match_backend.matched is True

    # Notify for SDE Internship (rejected)
    notif_sde = notifier.send_job_match_notification(db, user.id, match_sde.id)
    assert notif_sde is None

    # Notify for Backend Engineer (should send)
    notif_backend = notifier.send_job_match_notification(db, user.id, match_backend.id)
    assert notif_backend is not None
    assert notif_backend.status == "sent"
    assert notif_backend.watch_profile_id == profile_backend.id
    assert "Profile: Backend Engineer" in notif_backend.message

    # Assert notifications in DB for this job
    notifs = db.execute(select(Notification).where(Notification.job_id == job.id)).scalars().all()
    assert len(notifs) == 1
    assert notifs[0].watch_profile_id == profile_backend.id


# Test 6, 7: Job matches BOTH profiles -> Both profile-specific notifications created with idempotency
def test_job_matching_both_profiles(db: Session, multi_profile_data: dict):
    user = multi_profile_data["user"]
    profile_sde = multi_profile_data["profile_sde"]
    profile_backend = multi_profile_data["profile_backend"]
    company = multi_profile_data["company"]

    # Create a job that matches both: Role "Backend Software Engineer", job_type None (or both accept)
    # We update rule_backend to allow job_type None to test matching both
    job_both = Job(
        id=uuid.uuid4(),
        company_id=company.id,
        title="Software Engineer Intern - Backend",
        job_type="Internship",
        source="workday",
        fingerprint=uuid.uuid4().hex,
        is_active=True
    )
    db.add(job_both)
    db.commit()

    # Manually create two matches where matched=True for both profiles
    match_sde = JobMatch(
        id=uuid.uuid4(),
        job_id=job_both.id,
        watch_profile_id=profile_sde.id,
        matched=True,
        score=1.0,
        match_reason="Matched SDE Internship"
    )
    match_backend = JobMatch(
        id=uuid.uuid4(),
        job_id=job_both.id,
        watch_profile_id=profile_backend.id,
        matched=True,
        score=1.0,
        match_reason="Matched Backend Engineer"
    )
    db.add_all([match_sde, match_backend])
    db.commit()

    provider_mock = MagicMock()
    provider_mock.send.return_value = NotificationDeliveryResult(success=True)
    notifier = NotificationService(provider=provider_mock)

    # Send notification for SDE Internship
    notif1 = notifier.send_job_match_notification(db, user.id, match_sde.id)
    assert notif1 is not None
    assert notif1.watch_profile_id == profile_sde.id
    assert notif1.status == "sent"

    # Send notification for Backend Engineer
    notif2 = notifier.send_job_match_notification(db, user.id, match_backend.id)
    assert notif2 is not None
    assert notif2.watch_profile_id == profile_backend.id
    assert notif2.status == "sent"
    assert notif1.id != notif2.id

    # Verify existing idempotency: Re-calling for SDE does not send a duplicate
    provider_mock.reset_mock()
    notif1_retry = notifier.send_job_match_notification(db, user.id, match_sde.id)
    assert notif1_retry.id == notif1.id
    provider_mock.send.assert_not_called()

    # Assert two distinct notifications exist for this job (one per profile)
    notifs = db.execute(select(Notification).where(Notification.job_id == job_both.id)).scalars().all()
    assert len(notifs) == 2
    profile_ids_notified = {n.watch_profile_id for n in notifs}
    assert profile_ids_notified == {profile_sde.id, profile_backend.id}


# Test 8: User A's notifications never use User B's profile
def test_cross_user_profile_rejection(db: Session, multi_profile_data: dict):
    user_a = multi_profile_data["user"]
    other_user_profile = multi_profile_data["profile_other_user"]
    job = multi_profile_data["job_backend_only"]

    # Match belongs to User B (other_user)
    match_b = JobMatch(
        id=uuid.uuid4(),
        job_id=job.id,
        watch_profile_id=other_user_profile.id,
        matched=True,
        score=1.0,
        match_reason="Matched other user"
    )
    db.add(match_b)
    db.commit()

    provider_mock = MagicMock()
    notifier = NotificationService(provider=provider_mock)

    # Attempting to notify User A using User B's profile match must raise ForbiddenError
    with pytest.raises(ForbiddenError):
        notifier.send_job_match_notification(db, user_a.id, match_b.id)

    provider_mock.send.assert_not_called()


# Test 9: No notification is created for unmatched jobs
def test_no_notification_for_unmatched_jobs(db: Session, multi_profile_data: dict):
    user = multi_profile_data["user"]
    profile_sde = multi_profile_data["profile_sde"]
    job = multi_profile_data["job_unmatched"]

    matcher = MatchService()
    match = matcher.evaluate_job_for_profile(db, user.id, job.id, profile_sde.id)
    assert match.matched is False

    provider_mock = MagicMock()
    notifier = NotificationService(provider=provider_mock)

    result = notifier.send_job_match_notification(db, user.id, match.id)
    assert result is None
    provider_mock.send.assert_not_called()

    notifs = db.execute(select(Notification).where(Notification.job_id == job.id)).scalars().all()
    assert len(notifs) == 0
