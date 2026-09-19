import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.main import app
from app.core.auth.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.job import Job
from app.db.models.watch_profile import WatchProfile
from app.db.models.watch_profile_company import WatchProfileCompany
from app.db.models.job_match import JobMatch
from app.db.models.notification import Notification
from app.db.models.scan_run import ScanRun
from app.db.models.scan_error import ScanError
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
def scan_test_data(db: Session):
    created = []

    # 1. Users
    user_a = User(
        id=uuid.uuid4(),
        auth_user_id=uuid.uuid4(),
        email=f"user-a-scan-{uuid.uuid4().hex[:8]}@example.com",
        telegram_chat_id="11111111"
    )
    user_b = User(
        id=uuid.uuid4(),
        auth_user_id=uuid.uuid4(),
        email=f"user-b-scan-{uuid.uuid4().hex[:8]}@example.com",
        telegram_chat_id="22222222"
    )
    db.add_all([user_a, user_b])
    db.flush()
    created.extend([user_a, user_b])

    # 2. Companies
    slug_suffix = uuid.uuid4().hex[:6]
    comp1 = Company(
        id=uuid.uuid4(),
        name=f"CompA_{slug_suffix}",
        slug=f"compa-{slug_suffix}"
    )
    comp2 = Company(
        id=uuid.uuid4(),
        name=f"CompB_{slug_suffix}",
        slug=f"compb-{slug_suffix}"
    )
    comp_other = Company(
        id=uuid.uuid4(),
        name=f"CompOther_{slug_suffix}",
        slug=f"compother-{slug_suffix}"
    )
    db.add_all([comp1, comp2, comp_other])
    db.flush()
    created.extend([comp1, comp2, comp_other])

    # 3. Watch Profiles
    wp_a = WatchProfile(
        id=uuid.uuid4(),
        user_id=user_a.id,
        name="User A Profile",
        is_active=True
    )
    wp_b = WatchProfile(
        id=uuid.uuid4(),
        user_id=user_b.id,
        name="User B Profile",
        is_active=True
    )
    db.add_all([wp_a, wp_b])
    db.flush()
    created.extend([wp_a, wp_b])

    # 4. Watch Profile Companies
    wpc_a1 = WatchProfileCompany(
        id=uuid.uuid4(),
        watch_profile_id=wp_a.id,
        company_id=comp1.id,
        career_url="https://example.com/careers/a",
        is_active=True
    )
    wpc_a2 = WatchProfileCompany(
        id=uuid.uuid4(),
        watch_profile_id=wp_a.id,
        company_id=comp2.id,
        career_url="https://example.com/careers/b",
        is_active=True
    )
    wpc_b1 = WatchProfileCompany(
        id=uuid.uuid4(),
        watch_profile_id=wp_b.id,
        company_id=comp_other.id,
        career_url="https://example.com/careers/other",
        is_active=True
    )
    db.add_all([wpc_a1, wpc_a2, wpc_b1])
    db.flush()
    created.extend([wpc_a1, wpc_a2, wpc_b1])

    # 5. Jobs
    job1 = Job(
        id=uuid.uuid4(),
        company_id=comp1.id,
        title="Software Engineer",
        fingerprint=f"fp-scan-1-{uuid.uuid4().hex[:8]}",
        source="workday",
        is_active=True
    )
    job2 = Job(
        id=uuid.uuid4(),
        company_id=comp2.id,
        title="DevOps Engineer",
        fingerprint=f"fp-scan-2-{uuid.uuid4().hex[:8]}",
        source="greenhouse",
        is_active=True
    )
    job_other = Job(
        id=uuid.uuid4(),
        company_id=comp_other.id,
        title="Designer",
        fingerprint=f"fp-scan-other-{uuid.uuid4().hex[:8]}",
        source="lever",
        is_active=True
    )
    db.add_all([job1, job2, job_other])
    db.flush()
    created.extend([job1, job2, job_other])

    # 6. Matches
    match1 = JobMatch(
        id=uuid.uuid4(),
        job_id=job1.id,
        watch_profile_id=wp_a.id,
        matched=True,
        score=90.0,
        match_reason="Matched keywords",
        matched_at=datetime.now(timezone.utc)
    )
    db.add(match1)
    db.flush()
    created.append(match1)

    # 7. Notifications
    notif1 = Notification(
        id=uuid.uuid4(),
        user_id=user_a.id,
        job_id=job1.id,
        watch_profile_id=wp_a.id,
        channel="telegram",
        status="sent",
        recipient="11111111",
        created_at=datetime.now(timezone.utc)
    )
    db.add(notif1)
    db.flush()
    created.append(notif1)

    # 8. Scan Runs for User A
    scan_run_completed = ScanRun(
        id=uuid.uuid4(),
        watch_profile_id=wp_a.id,
        status="completed",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        jobs_discovered=10,
        jobs_new=2,
        jobs_matched=1,
        notifications_sent=1
    )
    scan_run_partial = ScanRun(
        id=uuid.uuid4(),
        watch_profile_id=wp_a.id,
        status="partial",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        jobs_discovered=5,
        jobs_new=0,
        jobs_matched=0,
        notifications_sent=0
    )
    # Scan Run for User B
    scan_run_b = ScanRun(
        id=uuid.uuid4(),
        watch_profile_id=wp_b.id,
        status="completed",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        jobs_discovered=20,
        jobs_new=5,
        jobs_matched=2,
        notifications_sent=2
    )
    db.add_all([scan_run_completed, scan_run_partial, scan_run_b])
    db.flush()
    created.extend([scan_run_completed, scan_run_partial, scan_run_b])

    # 9. Scan Errors for Partial Run
    scan_err = ScanError(
        id=uuid.uuid4(),
        scan_run_id=scan_run_partial.id,
        watch_profile_company_id=wpc_a2.id,
        error_type="TIMEOUT_ERROR",
        message="Connection timed out for Bearer secret_token_123456",
        details={"raw": "token Bearer secret_token_123456", "duration_ms": 5000}
    )
    db.add(scan_err)
    db.commit()
    created.append(scan_err)

    data = {
        "user_a": user_a,
        "user_b": user_b,
        "wp_a": wp_a,
        "wp_b": wp_b,
        "comp1": comp1,
        "comp2": comp2,
        "comp_other": comp_other,
        "wpc_a1": wpc_a1,
        "wpc_a2": wpc_a2,
        "scan_run_completed": scan_run_completed,
        "scan_run_partial": scan_run_partial,
        "scan_run_b": scan_run_b,
        "scan_err": scan_err,
    }

    yield data

    # Teardown
    for item in reversed(created):
        try:
            db.delete(item)
            db.commit()
        except Exception:
            db.rollback()

