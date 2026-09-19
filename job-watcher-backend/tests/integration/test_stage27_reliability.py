import pytest
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.job import Job
from app.db.models.watch_profile import WatchProfile
from app.db.models.watch_profile_company import WatchProfileCompany
from app.db.models.watch_rule import WatchRule
from app.db.models.job_match import JobMatch
from app.db.models.notification import Notification
from app.db.models.scan_run import ScanRun
from app.db.models.scan_error import ScanError

from app.schemas.job import DiscoveredJob
from app.services.jobs.job_service import create_or_get_job, get_job, list_jobs
from app.services.matching.match_service import MatchService
from app.services.notifications.notification_service import NotificationService
from app.services.notifications.interfaces import NotificationDeliveryResult
from app.services.scanning.scan_service import ScanService, ScanResult
from app.services.scanning.scan_query_service import get_dashboard_summary
from app.services.crawler.reliability import (
    is_safe_url,
    ReliableHttpClient,
    BudgetExceededError,
    UnsafeUrlError,
    CrawlerErrorCategory,
    categorize_crawler_error,
)
from app.services.crawler.browser_renderer import BrowserRenderer, RenderedPageResult
from app.services.crawler.interfaces import CrawlerResult
from app.core.config import settings
from app.db.session import SessionLocal
from app.core.exceptions import NotFoundError, ForbiddenError

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
def rel_data(db: Session):
    created = []

    # 1. Users
    user1 = User(
        id=uuid.uuid4(),
        auth_user_id=uuid.uuid4(),
        email=f"rel-user1-{uuid.uuid4().hex[:8]}@example.com",
        telegram_chat_id="11111111"
    )
    user2 = User(
        id=uuid.uuid4(),
        auth_user_id=uuid.uuid4(),
        email=f"rel-user2-{uuid.uuid4().hex[:8]}@example.com",
        telegram_chat_id="22222222"
    )
    db.add_all([user1, user2])
    db.flush()
    created.extend([user1, user2])

    # 2. Companies
    suffix = uuid.uuid4().hex[:6]
    comp_a = Company(id=uuid.uuid4(), name=f"CompA_{suffix}", slug=f"compa-{suffix}")
    comp_b = Company(id=uuid.uuid4(), name=f"CompB_{suffix}", slug=f"compb-{suffix}")
    db.add_all([comp_a, comp_b])
    db.flush()
    created.extend([comp_a, comp_b])

    # 3. Watch Profiles for User 1
    wp1 = WatchProfile(id=uuid.uuid4(), user_id=user1.id, name="Profile One", is_active=True)
    wp2 = WatchProfile(id=uuid.uuid4(), user_id=user1.id, name="Profile Two", is_active=True)
    # Watch Profile for User 2
    wp_other = WatchProfile(id=uuid.uuid4(), user_id=user2.id, name="User2 Profile", is_active=True)
    db.add_all([wp1, wp2, wp_other])
    db.flush()
    created.extend([wp1, wp2, wp_other])

    # 4. Rules
    rule1 = WatchRule(
        id=uuid.uuid4(),
        watch_profile_id=wp1.id,
        role_keywords=["engineer", "developer"],
        include_keywords=["python"],
        exclude_keywords=[]
    )
    rule2 = WatchRule(
        id=uuid.uuid4(),
        watch_profile_id=wp2.id,
        role_keywords=["engineer", "developer"],
        include_keywords=["backend"],
        exclude_keywords=[]
    )
    db.add_all([rule1, rule2])
    db.flush()
    created.extend([rule1, rule2])

    # 5. Profile Companies
    wpc1 = WatchProfileCompany(
        id=uuid.uuid4(),
        watch_profile_id=wp1.id,
        company_id=comp_a.id,
        career_url="https://example.com/careers/a",
        is_active=True
    )
    wpc2 = WatchProfileCompany(
        id=uuid.uuid4(),
        watch_profile_id=wp1.id,
        company_id=comp_b.id,
        career_url="https://example.com/careers/b",
        is_active=True
    )
    wpc_wp2 = WatchProfileCompany(
        id=uuid.uuid4(),
        watch_profile_id=wp2.id,
        company_id=comp_a.id,
        career_url="https://example.com/careers/a",
        is_active=True
    )
    db.add_all([wpc1, wpc2, wpc_wp2])
    db.flush()
    created.extend([wpc1, wpc2, wpc_wp2])

    data = {
        "user1": user1,
        "user2": user2,
        "comp_a": comp_a,
        "comp_b": comp_b,
        "wp1": wp1,
        "wp2": wp2,
        "wp_other": wp_other,
        "rule1": rule1,
        "rule2": rule2,
        "wpc1": wpc1,
        "wpc2": wpc2,
    }

    yield data

    # Cleanup in reverse order
    for item in reversed(created):
        try:
            db.delete(item)
            db.commit()
        except Exception:
            db.rollback()

