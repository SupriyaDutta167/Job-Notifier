import pytest
from sqlalchemy import MetaData
from app.db.base import Base
import app.db.models  # This triggers the imports

def test_models_metadata_has_expected_tables():
    """
    Test that the Base.metadata contains exactly the expected tables.
    """
    expected_tables = {
        "users",
        "companies",
        "watch_profiles",
        "watch_profile_companies",
        "watch_rules",
        "jobs",
        "job_matches",
        "notifications",
        "scan_runs",
        "scan_errors",
    }
    
    actual_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(actual_tables), f"Missing tables: {expected_tables - actual_tables}"
    assert actual_tables.issubset(expected_tables), f"Extra tables: {actual_tables - expected_tables}"

def test_all_models_can_be_imported():
    """
    Test that importing all models doesn't raise any exceptions (e.g. relationship configuration errors).
    """
    assert app.db.models.User
    assert app.db.models.Company
    assert app.db.models.WatchProfile
    assert app.db.models.WatchProfileCompany
    assert app.db.models.WatchRule
    assert app.db.models.Job
    assert app.db.models.JobMatch
    assert app.db.models.Notification
    assert app.db.models.ScanRun
    assert app.db.models.ScanError
