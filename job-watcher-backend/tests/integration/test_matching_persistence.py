import pytest
import os
import uuid
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.company import Company
from app.db.models.job import Job
from app.db.models.watch_profile import WatchProfile
from app.db.models.watch_rule import WatchRule
from app.db.models.job_match import JobMatch
from app.db.models.user import User
from app.services.matching.match_service import MatchService
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
        email=f"test-match-{uuid.uuid4().hex[:8]}@example.com"
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

@pytest.fixture
def company(db):
    c = Company(
        name="Test Matching Company",
        slug=f"test-match-{uuid.uuid4().hex[:8]}",
        website_url="https://example.com"
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

@pytest.fixture
def watch_profile(db, user):
    wp = WatchProfile(
        user_id=user.id,
        name="Test Match Profile"
    )
    db.add(wp)
    db.commit()
    db.refresh(wp)
    return wp

def test_match_creation_and_update(db: Session, user: User, company: Company, watch_profile: WatchProfile):
    # 1. Setup Rule
    rule = WatchRule(
        watch_profile_id=watch_profile.id,
        job_type="internship",
        role_keywords=["software engineer"],
        location_keywords=[],
        include_keywords=[],
        exclude_keywords=[]
    )
    db.add(rule)
    db.commit()
    
    # 2. Setup Job
    job = Job(
        company_id=company.id,
        source="test",
        title="Software Engineer Intern",
        location="Remote",
        job_type="Internship",
        fingerprint=uuid.uuid4().hex,
        is_active=True
    )
    db.add(job)
    db.commit()
    
    match_service = MatchService()
    
    # 3. Evaluate Match
    match_record = match_service.evaluate_job_for_profile(db, user.id, job.id, watch_profile.id)
    
    assert match_record is not None
    assert match_record.matched is True
    assert "Matched" in match_record.match_reason
    
    # 4. Update Rule to cause rejection
    rule.job_type = "full-time"
    db.commit()
    
    # 5. Re-evaluate
    match_record_updated = match_service.evaluate_job_for_profile(db, user.id, job.id, watch_profile.id)
    
    assert match_record_updated.id == match_record.id # IDEMPOTENT, same record!
    assert match_record_updated.matched is False # Flips to false!
    assert "Rejected because job type" in match_record_updated.match_reason

def test_ownership_boundaries(db: Session, user: User, company: Company, watch_profile: WatchProfile):
    # Create another user
    other_user = User(
        email=f"other-{uuid.uuid4().hex[:8]}@example.com"
    )
    db.add(other_user)
    db.commit()
    
    job = Job(
        company_id=company.id,
        source="test",
        title="Software Engineer",
        fingerprint=uuid.uuid4().hex,
        is_active=True
    )
    db.add(job)
    db.commit()
    
    match_service = MatchService()
    
    from app.core.exceptions import ForbiddenError
    
    # Evaluating for a profile we do not own should raise ForbiddenError
    with pytest.raises(ForbiddenError):
        match_service.evaluate_job_for_profile(db, other_user.id, job.id, watch_profile.id)
