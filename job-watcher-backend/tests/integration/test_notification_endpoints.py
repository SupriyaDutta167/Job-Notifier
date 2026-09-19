import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.auth.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.job import Job
from app.db.models.watch_profile import WatchProfile
from app.db.models.job_match import JobMatch
from app.db.models.notification import Notification
from app.api.v1.notifications import get_notification_service
from app.services.notifications.notification_service import NotificationService
from app.services.notifications.interfaces import NotificationDeliveryResult
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
def test_data(db: Session):
    created = []

    # Users
    user_a = User(
        id=uuid.uuid4(),
        auth_user_id=uuid.uuid4(),
        email=f"user-a-notif-{uuid.uuid4().hex[:8]}@example.com",
        telegram_chat_id="11111111"
    )
    user_b = User(
        id=uuid.uuid4(),
        auth_user_id=uuid.uuid4(),
        email=f"user-b-notif-{uuid.uuid4().hex[:8]}@example.com",
        telegram_chat_id="22222222"
    )
    user_unconfigured = User(
        id=uuid.uuid4(),
        auth_user_id=uuid.uuid4(),
        email=f"user-unconf-{uuid.uuid4().hex[:8]}@example.com",
        telegram_chat_id=None
    )
    db.add_all([user_a, user_b, user_unconfigured])
    created.extend([user_a, user_b, user_unconfigured])
    db.flush()

    # Company
    company = Company(
        id=uuid.uuid4(),
        name=f"Notify Corp {uuid.uuid4().hex[:6]}",
        slug=f"notify-corp-{uuid.uuid4().hex[:8]}",
        website_url="https://notifycorp.com"
    )
    db.add(company)
    created.append(company)
    db.flush()

    # Job
    job = Job(
        id=uuid.uuid4(),
        company_id=company.id,
        title="Software Engineer",
        source="greenhouse",
        apply_url="https://notifycorp.com/apply/123",
        source_url="https://notifycorp.com/jobs/123",
        fingerprint=uuid.uuid4().hex,
        is_active=True
    )
    db.add(job)
    created.append(job)
    db.flush()

    # WatchProfiles
    profile_a = WatchProfile(id=uuid.uuid4(), user_id=user_a.id, name="Profile A", is_active=True)
    profile_b = WatchProfile(id=uuid.uuid4(), user_id=user_b.id, name="Profile B", is_active=True)
    db.add_all([profile_a, profile_b])
    created.extend([profile_a, profile_b])
    db.flush()

    # Matches
    match_a = JobMatch(
        id=uuid.uuid4(),
        job_id=job.id,
        watch_profile_id=profile_a.id,
        matched=True,
        score=0.95,
        match_reason="Matched keyword 'Software'"
    )
    match_b = JobMatch(
        id=uuid.uuid4(),
        job_id=job.id,
        watch_profile_id=profile_b.id,
        matched=True,
        score=0.88,
        match_reason="Matched keyword 'Engineer'"
    )
    db.add_all([match_a, match_b])
    created.extend([match_a, match_b])
    db.flush()

    # Notifications for User A: one sent, one failed, one pending
    notif_a_sent = Notification(
        id=uuid.uuid4(),
        user_id=user_a.id,
        job_id=job.id,
        watch_profile_id=profile_a.id,
        channel="telegram",
        status="sent",
        recipient="11111111",
        message="Alert for User A - Sent",
        sent_at=datetime.now(timezone.utc),
        error_message=None
    )
    
    job_a_2 = Job(
        id=uuid.uuid4(),
        company_id=company.id,
        title="Backend Developer",
        source="greenhouse",
        fingerprint=uuid.uuid4().hex,
        is_active=True
    )
    db.add(job_a_2)
    created.append(job_a_2)
    db.flush()

    match_a_2 = JobMatch(
        id=uuid.uuid4(),
        job_id=job_a_2.id,
        watch_profile_id=profile_a.id,
        matched=True,
        score=0.85,
        match_reason="Matched keyword 'Backend'"
    )
    db.add(match_a_2)
    created.append(match_a_2)
    db.flush()

    notif_a_failed = Notification(
        id=uuid.uuid4(),
        user_id=user_a.id,
        job_id=job_a_2.id,
        watch_profile_id=profile_a.id,
        channel="telegram",
        status="failed",
        recipient="11111111",
        message="Alert for User A - Failed",
        sent_at=None,
        error_message="Telegram network timeout"
    )

    job_a_3 = Job(
        id=uuid.uuid4(),
        company_id=company.id,
        title="Frontend Developer",
        source="greenhouse",
        fingerprint=uuid.uuid4().hex,
        is_active=True
    )
    db.add(job_a_3)
    created.append(job_a_3)
    db.flush()

    match_a_3 = JobMatch(
        id=uuid.uuid4(),
        job_id=job_a_3.id,
        watch_profile_id=profile_a.id,
        matched=True,
        score=0.80,
        match_reason="Matched keyword 'Frontend'"
    )
    db.add(match_a_3)
    created.append(match_a_3)
    db.flush()

    notif_a_pending = Notification(
        id=uuid.uuid4(),
        user_id=user_a.id,
        job_id=job_a_3.id,
        watch_profile_id=profile_a.id,
        channel="telegram",
        status="pending",
        recipient="11111111",
        message="Alert for User A - Pending",
        sent_at=None,
        error_message=None
    )

    # Notification for User B
    notif_b = Notification(
        id=uuid.uuid4(),
        user_id=user_b.id,
        job_id=job.id,
        watch_profile_id=profile_b.id,
        channel="telegram",
        status="sent",
        recipient="22222222",
        message="Alert for User B - Sent",
        sent_at=datetime.now(timezone.utc),
        error_message=None
    )
    db.add_all([notif_a_sent, notif_a_failed, notif_a_pending, notif_b])
    created.extend([notif_a_sent, notif_a_failed, notif_a_pending, notif_b])
    db.commit()

    yield {
        "user_a": user_a,
        "user_b": user_b,
        "user_unconfigured": user_unconfigured,
        "company": company,
        "job": job,
        "notif_a_sent": notif_a_sent,
        "notif_a_failed": notif_a_failed,
        "notif_a_pending": notif_a_pending,
        "notif_b": notif_b,
        "created": created,
    }

    # Cleanup
    try:
        for item in reversed(created):
            try:
                db.delete(item)
            except Exception:
                pass
        db.commit()
    except Exception:
        db.rollback()


