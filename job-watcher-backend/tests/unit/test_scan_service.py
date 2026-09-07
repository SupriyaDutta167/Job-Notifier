import pytest
import uuid
from unittest.mock import MagicMock
from app.services.scanning.scan_service import ScanService, ScanResult
from app.db.models.watch_profile import WatchProfile
from app.db.models.watch_profile_company import WatchProfileCompany
from app.db.models.scan_run import ScanRun
from app.db.models.job_match import JobMatch
from app.db.models.notification import Notification

def test_scan_service_success(mocker):
    # Mock persistence pipeline
    mock_run_persistence = mocker.patch("app.services.scanning.scan_service.run_persistence_pipeline")
    mock_persist_res = MagicMock()
    mock_persist_res.crawler_success = True
    mock_persist_res.jobs_processed = 5
    mock_persist_res.new_jobs = 2
    mock_persist_res.new_job_ids = [uuid.uuid4(), uuid.uuid4()]
    mock_run_persistence.return_value = mock_persist_res
    
    # Mock MatchService
    mock_match_service = MagicMock()
    mock_job_match1 = MagicMock(matched=True, id=uuid.uuid4())
    mock_job_match2 = MagicMock(matched=False, id=uuid.uuid4())
    mock_match_service.evaluate_job_for_profile.side_effect = [
        mock_job_match1, mock_job_match2,
        mock_job_match1, mock_job_match2
    ]
    
    # Mock NotificationService
    mock_notification_service = MagicMock()
    mock_notification = MagicMock(status="sent")
    mock_notification_service.send_job_match_notification.return_value = mock_notification
    
    # Mock DB
    mock_db = MagicMock()
    
    # Return 1 WatchProfile
    mock_profile = MagicMock(id=uuid.uuid4(), user_id=uuid.uuid4(), is_active=True)
    # Return 2 WatchProfileCompanies
    mock_wp_company1 = MagicMock(id=uuid.uuid4(), company_id=uuid.uuid4(), career_url="url1", watch_profile_id=mock_profile.id, is_active=True)
    mock_wp_company2 = MagicMock(id=uuid.uuid4(), company_id=uuid.uuid4(), career_url="url2", watch_profile_id=mock_profile.id, is_active=True)
    
    mock_db.execute.return_value.scalars.return_value.first.return_value = mock_profile
    mock_db.execute.return_value.scalars.return_value.all.return_value = [mock_wp_company1, mock_wp_company2]
    
    service = ScanService(match_service=mock_match_service, notification_service=mock_notification_service)
    
    result = service.run_scan_for_profile(mock_db, mock_profile.id)
    
    assert result.status == "completed"
    assert result.profiles_scanned == 1
    assert result.career_urls_scanned == 2
    assert result.jobs_discovered == 10  # 5 * 2 companies
    assert result.jobs_new == 4          # 2 * 2 companies
    assert result.jobs_matched == 2      # matched=True is returned once per company
    assert result.notifications_sent == 2 # 1 per matched job
    
    # Verify mock calls
    assert mock_run_persistence.call_count == 2
    assert mock_match_service.evaluate_job_for_profile.call_count == 4
    assert mock_notification_service.send_job_match_notification.call_count == 2
    
def test_scan_service_crawler_failure(mocker):
    # Mock persistence pipeline
    mock_run_persistence = mocker.patch("app.services.scanning.scan_service.run_persistence_pipeline")
    mock_persist_res_success = MagicMock(crawler_success=True, jobs_processed=1, new_jobs=0, new_job_ids=[])
    mock_persist_res_fail = MagicMock(crawler_success=False, errors=["Timeout"])
    # Return fail for 1st, success for 2nd
    mock_run_persistence.side_effect = [mock_persist_res_fail, mock_persist_res_success]
    
    mock_match_service = MagicMock()
    mock_notification_service = MagicMock()
    
    mock_db = MagicMock()
    mock_profile = MagicMock(id=uuid.uuid4(), user_id=uuid.uuid4(), is_active=True)
    mock_wp_company1 = MagicMock(id=uuid.uuid4())
    mock_wp_company2 = MagicMock(id=uuid.uuid4())
    mock_db.execute.return_value.scalars.return_value.first.return_value = mock_profile
    mock_db.execute.return_value.scalars.return_value.all.return_value = [mock_wp_company1, mock_wp_company2]
    
    service = ScanService(match_service=mock_match_service, notification_service=mock_notification_service)
    result = service.run_scan_for_profile(mock_db, mock_profile.id)
    
    assert result.status == "partial"
    assert result.career_urls_scanned == 2
    assert result.errors == 1
    assert mock_run_persistence.call_count == 2
    
def test_scan_service_no_new_jobs(mocker):
    mock_run_persistence = mocker.patch("app.services.scanning.scan_service.run_persistence_pipeline")
    mock_persist_res = MagicMock(crawler_success=True, jobs_processed=10, new_jobs=0, new_job_ids=[])
    mock_run_persistence.return_value = mock_persist_res
    
    mock_match_service = MagicMock()
    mock_notification_service = MagicMock()
    
    mock_db = MagicMock()
    mock_profile = MagicMock()
    mock_wp_company = MagicMock()
    mock_db.execute.return_value.scalars.return_value.first.return_value = mock_profile
    mock_db.execute.return_value.scalars.return_value.all.return_value = [mock_wp_company]
    
    service = ScanService(match_service=mock_match_service, notification_service=mock_notification_service)
    result = service.run_scan_for_profile(mock_db, mock_profile.id)
    
    assert result.status == "completed"
    assert result.jobs_discovered == 10
    assert result.jobs_new == 0
    # Assert Matching and Notify never called
    mock_match_service.evaluate_job_for_profile.assert_not_called()
    mock_notification_service.send_job_match_notification.assert_not_called()

def test_scan_service_fatal_error(mocker):
    mock_db = MagicMock()
    mock_db.execute.side_effect = Exception("DB disconnected")
    
    mock_match_service = MagicMock()
    mock_notification_service = MagicMock()
    
    service = ScanService(match_service=mock_match_service, notification_service=mock_notification_service)
    result = service.run_scan_for_profile(mock_db, uuid.uuid4())
    
    assert result.status == "failed"
    assert result.errors == 1
