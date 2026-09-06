import pytest
import os
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.company import Company
from app.db.models.job import Job
from app.schemas.job import DiscoveredJob
from app.services.jobs.job_service import create_or_get_job
from app.services.jobs.deduplication import generate_fingerprint

from app.core.config import settings

# These tests run only if DATABASE_URL is present and pointing to a real test/dev db.
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
def company(db):
    slug = f"test-company-{uuid.uuid4().hex[:8]}"
    company = Company(
        name="Test Integration Company",
        slug=slug,
        website_url="https://example.com"
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company

def test_first_seen_and_last_seen_behavior(db: Session, company: Company):
    # Crawl 1
    discovered = DiscoveredJob(
        source="greenhouse",
        external_id="ext-1",
        title="Backend Developer",
        location="Remote",
        apply_url="https://example.com/apply/1",
        source_url="https://example.com/job/1"
    )
    
    job1, is_new1 = create_or_get_job(db, company.id, discovered)
    assert is_new1 is True
    assert job1.first_seen_at is not None
    assert job1.last_seen_at is not None
    assert job1.first_seen_at == job1.last_seen_at
    
    t1 = job1.first_seen_at
    
    # Simulate time passing by manually hacking last_seen_at backwards in time 
    # to prove the next update changes it.
    old_time = t1 - timedelta(days=1)
    job1.last_seen_at = old_time
    db.commit()
    
    # Crawl 2
    job2, is_new2 = create_or_get_job(db, company.id, discovered)
    assert is_new2 is False
    assert job2.id == job1.id
    assert job2.first_seen_at == t1
    assert job2.last_seen_at > old_time

def test_mutable_fields_update(db: Session, company: Company):
    discovered = DiscoveredJob(
        source="greenhouse",
        external_id="ext-mutable",
        title="Original Title",
        description="Original Desc"
    )
    
    job1, _ = create_or_get_job(db, company.id, discovered)
    original_id = job1.id
    
    # Change description and title (but identity/external_id remains same)
    discovered.title = "Updated Title"
    discovered.description = "Updated Desc"
    
    job2, is_new2 = create_or_get_job(db, company.id, discovered)
    assert is_new2 is False
    assert job2.id == original_id
    assert job2.title == "Updated Title"
    assert job2.description == "Updated Desc"

def test_deduplication_without_external_id(db: Session, company: Company):
    discovered1 = DiscoveredJob(
        source="lever",
        title="  Staff Engineer  ",
        location="  London  ",
        apply_url="https://lever.co/staff"
    )
    
    job1, is_new1 = create_or_get_job(db, company.id, discovered1)
    assert is_new1 is True
    
    # Simulate identical job but cleaner whitespace (different raw data, same logical data)
    discovered2 = DiscoveredJob(
        source="lever",
        title="Staff Engineer",
        location="London",
        apply_url="https://lever.co/staff"
    )
    
    job2, is_new2 = create_or_get_job(db, company.id, discovered2)
    assert is_new2 is False
    assert job2.id == job1.id
    assert job2.fingerprint == job1.fingerprint

def test_cross_source_independence(db: Session, company: Company):
    discovered_gh = DiscoveredJob(
        source="greenhouse",
        title="Software Engineer",
        location="Bangalore",
        apply_url="https://apply.com/gh"
    )
    
    discovered_lv = DiscoveredJob(
        source="lever",
        title="Software Engineer",
        location="Bangalore",
        apply_url="https://apply.com/lv"
    )
    
    job_gh, is_new_gh = create_or_get_job(db, company.id, discovered_gh)
    job_lv, is_new_lv = create_or_get_job(db, company.id, discovered_lv)
    
    assert is_new_gh is True
    assert is_new_lv is True
    assert job_gh.id != job_lv.id
    assert job_gh.source == "greenhouse"
    assert job_lv.source == "lever"