def test_user_a_sees_only_own_notifications(test_data):
    user_a = test_data["user_a"]
    notif_b = test_data["notif_b"]

    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        response = client.get("/api/v1/notifications")
        assert response.status_code == 200
        data = response.json()
        ids = [n["id"] for n in data]
        assert str(test_data["notif_a_sent"].id) in ids
        assert str(test_data["notif_a_failed"].id) in ids
        assert str(test_data["notif_a_pending"].id) in ids
        # User B's notification must NOT be returned
        assert str(notif_b.id) not in ids
    finally:
        app.dependency_overrides.clear()


def test_user_a_cannot_get_user_b_notification(test_data):
    user_a = test_data["user_a"]
    notif_b = test_data["notif_b"]

    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        # User A attempting to view User B's notification by ID must 404
        response = client.get(f"/api/v1/notifications/{notif_b.id}")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_sent_notification_renders_correctly(test_data):
    user_a = test_data["user_a"]
    notif_a_sent = test_data["notif_a_sent"]
    company = test_data["company"]

    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        response = client.get(f"/api/v1/notifications/{notif_a_sent.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(notif_a_sent.id)
        assert data["status"] == "sent"
        assert data["channel"] == "telegram"
        assert data["job_title"] == "Software Engineer"
        assert data["company_name"] == company.name
        assert data["watch_profile_name"] == "Profile A"
        assert data["sent_at"] is not None
        assert data["match_reason"] == "Matched keyword 'Software'"
        assert data["match_score"] == 0.95
        assert data["apply_url"] == "https://notifycorp.com/apply/123"
    finally:
        app.dependency_overrides.clear()


def test_failed_notification_renders_correctly(test_data):
    user_a = test_data["user_a"]
    notif_a_failed = test_data["notif_a_failed"]

    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        response = client.get(f"/api/v1/notifications/{notif_a_failed.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(notif_a_failed.id)
        assert data["status"] == "failed"
        assert data["error_message"] == "Telegram network timeout"
        assert data["job_title"] == "Backend Developer"
    finally:
        app.dependency_overrides.clear()


def test_pending_notification_renders_correctly(test_data):
    user_a = test_data["user_a"]
    notif_a_pending = test_data["notif_a_pending"]

    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        response = client.get(f"/api/v1/notifications/{notif_a_pending.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(notif_a_pending.id)
        assert data["status"] == "pending"
        assert data["sent_at"] is None
    finally:
        app.dependency_overrides.clear()


def test_retry_failed_notification_success(test_data):
    user_a = test_data["user_a"]
    notif_a_failed = test_data["notif_a_failed"]

    mock_provider = MagicMock()
    mock_provider.send.return_value = NotificationDeliveryResult(success=True)

    app.dependency_overrides[get_current_user] = lambda: user_a
    app.dependency_overrides[get_notification_service] = lambda: NotificationService(provider=mock_provider)
    client = TestClient(app)
    try:
        response = client.post(f"/api/v1/notifications/{notif_a_failed.id}/retry")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "sent"
        assert data["sent_at"] is not None
        assert data["error_message"] is None
        mock_provider.send.assert_called_once()
        assert mock_provider.send.call_args[1]["destination"] == user_a.telegram_chat_id
    finally:
        app.dependency_overrides.clear()


def test_retry_already_sent_notification_rejected(test_data):
    user_a = test_data["user_a"]
    notif_a_sent = test_data["notif_a_sent"]

    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        response = client.post(f"/api/v1/notifications/{notif_a_sent.id}/retry")
        assert response.status_code == 400
        assert "already been sent" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_retry_user_b_notification_by_user_a_returns_404(test_data):
    user_a = test_data["user_a"]
    notif_b = test_data["notif_b"]

    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        response = client.post(f"/api/v1/notifications/{notif_b.id}/retry")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_telegram_test_endpoint_success(test_data):
    user_a = test_data["user_a"]

    mock_provider = MagicMock()
    mock_provider.send.return_value = NotificationDeliveryResult(success=True)

    app.dependency_overrides[get_current_user] = lambda: user_a
    app.dependency_overrides[get_notification_service] = lambda: NotificationService(provider=mock_provider)
    client = TestClient(app)
    try:
        # Test both /notifications/telegram/test and /me/telegram/test
        for endpoint in ["/api/v1/notifications/telegram/test", "/api/v1/me/telegram/test"]:
            mock_provider.reset_mock()
            response = client.post(endpoint)
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "sent successfully" in data["message"]
            mock_provider.send.assert_called_once()
            assert mock_provider.send.call_args[1]["destination"] == user_a.telegram_chat_id
    finally:
        app.dependency_overrides.clear()


def test_telegram_test_unconfigured_returns_safe_error(test_data):
    user_unconf = test_data["user_unconfigured"]

    app.dependency_overrides[get_current_user] = lambda: user_unconf
    client = TestClient(app)
    try:
        response = client.post("/api/v1/notifications/telegram/test")
        assert response.status_code == 400
        assert "not configured" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_telegram_bot_token_never_exposed(test_data):
    user_a = test_data["user_a"]

    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        # Inspect response payloads across all notification & user endpoints
        endpoints = [
            "/api/v1/notifications",
            f"/api/v1/notifications/{test_data['notif_a_sent'].id}",
            "/api/v1/me",
        ]
        for ep in endpoints:
            res = client.get(ep)
            assert res.status_code == 200
            text = res.text
            assert "TELEGRAM_BOT_TOKEN" not in text
            assert "bot" not in text or "http" in text  # no raw bot token
            if settings.TELEGRAM_BOT_TOKEN:
                assert settings.TELEGRAM_BOT_TOKEN not in text
    finally:
        app.dependency_overrides.clear()


def test_filtering_notifications_by_status(test_data):
    user_a = test_data["user_a"]

    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        res_sent = client.get("/api/v1/notifications?status=sent")
        assert res_sent.status_code == 200
        data_sent = res_sent.json()
        assert all(n["status"] == "sent" for n in data_sent)
        assert any(n["id"] == str(test_data["notif_a_sent"].id) for n in data_sent)
        assert not any(n["id"] == str(test_data["notif_a_failed"].id) for n in data_sent)

        res_failed = client.get("/api/v1/notifications?status=failed")
        assert res_failed.status_code == 200
        data_failed = res_failed.json()
        assert all(n["status"] == "failed" for n in data_failed)
        assert any(n["id"] == str(test_data["notif_a_failed"].id) for n in data_failed)
        assert not any(n["id"] == str(test_data["notif_a_sent"].id) for n in data_failed)
    finally:
        app.dependency_overrides.clear()