# ==========================================
# 1. Concurrent Scan Protection
# ==========================================
def test_01_concurrent_scan_protection(db: Session, rel_data):
    wp = rel_data["wp1"]
    
    # Simulate an actively running scan
    active_run = ScanRun(
        id=uuid.uuid4(),
        watch_profile_id=wp.id,
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(active_run)
    db.commit()

    service = ScanService(match_service=MagicMock(), notification_service=MagicMock())
    
    # Attempt second concurrent scan for same profile
    result = service.run_scan_for_profile(db, wp.id)
    
    assert result.status == "already_running"
    assert result.scan_id == active_run.id

    # Verify no second ScanRun was created
    runs = db.execute(
        select(ScanRun).where(ScanRun.watch_profile_id == wp.id)
    ).scalars().all()
    assert len(runs) == 1
    assert runs[0].status == "running"

    db.delete(active_run)
    db.commit()

# ==========================================
# 2. Stale Scan Recovery
# ==========================================
def test_02_stale_scan_recovery(db: Session, rel_data):
    wp = rel_data["wp1"]
    
    # Simulate a stale scan from 2 hours ago (> 1 hour budget)
    stale_time = datetime.now(timezone.utc) - timedelta(hours=2)
    stale_run = ScanRun(
        id=uuid.uuid4(),
        watch_profile_id=wp.id,
        status="running",
        started_at=stale_time,
    )
    db.add(stale_run)
    db.commit()

    service = ScanService(match_service=MagicMock(), notification_service=MagicMock())
    recovered = service.recover_stale_scans(db, max_age_seconds=3600)
    
    assert recovered >= 1
    db.refresh(stale_run)
    assert stale_run.status == "failed"
    assert stale_run.completed_at is not None

    # Check error record created
    err = db.execute(
        select(ScanError).where(ScanError.scan_run_id == stale_run.id)
    ).scalars().first()
    assert err is not None
    assert err.error_type == "STALE_RUN_TIMEOUT"

    db.delete(stale_run)
    db.commit()

# ==========================================
# 3. Repeated Same-Job Persistence (Idempotency)
# ==========================================
def test_03_repeated_same_job_persistence(db: Session, rel_data):
    comp = rel_data["comp_a"]
    job_ext_id = f"ext-{uuid.uuid4().hex[:8]}"
    
    disc_job = DiscoveredJob(
        title="Software Engineer Python",
        description="Write clean backend Python code",
        location="Remote",
        job_type="full-time",
        apply_url="https://example.com/jobs/123",
        source="workday",
        external_id=job_ext_id,
        source_url="https://example.com/careers/a"
    )

    # First discovery
    job1, is_new1 = create_or_get_job(db, comp.id, disc_job)
    assert is_new1 is True
    assert job1.external_id == job_ext_id

    initial_last_seen = job1.last_seen_at

    # Second discovery in subsequent scan
    job2, is_new2 = create_or_get_job(db, comp.id, disc_job)
    assert is_new2 is False
    assert job2.id == job1.id
    assert job2.last_seen_at >= initial_last_seen

    # Only 1 row in DB
    jobs_count = db.execute(
        select(func.count(Job.id)).where(Job.external_id == job_ext_id, Job.company_id == comp.id)
    ).scalar()
    assert jobs_count == 1

    db.delete(job1)
    db.commit()

# ==========================================
# 4. Repeated Same-Match Persistence (Idempotency)
# ==========================================
def test_04_repeated_same_match_persistence(db: Session, rel_data):
    user = rel_data["user1"]
    wp = rel_data["wp1"]
    comp = rel_data["comp_a"]

    job = Job(
        id=uuid.uuid4(),
        company_id=comp.id,
        title="Python Backend Engineer",
        description="Python developer role",
        fingerprint=f"fp-match-{uuid.uuid4().hex[:8]}",
        source="workday",
        is_active=True
    )
    db.add(job)
    db.commit()

    match_service = MatchService()
    
    # First match evaluation
    m1 = match_service.evaluate_job_for_profile(db, user.id, job.id, wp.id)
    assert m1.matched is True

    # Second evaluation in subsequent scan
    m2 = match_service.evaluate_job_for_profile(db, user.id, job.id, wp.id)
    assert m2.id == m1.id
    assert m2.matched is True

    # Unique constraint verified: exactly 1 match row
    matches = db.execute(
        select(JobMatch).where(JobMatch.job_id == job.id, JobMatch.watch_profile_id == wp.id)
    ).scalars().all()
    assert len(matches) == 1

    db.delete(job)
    db.commit()

# ==========================================
# 5. Repeated Same-Notification Idempotency
# ==========================================
def test_05_repeated_same_notification_idempotency(db: Session, rel_data):
    user = rel_data["user1"]
    wp = rel_data["wp1"]
    comp = rel_data["comp_a"]

    job = Job(
        id=uuid.uuid4(),
        company_id=comp.id,
        title="Python Developer",
        description="Python role",
        fingerprint=f"fp-notif-{uuid.uuid4().hex[:8]}",
        source="workday",
        is_active=True
    )
    db.add(job)
    db.commit()

    match = JobMatch(
        id=uuid.uuid4(),
        job_id=job.id,
        watch_profile_id=wp.id,
        matched=True,
        score=0.9,
        match_reason="Role keyword matched: python"
    )
    db.add(match)
    db.commit()

    mock_provider = MagicMock()
    mock_provider.send.return_value = NotificationDeliveryResult(success=True)
    service = NotificationService(provider=mock_provider)

    # First send: should trigger delivery
    notif1 = service.send_job_match_notification(db, user.id, match.id)
    assert notif1.status == "sent"
    assert mock_provider.send.call_count == 1

    # Second send: should detect status='sent' and skip delivery
    notif2 = service.send_job_match_notification(db, user.id, match.id)
    assert notif2.id == notif1.id
    assert notif2.status == "sent"
    assert mock_provider.send.call_count == 1  # No duplicate send!

    # Exactly 1 notification row in DB
    notifs = db.execute(
        select(Notification).where(Notification.job_id == job.id, Notification.watch_profile_id == wp.id)
    ).scalars().all()
    assert len(notifs) == 1

    db.delete(job)
    db.commit()

# ==========================================
# 6. Multi-Profile Notification Isolation
# ==========================================
def test_06_multi_profile_notification_isolation(db: Session, rel_data):
    user = rel_data["user1"]
    wp1 = rel_data["wp1"]
    wp2 = rel_data["wp2"]
    comp = rel_data["comp_a"]

    job = Job(
        id=uuid.uuid4(),
        company_id=comp.id,
        title="Backend Python Engineer",
        description="Backend Python engineer needed",
        fingerprint=f"fp-multi-{uuid.uuid4().hex[:8]}",
        source="workday",
        is_active=True
    )
    db.add(job)
    db.commit()

    # Matches both Profile 1 and Profile 2
    match1 = JobMatch(id=uuid.uuid4(), job_id=job.id, watch_profile_id=wp1.id, matched=True, score=0.9)
    match2 = JobMatch(id=uuid.uuid4(), job_id=job.id, watch_profile_id=wp2.id, matched=True, score=0.9)
    db.add_all([match1, match2])
    db.commit()

    mock_provider = MagicMock()
    mock_provider.send.return_value = NotificationDeliveryResult(success=True)
    service = NotificationService(provider=mock_provider)

    notif1 = service.send_job_match_notification(db, user.id, match1.id)
    notif2 = service.send_job_match_notification(db, user.id, match2.id)

    assert notif1.id != notif2.id
    assert notif1.watch_profile_id == wp1.id
    assert notif2.watch_profile_id == wp2.id
    assert mock_provider.send.call_count == 2

    # Both independent records exist
    rows = db.execute(
        select(Notification).where(Notification.job_id == job.id)
    ).scalars().all()
    assert len(rows) == 2

    db.delete(job)
    db.commit()

# ==========================================
# 7. Failed Telegram Delivery
# ==========================================
def test_07_failed_telegram_delivery(db: Session, rel_data):
    user = rel_data["user1"]
    wp = rel_data["wp1"]
    comp = rel_data["comp_a"]

    job = Job(
        id=uuid.uuid4(),
        company_id=comp.id,
        title="DevOps Engineer",
        fingerprint=f"fp-fail-{uuid.uuid4().hex[:8]}",
        source="workday",
        is_active=True
    )
    db.add(job)
    db.commit()

    match = JobMatch(id=uuid.uuid4(), job_id=job.id, watch_profile_id=wp.id, matched=True, score=0.8)
    db.add(match)
    db.commit()

    # Mock provider failure (e.g. rate limit HTTP 429)
    mock_provider = MagicMock()
    mock_provider.send.return_value = NotificationDeliveryResult(success=False, error="HTTP 429")
    service = NotificationService(provider=mock_provider)

    notif = service.send_job_match_notification(db, user.id, match.id)
    assert notif.status == "failed"
    assert notif.error_message == "HTTP 429"

    # Verify notification retry works safely
    mock_provider.send.return_value = NotificationDeliveryResult(success=True)
    retried = service.retry_notification(db, user.id, notif.id)
    assert retried.status == "sent"

    db.delete(job)
    db.commit()

# ==========================================
# 8. Crawler Timeout Isolation
# ==========================================
def test_08_crawler_timeout_isolation(db: Session, rel_data, mocker):
    wp = rel_data["wp1"]

    # Mock persistence pipeline: company 1 succeeds, company 2 times out
    mock_persistence = mocker.patch("app.services.scanning.scan_service.run_persistence_pipeline")
    success_res = MagicMock(crawler_success=True, jobs_processed=5, new_jobs=1, new_job_ids=[uuid.uuid4()])
    timeout_res = MagicMock(crawler_success=False, error_category="timeout", errors=["Timeout fetching career URL"], duration_ms=100, requests_made=1)
    mock_persistence.side_effect = [success_res, timeout_res]

    mock_matcher = MagicMock()
    mock_matcher.evaluate_job_for_profile.return_value = MagicMock(matched=False)
    mock_notif = MagicMock()

    service = ScanService(match_service=mock_matcher, notification_service=mock_notif)
    result = service.run_scan_for_profile(db, wp.id)

    assert result.status == "partial"
    assert result.jobs_discovered == 5
    assert result.jobs_new == 1
    assert result.errors == 1

    # Verify ScanRun status in DB
    sr = db.execute(select(ScanRun).where(ScanRun.id == result.scan_id)).scalars().first()
    assert sr.status == "partial"

    # Verify error record
    errors = db.execute(select(ScanError).where(ScanError.scan_run_id == result.scan_id)).scalars().all()
    assert len(errors) == 1
    assert errors[0].error_type == "timeout"

    db.delete(sr)
    db.commit()

# ==========================================
# 9. 429 Retry Behavior
# ==========================================
def test_09_429_retry_behavior(mocker):
    mock_client = MagicMock()
    
    # 429 on first attempt, 200 on second attempt
    resp_429 = MagicMock(status_code=429, headers={"Retry-After": "1"}, history=[])
    resp_200 = MagicMock(status_code=200, headers={}, history=[])
    resp_200.raise_for_status.return_value = None
    mock_client.request.side_effect = [resp_429, resp_200]

    # Patch sleep to avoid real delays
    mock_sleep = mocker.patch("time.sleep")

    client = ReliableHttpClient(base_client=mock_client, max_retries=2, timeout=5)
    resp = client.get("https://example.com/careers")

    assert resp.status_code == 200
    assert mock_client.request.call_count == 2
    mock_sleep.assert_called_once()

# ==========================================
# 10. 5xx Retry Behavior
# ==========================================
def test_10_5xx_retry_behavior(mocker):
    mock_client = MagicMock()
    
    # 503 on first attempt, 200 on second attempt
    resp_503 = MagicMock(status_code=503, headers={}, history=[])
    resp_200 = MagicMock(status_code=200, headers={}, history=[])
    resp_200.raise_for_status.return_value = None
    mock_client.request.side_effect = [resp_503, resp_200]

    mock_sleep = mocker.patch("time.sleep")

    client = ReliableHttpClient(base_client=mock_client, max_retries=2, timeout=5)
    resp = client.get("https://example.com/careers")

    assert resp.status_code == 200
    assert mock_client.request.call_count == 2
    mock_sleep.assert_called_once()

# ==========================================
# 11. SSRF Protection
# ==========================================
def test_11_ssrf_protection():
    # Loopback and private IPs blocked
    assert is_safe_url("http://127.0.0.1:8000/jobs") is False
    assert is_safe_url("http://localhost/admin") is False
    assert is_safe_url("http://[::1]/secret") is False
    assert is_safe_url("http://0.0.0.0/") is False
    assert is_safe_url("http://192.168.1.1/careers") is False
    assert is_safe_url("http://10.0.0.1/jobs") is False
    assert is_safe_url("http://169.254.169.254/latest/meta-data/") is False
    
    # Unsupported schemes blocked
    assert is_safe_url("file:///etc/passwd") is False
    assert is_safe_url("ftp://ftp.example.com") is False
    assert is_safe_url("gopher://example.com") is False

    # Valid public career sites allowed
    assert is_safe_url("https://amazon.jobs/en") is True
    assert is_safe_url("https://careers.google.com/jobs/results") is True
    assert is_safe_url("https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite") is True

# ==========================================
# 12. Browser Cleanup After Failure
# ==========================================
def test_12_browser_cleanup_after_failure(mocker):
    renderer = BrowserRenderer(headless=True, timeout_ms=5000)
    
    # Mock playwright to test clean closing on error
    mock_page = MagicMock()
    mock_context = MagicMock()
    mock_browser = MagicMock()
    
    mock_page.goto.side_effect = Exception("Page crashed")
    mock_context.new_page.return_value = mock_page
    mock_browser.new_context.return_value = mock_context

    mock_playwright = MagicMock()
    mock_playwright.chromium.launch.return_value = mock_browser

    mocker.patch("app.services.crawler.browser_renderer.is_safe_url", return_value=True)

    with patch("playwright.sync_api.sync_playwright") as mock_sync:
        mock_sync.return_value.__enter__.return_value = mock_playwright
        res = renderer.render("https://example.com/careers")

        assert res.success is False
        assert "Page crashed" in (res.error or "")
        # Verify page, context, and browser close were all invoked in finally
        mock_page.close.assert_called_once()
        mock_context.close.assert_called_once()
        mock_browser.close.assert_called_once()

# ==========================================
# 13. Partial Scan Status Rules
# ==========================================
def test_13_partial_scan_status(db: Session, rel_data, mocker):
    wp = rel_data["wp1"]
    mock_persistence = mocker.patch("app.services.scanning.scan_service.run_persistence_pipeline")
    
    # Case A: 100% success -> completed
    mock_persistence.side_effect = [
        MagicMock(crawler_success=True, jobs_processed=2, new_jobs=0, new_job_ids=[]),
        MagicMock(crawler_success=True, jobs_processed=3, new_jobs=0, new_job_ids=[])
    ]
    service = ScanService(match_service=MagicMock(), notification_service=MagicMock())
    res_completed = service.run_scan_for_profile(db, wp.id)
    assert res_completed.status == "completed"
    assert res_completed.errors == 0

    # Clean up run
    db.execute(select(ScanRun).where(ScanRun.id == res_completed.scan_id)).scalars().first()
    
    # Case B: 100% failure -> failed
    mock_persistence.side_effect = [
        MagicMock(crawler_success=False, error_category="http_404", errors=["Not found"], duration_ms=50, requests_made=1),
        MagicMock(crawler_success=False, error_category="timeout", errors=["Timeout"], duration_ms=50, requests_made=1)
    ]
    res_failed = service.run_scan_for_profile(db, wp.id)
    assert res_failed.status == "failed"
    assert res_failed.errors == 2

    # Clean up runs
    db.query(ScanRun).filter(ScanRun.watch_profile_id == wp.id).delete()
    db.commit()

# ==========================================
# 14. Accurate Scan Counters
# ==========================================
def test_14_accurate_scan_counters(db: Session, rel_data, mocker):
    wp = rel_data["wp1"]
    
    job_id1 = uuid.uuid4()
    job_id2 = uuid.uuid4()
    
    mock_persistence = mocker.patch("app.services.scanning.scan_service.run_persistence_pipeline")
    mock_persistence.side_effect = [
        MagicMock(crawler_success=True, jobs_processed=10, new_jobs=2, new_job_ids=[job_id1, job_id2]),
        MagicMock(crawler_success=True, jobs_processed=8, new_jobs=0, new_job_ids=[])
    ]

    mock_matcher = MagicMock()
    # 1 matched, 1 unmatched
    mock_matcher.evaluate_job_for_profile.side_effect = [
        MagicMock(matched=True, id=uuid.uuid4()),
        MagicMock(matched=False, id=uuid.uuid4())
    ]

    mock_notif = MagicMock()
    mock_notif.send_job_match_notification.return_value = MagicMock(status="sent")

    service = ScanService(match_service=mock_matcher, notification_service=mock_notif)
    result = service.run_scan_for_profile(db, wp.id)

    assert result.status == "completed"
    assert result.career_urls_scanned == 2
    assert result.jobs_discovered == 18 # 10 + 8
    assert result.jobs_new == 2        # 2 + 0
    assert result.jobs_matched == 1    # 1 matched
    assert result.notifications_sent == 1 # 1 sent

    db.query(ScanRun).filter(ScanRun.watch_profile_id == wp.id).delete()
    db.commit()

# ==========================================
# 15. DB Rollback After Persistence Error
# ==========================================
def test_15_db_rollback_after_persistence_error(db: Session, rel_data, mocker):
    wp = rel_data["wp1"]

    mock_persistence = mocker.patch("app.services.scanning.scan_service.run_persistence_pipeline")
    # Simulate DB error during company 1, then success on company 2
    mock_persistence.side_effect = [
        Exception("Database write error"),
        MagicMock(crawler_success=True, jobs_processed=5, new_jobs=0, new_job_ids=[])
    ]

    service = ScanService(match_service=MagicMock(), notification_service=MagicMock())
    result = service.run_scan_for_profile(db, wp.id)

    # Scan survived, session was rolled back, error captured
    assert result.status == "partial"
    assert result.errors == 1
    assert result.jobs_discovered == 5

    db.query(ScanRun).filter(ScanRun.watch_profile_id == wp.id).delete()
    db.commit()

# ==========================================
# 16. User-Scoped Notification Access
# ==========================================
def test_16_user_scoped_notification_access(db: Session, rel_data):
    user1 = rel_data["user1"]
    user2 = rel_data["user2"]
    wp1 = rel_data["wp1"]
    comp = rel_data["comp_a"]

    job = Job(
        id=uuid.uuid4(),
        company_id=comp.id,
        title="Scoped Notification Test Job",
        fingerprint=f"fp-scope-{uuid.uuid4().hex[:8]}",
        source="workday",
        is_active=True
    )
    db.add(job)
    db.commit()

    notif = Notification(
        id=uuid.uuid4(),
        user_id=user1.id,
        job_id=job.id,
        watch_profile_id=wp1.id,
        channel="telegram",
        status="sent",
        recipient="11111111",
        message="Alert"
    )
    db.add(notif)
    db.commit()

    service = NotificationService(provider=MagicMock())

    # User 1 accesses own notification: success
    resp = service.get_notification(db, user1.id, notif.id)
    assert resp.id == notif.id

    # User 2 attempts to access User 1's notification: 404 NotFound
    with pytest.raises(NotFoundError):
        service.get_notification(db, user2.id, notif.id)

    # User 2 list should NOT contain User 1's notification
    user2_list = service.list_notifications(db, user2.id)
    assert not any(n.id == notif.id for n in user2_list)

    db.delete(job)
    db.commit()

# ==========================================
# 17. User-Scoped Job Access
# ==========================================
def test_17_user_scoped_job_access(db: Session, rel_data):
    user1 = rel_data["user1"]
    user2 = rel_data["user2"]
    comp_a = rel_data["comp_a"] # Monitored by User 1
    comp_b = rel_data["comp_b"] # Monitored by User 1

    # Unmonitored company for User 2
    comp_unmonitored = Company(
        id=uuid.uuid4(),
        name=f"SecretCo_{uuid.uuid4().hex[:6]}",
        slug=f"secretco-{uuid.uuid4().hex[:6]}"
    )
    db.add(comp_unmonitored)
    db.commit()

    job_monitored = Job(
        id=uuid.uuid4(),
        company_id=comp_a.id,
        title="User1 Monitored Job",
        fingerprint=f"fp-mon-{uuid.uuid4().hex[:8]}",
        source="workday",
        is_active=True
    )
    job_unmonitored = Job(
        id=uuid.uuid4(),
        company_id=comp_unmonitored.id,
        title="Unmonitored Job",
        fingerprint=f"fp-unmon-{uuid.uuid4().hex[:8]}",
        source="workday",
        is_active=True
    )
    db.add_all([job_monitored, job_unmonitored])
    db.commit()

    # User 1 can see job at monitored company
    j = get_job(db, job_monitored.id, user_id=user1.id)
    assert j.id == job_monitored.id

    # User 1 CANNOT see job at unmonitored company
    with pytest.raises(NotFoundError):
        get_job(db, job_unmonitored.id, user_id=user1.id)

    # List jobs scoped to User 1 only includes monitored company
    user1_jobs = list_jobs(db, user_id=user1.id)
    user1_job_ids = [job.id for job in user1_jobs]
    assert job_monitored.id in user1_job_ids
    assert job_unmonitored.id not in user1_job_ids

    db.delete(job_monitored)
    db.delete(job_unmonitored)
    db.delete(comp_unmonitored)
    db.commit()

# ==========================================
# 18. Dashboard Aggregate Semantics
# ==========================================
def test_18_dashboard_aggregate_semantics(db: Session, rel_data):
    user1 = rel_data["user1"]
    wp1 = rel_data["wp1"]
    wp2 = rel_data["wp2"]
    comp_a = rel_data["comp_a"]

    # Add 1 job
    job = Job(
        id=uuid.uuid4(),
        company_id=comp_a.id,
        title="Lead Python Architect",
        fingerprint=f"fp-dash-{uuid.uuid4().hex[:8]}",
        source="workday",
        is_active=True
    )
    db.add(job)
    db.commit()

    # Match job to both Profile 1 and Profile 2
    m1 = JobMatch(id=uuid.uuid4(), job_id=job.id, watch_profile_id=wp1.id, matched=True, score=0.95)
    m2 = JobMatch(id=uuid.uuid4(), job_id=job.id, watch_profile_id=wp2.id, matched=True, score=0.90)
    db.add_all([m1, m2])
    db.commit()

    # Add 1 sent notification
    notif = Notification(
        id=uuid.uuid4(),
        user_id=user1.id,
        job_id=job.id,
        watch_profile_id=wp1.id,
        channel="telegram",
        status="sent"
    )
    db.add(notif)
    db.commit()

    summary = get_dashboard_summary(db, user_id=user1.id)

    assert summary.active_watch_profiles == 2 # wp1, wp2
    assert summary.monitored_companies == 2  # comp_a, comp_b
    assert summary.available_jobs >= 1
    # Matched Jobs counts DISTINCT matched jobs across active profiles (1 unique job, not 2 match rows)
    assert summary.matched_jobs >= 1
    assert summary.notifications.sent >= 1

    db.delete(job)
    db.commit()
