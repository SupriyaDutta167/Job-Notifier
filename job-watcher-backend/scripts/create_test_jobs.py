import os

base_dir = r"D:\Chandigarh University\Hackathons\Job Notifier\job-watcher-backend"

test_content = """import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock
from sqlalchemy.exc import IntegrityError

from app.services.jobs.normalization import (
    clean_whitespace, normalize_title, normalize_location,
    normalize_job_type, normalize_url, normalize_description, normalize_source
)
from app.services.jobs.deduplication import generate_fingerprint
from app.services.jobs.job_service import create_or_get_job
from app.schemas.job import DiscoveredJob
from app.db.models.job import Job

def test_normalization():
    # Whitespace and title
    assert normalize_title("  Software \\n\\t Engineer  ") == "Software Engineer"
    
    # Location
    assert normalize_location(" Bangalore, India ") == "Bangalore, India"
    
    # Job type
    assert normalize_job_type(" Internship ") == "internship"
    
    # URL
    assert normalize_url("https://example.com/job/123/") == "https://example.com/job/123"
    assert normalize_url("https://example.com/?ref=abc") == "https://example.com/?ref=abc"
    
    # HTML description
    assert normalize_description("<p>Hello</p> <br/> <b>World</b>") == "Hello World"
    
    # Source
    assert normalize_source(" Greenhouse ") == "greenhouse"

def test_fingerprint_deterministic():
    company_id = uuid.uuid4()
    
    # Same logical input should produce same fingerprint
    fp1 = generate_fingerprint(company_id, "greenhouse", "Software Engineer", "Bangalore", "http://example.com/1")
    fp2 = generate_fingerprint(company_id, " GREENHOUSE ", "  Software Engineer  ", "  Bangalore  ", "http://example.com/1")
    assert fp1 == fp2
    
    # Different inputs should produce different fingerprints
    fp3 = generate_fingerprint(uuid.uuid4(), "greenhouse", "Software Engineer", "Bangalore", "http://example.com/1") # different company
    fp4 = generate_fingerprint(company_id, "greenhouse", "Data Engineer", "Bangalore", "http://example.com/1")
    assert fp1 != fp3
    assert fp1 != fp4

def test_create_or_get_job_is_new():
    mock_db = MagicMock()
    # Mock company exists
    mock_db.execute.return_value.scalars.return_value.first.side_effect = [
        MagicMock(), # Company exists
        None # Existing job not found
    ]
    
    company_id = uuid.uuid4()
    disc_job = DiscoveredJob(
        source="greenhouse",
        title="Software Engineer",
        location="Bangalore",
        apply_url="https://example.com/1"
    )
    
    job, is_new = create_or_get_job(mock_db, company_id, disc_job)
    
    assert is_new is True
    assert job.title == "Software Engineer"
    assert job.source == "greenhouse"
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

def test_create_or_get_job_is_existing():
    mock_db = MagicMock()
    
    existing_job = Job(
        id=uuid.uuid4(),
        first_seen_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc),
        title="Old Title"
    )
    
    # Mock company exists, then job exists
    mock_db.execute.return_value.scalars.return_value.first.side_effect = [
        MagicMock(), # Company exists
        existing_job # Existing job found
    ]
    
    company_id = uuid.uuid4()
    disc_job = DiscoveredJob(
        source="greenhouse",
        title="New Title",
        location="Bangalore",
        apply_url="https://example.com/1"
    )
    
    job, is_new = create_or_get_job(mock_db, company_id, disc_job)
    
    assert is_new is False
    assert job.id == existing_job.id
    assert job.title == "New Title" # Updates field opportunistically
    # Check that add was not called, only commit
    mock_db.add.assert_not_called()
    mock_db.commit.assert_called_once()

def test_create_or_get_job_concurrent_insert():
    mock_db = MagicMock()
    
    existing_job = Job(
        id=uuid.uuid4(),
        first_seen_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc)
    )
    
    # Side effects: Company exists, job not found (pre-check), commit fails (IntegrityError), job found (re-fetch)
    mock_db.execute.return_value.scalars.return_value.first.side_effect = [
        MagicMock(), # Company exists
        None, # Pre-check: Not found
        existing_job # Re-fetch: Found
    ]
    
    mock_db.commit.side_effect = [
        IntegrityError("statement", "params", "orig"), # Fails on insert
        None # Succeeds on update existing
    ]
    
    company_id = uuid.uuid4()
    disc_job = DiscoveredJob(
        source="greenhouse",
        title="Software Engineer"
    )
    
    job, is_new = create_or_get_job(mock_db, company_id, disc_job)
    
    assert is_new is False
    assert job.id == existing_job.id
    mock_db.rollback.assert_called_once() # Must rollback the failed transaction
"""

with open(os.path.join(base_dir, "tests/unit/test_jobs.py"), "w", encoding="utf-8") as f:
    f.write(test_content)

print("Created jobs test file")
