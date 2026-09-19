import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.core.auth.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.job import Job
from app.db.models.watch_profile import WatchProfile
from app.db.models.watch_profile_company import WatchProfileCompany
from app.db.models.job_match import JobMatch
from app.services.jobs.job_service import get_job_detail, get_job
from app.core.exceptions import NotFoundError
from app.core.config import settings

pytestmark = pytest.mark.skipif(
    not settings.DATABASE_URL,
    reason="DATABASE_URL not set, skipping integration tests"
)

from app.db.session import SessionLocal

@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def match_test_data(db: Session):
    created = []
    
    # 1. Create User A and User B
    user_a = User(id=uuid.uuid4(), auth_user_id=uuid.uuid4(), email=f"usera-{uuid.uuid4().hex[:8]}@example.com")
    user_b = User(id=uuid.uuid4(), auth_user_id=uuid.uuid4(), email=f"userb-{uuid.uuid4().hex[:8]}@example.com")
    db.add_all([user_a, user_b])
    created.extend([user_a, user_b])
    
    # 2. Create Companies: Shared Co (monitored by both) and Private Co (monitored only by User B)
    comp_shared_name = f"SharedCo-{uuid.uuid4().hex[:8]}"
    comp_shared = Company(id=uuid.uuid4(), name=comp_shared_name, slug=comp_shared_name.lower())
    
    comp_private_name = f"PrivateCo-{uuid.uuid4().hex[:8]}"
    comp_private = Company(id=uuid.uuid4(), name=comp_private_name, slug=comp_private_name.lower())
    
    db.add_all([comp_shared, comp_private])
    created.extend([comp_shared, comp_private])
    db.flush()
    
    # 3. Create Profiles
    # User A has Profile A1 (SDE Internship) and Profile A2 (Backend Engineer)
    profile_a1 = WatchProfile(id=uuid.uuid4(), user_id=user_a.id, name="SDE Internship", is_active=True)
    profile_a2 = WatchProfile(id=uuid.uuid4(), user_id=user_a.id, name="Backend Engineer", is_active=True)
    
    # User B has Profile B1 (Fullstack Lead)
    profile_b1 = WatchProfile(id=uuid.uuid4(), user_id=user_b.id, name="Fullstack Lead", is_active=True)
    
    db.add_all([profile_a1, profile_a2, profile_b1])
    created.extend([profile_a1, profile_a2, profile_b1])
    db.flush()
    
    # 4. User A monitors Shared Co via Profile A1 and A2
    wpc_a1 = WatchProfileCompany(
        id=uuid.uuid4(), watch_profile_id=profile_a1.id, company_id=comp_shared.id, is_active=True, career_url="https://shared.com/careers"
    )
    wpc_a2 = WatchProfileCompany(
        id=uuid.uuid4(), watch_profile_id=profile_a2.id, company_id=comp_shared.id, is_active=True, career_url="https://shared.com/careers"
    )
    
    # User B monitors Shared Co and Private Co via Profile B1
    wpc_b_shared = WatchProfileCompany(
        id=uuid.uuid4(), watch_profile_id=profile_b1.id, company_id=comp_shared.id, is_active=True, career_url="https://shared.com/careers"
    )
    wpc_b_priv = WatchProfileCompany(
        id=uuid.uuid4(), watch_profile_id=profile_b1.id, company_id=comp_private.id, is_active=True, career_url="https://private.com/careers"
    )
    db.add_all([wpc_a1, wpc_a2, wpc_b_shared, wpc_b_priv])
    created.extend([wpc_a1, wpc_a2, wpc_b_shared, wpc_b_priv])
    db.flush()
    
    # 5. Create Jobs:
    # Job 1: Shared Co job matching multiple profiles
    job_1 = Job(
        id=uuid.uuid4(), company_id=comp_shared.id, title="Senior Software Engineer",
        source="workday", fingerprint=f"fp-{uuid.uuid4().hex[:8]}", is_active=True,
        apply_url="https://shared.com/apply/1", description="Great backend software engineer role"
    )
    # Job 2: Private Co job (only accessible to User B)
    job_2 = Job(
        id=uuid.uuid4(), company_id=comp_private.id, title="Lead Architect",
        source="greenhouse", fingerprint=f"fp-{uuid.uuid4().hex[:8]}", is_active=True,
        apply_url="https://private.com/apply/2", description="Private role"
    )
    # Job 3: Shared Co job with NO matches for anyone
    job_3 = Job(
        id=uuid.uuid4(), company_id=comp_shared.id, title="Marketing Specialist",
        source="generic_html", fingerprint=f"fp-{uuid.uuid4().hex[:8]}", is_active=True,
        apply_url="https://shared.com/apply/3", description="Marketing job"
    )
    db.add_all([job_1, job_2, job_3])
    created.extend([job_1, job_2, job_3])
    db.flush()
    
    # 6. Create Matches for Job 1:
    # Profile A1 matches Job 1 with 87% score
    match_a1 = JobMatch(
        id=uuid.uuid4(), job_id=job_1.id, watch_profile_id=profile_a1.id,
        matched=True, score=0.87, match_reason="Matched role keyword 'software engineer', location keyword 'Bengaluru'. No excluded terms found."
    )
    # Profile A2 matches Job 1 with 72% score
    match_a2 = JobMatch(
        id=uuid.uuid4(), job_id=job_1.id, watch_profile_id=profile_a2.id,
        matched=True, score=0.72, match_reason="Matched role keyword 'software engineer'. No excluded terms found."
    )
    # Profile B1 matches Job 1 with 95% score (User B)
    match_b1 = JobMatch(
        id=uuid.uuid4(), job_id=job_1.id, watch_profile_id=profile_b1.id,
        matched=True, score=0.95, match_reason="Matched include keyword 'backend'. No excluded terms found."
    )
    db.add_all([match_a1, match_a2, match_b1])
    created.extend([match_a1, match_a2, match_b1])
    db.commit()
    
    yield {
        "user_a": user_a,
        "user_b": user_b,
        "job_1": job_1,
        "job_2": job_2,
        "job_3": job_3,
        "profile_a1": profile_a1,
        "profile_a2": profile_a2,
        "profile_b1": profile_b1,
        "match_a1": match_a1,
        "match_a2": match_a2,
        "match_b1": match_b1,
        "created": created
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


# Test 1: User A accesses Job 1 and receives matching information for both of User A's matching profiles
def test_user_a_receives_multi_profile_matches(db: Session, match_test_data: dict):
    user_a = match_test_data["user_a"]
    job_1 = match_test_data["job_1"]
    profile_a1 = match_test_data["profile_a1"]
    profile_a2 = match_test_data["profile_a2"]
    
    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        res = client.get(f"/api/v1/jobs/{job_1.id}")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == str(job_1.id)
        assert data["title"] == "Senior Software Engineer"
        assert len(data["matches"]) == 2
        
        # Matches sorted by score desc
        m0 = data["matches"][0]
        assert m0["watch_profile_id"] == str(profile_a1.id)
        assert m0["profile_name"] == "SDE Internship"
        assert m0["score"] == 0.87
        assert "software engineer" in m0["match_reason"]
        
        m1 = data["matches"][1]
        assert m1["watch_profile_id"] == str(profile_a2.id)
        assert m1["profile_name"] == "Backend Engineer"
        assert m1["score"] == 0.72
    finally:
        app.dependency_overrides.clear()


# Test 2: User A cannot receive User B's JobMatch (Security / Isolation)
def test_user_a_cannot_see_user_b_match(db: Session, match_test_data: dict):
    user_a = match_test_data["user_a"]
    job_1 = match_test_data["job_1"]
    match_b1 = match_test_data["match_b1"]
    profile_b1 = match_test_data["profile_b1"]
    
    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        res = client.get(f"/api/v1/jobs/{job_1.id}")
        assert res.status_code == 200
        data = res.json()
        match_ids = [m["id"] for m in data["matches"]]
        profile_ids = [m["watch_profile_id"] for m in data["matches"]]
        
        # Ensure User B's match and profile are completely absent
        assert str(match_b1.id) not in match_ids
        assert str(profile_b1.id) not in profile_ids
    finally:
        app.dependency_overrides.clear()


# Test 3: User B requests Job 1 and only receives User B's match
def test_user_b_only_sees_user_b_match(db: Session, match_test_data: dict):
    user_b = match_test_data["user_b"]
    job_1 = match_test_data["job_1"]
    match_b1 = match_test_data["match_b1"]
    profile_b1 = match_test_data["profile_b1"]
    profile_a1 = match_test_data["profile_a1"]
    
    app.dependency_overrides[get_current_user] = lambda: user_b
    client = TestClient(app)
    try:
        res = client.get(f"/api/v1/jobs/{job_1.id}")
        assert res.status_code == 200
        data = res.json()
        assert len(data["matches"]) == 1
        assert data["matches"][0]["id"] == str(match_b1.id)
        assert data["matches"][0]["watch_profile_id"] == str(profile_b1.id)
        assert data["matches"][0]["profile_name"] == "Fullstack Lead"
        assert data["matches"][0]["score"] == 0.95
        
        # User A's profiles not leaked
        profile_ids = [m["watch_profile_id"] for m in data["matches"]]
        assert str(profile_a1.id) not in profile_ids
    finally:
        app.dependency_overrides.clear()


# Test 4: Job with no match records returns empty match information
def test_job_with_no_matches_returns_empty_list(db: Session, match_test_data: dict):
    user_a = match_test_data["user_a"]
    job_3 = match_test_data["job_3"]
    
    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        res = client.get(f"/api/v1/jobs/{job_3.id}")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == str(job_3.id)
        assert data["matches"] == []
    finally:
        app.dependency_overrides.clear()


# Test 5: User cannot access a job from an unmonitored company (404 and no data leakage)
def test_user_cannot_access_unmonitored_company_job(db: Session, match_test_data: dict):
    user_a = match_test_data["user_a"]
    job_2 = match_test_data["job_2"]  # Monitored only by User B
    
    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        res = client.get(f"/api/v1/jobs/{job_2.id}")
        assert res.status_code == 404
        assert res.json()["detail"] == "Job not found"
    finally:
        app.dependency_overrides.clear()


# Test 6: Non-existent job returns 404
def test_nonexistent_job_returns_404(db: Session, match_test_data: dict):
    user_a = match_test_data["user_a"]
    fake_id = uuid.uuid4()
    
    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        res = client.get(f"/api/v1/jobs/{fake_id}")
        assert res.status_code == 404
    finally:
        app.dependency_overrides.clear()