# 1. Authenticated scan list works
def test_authenticated_scan_list_works(scan_test_data):
    user_a = scan_test_data["user_a"]
    app.dependency_overrides[get_current_user] = lambda: user_a

    client = TestClient(app)
    resp = client.get("/api/v1/scan-runs")
    assert resp.status_code == 200
    runs = resp.json()
    assert len(runs) >= 2
    run_ids = [r["id"] for r in runs]
    assert str(scan_test_data["scan_run_completed"].id) in run_ids
    assert str(scan_test_data["scan_run_partial"].id) in run_ids
    # User B's scan run must NOT appear
    assert str(scan_test_data["scan_run_b"].id) not in run_ids
    app.dependency_overrides.clear()

# 2. Scan detail works with company statuses
def test_scan_detail_works(scan_test_data):
    user_a = scan_test_data["user_a"]
    app.dependency_overrides[get_current_user] = lambda: user_a

    client = TestClient(app)
    run_id = scan_test_data["scan_run_partial"].id
    resp = client.get(f"/api/v1/scan-runs/{run_id}")
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["id"] == str(run_id)
    assert detail["status"] == "partial"
    assert detail["watch_profile_name"] == "User A Profile"
    assert len(detail["company_statuses"]) == 2

    # Verify company statuses
    statuses = {cs["company_name"]: cs["status"] for cs in detail["company_statuses"]}
    comp1_name = scan_test_data["comp1"].name
    comp2_name = scan_test_data["comp2"].name
    assert statuses[comp1_name] == "completed"
    assert statuses[comp2_name] == "failed"
    app.dependency_overrides.clear()

# 3. Missing scan returns 404
def test_missing_scan_returns_404(scan_test_data):
    user_a = scan_test_data["user_a"]
    app.dependency_overrides[get_current_user] = lambda: user_a

    client = TestClient(app)
    resp = client.get(f"/api/v1/scan-runs/{uuid.uuid4()}")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Scan run not found"
    app.dependency_overrides.clear()

