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
from app.services.jobs.job_service import list_jobs, get_job
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
def scoped_data(db: Session):
    # Track created objects for cleanup
    created = []

    # 1. Create User A
    user_a = User(id=uuid.uuid4(), auth_user_id=uuid.uuid4(), email=f"user-a-{uuid.uuid4().hex[:8]}@example.com")
    db.add(user_a)
    created.append(user_a)
    
    # 2. Create User B
    user_b = User(id=uuid.uuid4(), auth_user_id=uuid.uuid4(), email=f"user-b-{uuid.uuid4().hex[:8]}@example.com")
    db.add(user_b)
    created.append(user_b)
    
    # 3. Create Company NVIDIA
    nvidia_name = f"NVIDIA-{uuid.uuid4().hex[:8]}"
    nvidia = Company(id=uuid.uuid4(), name=nvidia_name, slug=nvidia_name.lower())
    db.add(nvidia)
    created.append(nvidia)

    # 4. Create Company Amazon
    amazon_name = f"Amazon-{uuid.uuid4().hex[:8]}"
    amazon = Company(id=uuid.uuid4(), name=amazon_name, slug=amazon_name.lower())
    db.add(amazon)
    created.append(amazon)
    
    # 5. Create Company Figma
    figma_name = f"Figma-{uuid.uuid4().hex[:8]}"
    figma = Company(id=uuid.uuid4(), name=figma_name, slug=figma_name.lower())
    db.add(figma)
    created.append(figma)
    
    db.flush()

    # 6. Create Jobs for NVIDIA, Amazon, and Figma
    nvidia_job = Job(
        id=uuid.uuid4(), company_id=nvidia.id, title="AI Engineer", 
        source="workday", fingerprint=f"nvidia-{uuid.uuid4().hex[:8]}", is_active=True
    )
    db.add(nvidia_job)
    created.append(nvidia_job)

    amazon_job = Job(
        id=uuid.uuid4(), company_id=amazon.id, title="Software Development Engineer", 
        source="generic_html", fingerprint=f"amazon-{uuid.uuid4().hex[:8]}", is_active=True
    )
    db.add(amazon_job)
    created.append(amazon_job)
    
    figma_job = Job(
        id=uuid.uuid4(), company_id=figma.id, title="Product Designer", 
        source="greenhouse", fingerprint=f"figma-{uuid.uuid4().hex[:8]}", is_active=True
    )
    db.add(figma_job)
    created.append(figma_job)
    
    db.flush()

    # 7. User A monitors NVIDIA
    profile_a = WatchProfile(id=uuid.uuid4(), user_id=user_a.id, name="Profile A", is_active=True)
    db.add(profile_a)
    created.append(profile_a)
    db.flush()
    wpc_a_nvidia = WatchProfileCompany(id=uuid.uuid4(), watch_profile_id=profile_a.id, company_id=nvidia.id, is_active=True, career_url="https://nvidia.com")
    db.add(wpc_a_nvidia)
    created.append(wpc_a_nvidia)
    
    # 8. User B monitors Figma
    profile_b = WatchProfile(id=uuid.uuid4(), user_id=user_b.id, name="Profile B", is_active=True)
    db.add(profile_b)
    created.append(profile_b)
    db.flush()
    wpc_b_figma = WatchProfileCompany(id=uuid.uuid4(), watch_profile_id=profile_b.id, company_id=figma.id, is_active=True, career_url="https://figma.com")
    db.add(wpc_b_figma)
    created.append(wpc_b_figma)
    
    db.commit()
    
    yield {
        "user_a": user_a,
        "user_b": user_b,
        "nvidia": nvidia,
        "amazon": amazon,
        "figma": figma,
        "nvidia_job": nvidia_job,
        "amazon_job": amazon_job,
        "figma_job": figma_job,
        "profile_a": profile_a,
        "profile_b": profile_b,
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


# Test 1: User A monitors NVIDIA. NVIDIA job exists. GET /api/v1/jobs for User A returns NVIDIA job.
def test_1_user_a_monitors_nvidia_returns_nvidia_job(db: Session, scoped_data: dict):
    user_a = scoped_data["user_a"]
    nvidia_job = scoped_data["nvidia_job"]
    
    jobs = list_jobs(db, user_id=user_a.id)
    job_ids = [j.id for j in jobs]
    assert nvidia_job.id in job_ids

    # Also test via HTTP API endpoint
    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        response = client.get("/api/v1/jobs")
        assert response.status_code == 200
        data = response.json()
        returned_ids = [j["id"] for j in data]
        assert str(nvidia_job.id) in returned_ids
    finally:
        app.dependency_overrides.clear()


# Test 2: User A monitors NVIDIA. Amazon job exists. User A does NOT monitor Amazon. Amazon job is not returned.
def test_2_user_a_does_not_monitor_amazon_job_not_returned(db: Session, scoped_data: dict):
    user_a = scoped_data["user_a"]
    amazon_job = scoped_data["amazon_job"]
    
    jobs = list_jobs(db, user_id=user_a.id)
    job_ids = [j.id for j in jobs]
    assert amazon_job.id not in job_ids

    # Also test via HTTP API endpoint
    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        response = client.get("/api/v1/jobs")
        assert response.status_code == 200
        data = response.json()
        returned_ids = [j["id"] for j in data]
        assert str(amazon_job.id) not in returned_ids
    finally:
        app.dependency_overrides.clear()


# Test 3: User A monitors NVIDIA + Amazon. Both jobs are returned.
def test_3_user_a_monitors_nvidia_and_amazon_both_returned(db: Session, scoped_data: dict):
    user_a = scoped_data["user_a"]
    amazon = scoped_data["amazon"]
    profile_a = scoped_data["profile_a"]
    nvidia_job = scoped_data["nvidia_job"]
    amazon_job = scoped_data["amazon_job"]
    
    # Add Amazon to User A's profile
    wpc_amazon = WatchProfileCompany(
        id=uuid.uuid4(), watch_profile_id=profile_a.id, company_id=amazon.id, is_active=True, career_url="https://amazon.jobs"
    )
    db.add(wpc_amazon)
    scoped_data["created"].append(wpc_amazon)
    db.commit()
    
    jobs = list_jobs(db, user_id=user_a.id)
    job_ids = [j.id for j in jobs]
    assert nvidia_job.id in job_ids
    assert amazon_job.id in job_ids

    # Also test via HTTP API endpoint
    app.dependency_overrides[get_current_user] = lambda: user_a
    client = TestClient(app)
    try:
        response = client.get("/api/v1/jobs")
        assert response.status_code == 200
        data = response.json()
        returned_ids = [j["id"] for j in data]
        assert str(nvidia_job.id) in returned_ids
        assert str(amazon_job.id) in returned_ids
    finally:
        app.dependency_overrides.clear()


# Test 4: User A has two profiles both monitoring NVIDIA. A NVIDIA job is returned only once.
def test_4_duplicate_monitoring_returns_job_only_once(db: Session, scoped_data: dict):
    user_a = scoped_data["user_a"]
    nvidia = scoped_data["nvidia"]
    nvidia_job = scoped_data["nvidia_job"]
    
    # Add a second profile for User A also monitoring NVIDIA
    profile_a2 = WatchProfile(id=uuid.uuid4(), user_id=user_a.id, name="Profile A2", is_active=True)
    db.add(profile_a2)
    scoped_data["created"].append(profile_a2)
    db.flush()
    wpc_a2 = WatchProfileCompany(
        id=uuid.uuid4(), watch_profile_id=profile_a2.id, company_id=nvidia.id, is_active=True, career_url="https://nvidia.com/careers"
    )
    db.add(wpc_a2)
    scoped_data["created"].append(wpc_a2)
    db.commit()
    
    jobs = list_jobs(db, user_id=user_a.id)
    occurrences = sum(1 for j in jobs if j.id == nvidia_job.id)
    assert occurrences == 1


# Test 5: User B monitors Figma. User A cannot see Figma jobs.
def test_5_user_a_cannot_see_user_b_figma_jobs(db: Session, scoped_data: dict):
    user_a = scoped_data["user_a"]
    user_b = scoped_data["user_b"]
    figma_job = scoped_data["figma_job"]
    
    # User B CAN see Figma job
    jobs_b = list_jobs(db, user_id=user_b.id)
    assert figma_job.id in [j.id for j in jobs_b]
    
    # User A CANNOT see Figma job
    jobs_a = list_jobs(db, user_id=user_a.id)
    assert figma_job.id not in [j.id for j in jobs_a]
    
    # User A cannot GET individual Figma job either
    with pytest.raises(NotFoundError):
        get_job(db, job_id=figma_job.id, user_id=user_a.id)


# Test 6: User monitors a company with 0 jobs. API returns empty list without error, and watch profile includes the company.
def test_6_user_monitors_company_with_zero_jobs(db: Session, scoped_data: dict):
    # Create Company with 0 jobs
    empty_comp_name = f"ZeroJobsCo-{uuid.uuid4().hex[:8]}"
    empty_comp = Company(id=uuid.uuid4(), name=empty_comp_name, slug=empty_comp_name.lower())
    db.add(empty_comp)
    scoped_data["created"].append(empty_comp)
    
    # Create User C
    user_c = User(id=uuid.uuid4(), auth_user_id=uuid.uuid4(), email=f"user-c-{uuid.uuid4().hex[:8]}@example.com")
    db.add(user_c)
    scoped_data["created"].append(user_c)
    db.flush()
    
    # User C monitors empty_comp
    profile_c = WatchProfile(id=uuid.uuid4(), user_id=user_c.id, name="Profile C", is_active=True)
    db.add(profile_c)
    scoped_data["created"].append(profile_c)
    db.flush()
    
    wpc_c = WatchProfileCompany(
        id=uuid.uuid4(), watch_profile_id=profile_c.id, company_id=empty_comp.id, is_active=True, career_url="https://zerojobs.example.com"
    )
    db.add(wpc_c)
    scoped_data["created"].append(wpc_c)
    db.commit()
    
    # 1. list_jobs returns empty list without error
    jobs_c = list_jobs(db, user_id=user_c.id)
    assert jobs_c == []
    
    # 2. HTTP GET /api/v1/jobs returns 200 and []
    app.dependency_overrides[get_current_user] = lambda: user_c
    client = TestClient(app)
    try:
        res = client.get("/api/v1/jobs")
        assert res.status_code == 200
        assert res.json() == []
        
        # 3. HTTP GET /api/v1/watch-profiles returns profile with company included
        profiles_res = client.get("/api/v1/watch-profiles")
        assert profiles_res.status_code == 200
        profiles_data = profiles_res.json()
        assert len(profiles_data) == 1
        assert len(profiles_data[0]["companies"]) == 1
        assert profiles_data[0]["companies"][0]["company_id"] == str(empty_comp.id)
    finally:
        app.dependency_overrides.clear()