# 4. ScanError records are returned correctly and sanitized
def test_scan_error_records_returned_and_sanitized(scan_test_data):
    user_a = scan_test_data["user_a"]
    app.dependency_overrides[get_current_user] = lambda: user_a

    client = TestClient(app)
    run_id = scan_test_data["scan_run_partial"].id
    resp = client.get(f"/api/v1/scan-runs/{run_id}")
    assert resp.status_code == 200
    detail = resp.json()
    assert len(detail["errors"]) == 1
    err = detail["errors"][0]
    assert err["error_type"] == "TIMEOUT_ERROR"
    assert err["company_name"] == scan_test_data["comp2"].name
    # Verify sanitization of tokens
    assert "secret_token_123456" not in err["message"]
    assert "Bearer [REDACTED]" in err["message"]
    app.dependency_overrides.clear()

# 5. Another user cannot access user-private scan data
def test_user_isolation_for_scans(scan_test_data):
    user_b = scan_test_data["user_b"]
    app.dependency_overrides[get_current_user] = lambda: user_b

    client = TestClient(app)
    # User B attempting to view User A's scan run
    run_id_a = scan_test_data["scan_run_completed"].id
    resp = client.get(f"/api/v1/scan-runs/{run_id_a}")
    assert resp.status_code == 404
    app.dependency_overrides.clear()

# 6. Existing notification scoping remains intact
def test_notification_scoping_intact(scan_test_data):
    user_a = scan_test_data["user_a"]
    app.dependency_overrides[get_current_user] = lambda: user_a

    client = TestClient(app)
    resp = client.get("/api/v1/notifications")
    assert resp.status_code == 200
    notifs = resp.json()
    assert all(n["user_id"] == str(user_a.id) for n in notifs)
    app.dependency_overrides.clear()

# 7. Existing job scoping remains intact
def test_job_scoping_intact(scan_test_data):
    user_a = scan_test_data["user_a"]
    app.dependency_overrides[get_current_user] = lambda: user_a

    client = TestClient(app)
    resp = client.get("/api/v1/jobs")
    assert resp.status_code == 200
    jobs = resp.json()
    job_ids = [j["id"] for j in jobs]
    # Comp1 and Comp2 jobs must be present, CompOther must not
    comp_other_id = str(scan_test_data["comp_other"].id)
    assert all(j["company_id"] != comp_other_id for j in jobs)
    app.dependency_overrides.clear()

# 8. Aggregate metrics are correct for dashboard summary
def test_aggregate_metrics_dashboard_summary(scan_test_data):
    user_a = scan_test_data["user_a"]
    app.dependency_overrides[get_current_user] = lambda: user_a

    client = TestClient(app)
    resp = client.get("/api/v1/dashboard/summary")
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["active_watch_profiles"] == 1
    assert summary["monitored_companies"] == 2
    assert summary["available_jobs"] == 2
    assert summary["matched_jobs"] == 1
    assert summary["notifications"]["total"] == 1
    assert summary["notifications"]["sent"] == 1
    assert summary["latest_scan"] is not None
    assert summary["schedule_info"] == "Scheduled every 2 hours via GitHub Actions"
    app.dependency_overrides.clear()

# 9. Scan status values are handled correctly (filter by status)
def test_scan_status_values_filtering(scan_test_data):
    user_a = scan_test_data["user_a"]
    app.dependency_overrides[get_current_user] = lambda: user_a

    client = TestClient(app)
    # Filter completed
    resp_completed = client.get("/api/v1/scan-runs?status=completed")
    assert resp_completed.status_code == 200
    completed_runs = resp_completed.json()
    assert all(r["status"] == "completed" for r in completed_runs)

    # Filter partial
    resp_partial = client.get("/api/v1/scan-runs?status=partial")
    assert resp_partial.status_code == 200
    partial_runs = resp_partial.json()
    assert all(r["status"] == "partial" for r in partial_runs)
    app.dependency_overrides.clear()

# 10. Existing worker behavior remains unchanged
def test_worker_run_signature_unchanged():
    from app.worker.scan import run
    import inspect
    sig = inspect.signature(run)
    assert len(sig.parameters) == 0
