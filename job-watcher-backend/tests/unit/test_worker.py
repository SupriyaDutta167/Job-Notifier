import pytest
import sys
from unittest.mock import MagicMock
from app.worker.scan import run

def test_worker_success(mocker):
    # Mock dependencies
    mock_session = mocker.patch("app.worker.scan.SessionLocal")
    mock_db = MagicMock()
    mock_session.return_value = mock_db
    
    mock_match_service = mocker.patch("app.worker.scan.MatchService")
    mock_notification_service = mocker.patch("app.worker.scan.NotificationService")
    mock_scan_service = mocker.patch("app.worker.scan.ScanService")
    
    # Mock ScanService response
    mock_service_instance = MagicMock()
    mock_res = MagicMock()
    mock_res.status = "completed"
    mock_res.jobs_discovered = 10
    mock_res.jobs_new = 2
    mock_res.jobs_matched = 1
    mock_res.notifications_sent = 1
    mock_service_instance.run_scan_for_all_profiles.return_value = [mock_res]
    mock_scan_service.return_value = mock_service_instance
    
    # Catch sys.exit
    mock_exit = mocker.patch("sys.exit")
    
    run()
    
    mock_service_instance.run_scan_for_all_profiles.assert_called_once_with(mock_db)
    mock_db.close.assert_called_once()
    mock_exit.assert_called_once_with(0)

def test_worker_partial_success(mocker):
    mock_session = mocker.patch("app.worker.scan.SessionLocal")
    mock_db = MagicMock()
    mock_session.return_value = mock_db
    
    mocker.patch("app.worker.scan.MatchService")
    mocker.patch("app.worker.scan.NotificationService")
    mock_scan_service = mocker.patch("app.worker.scan.ScanService")
    
    mock_service_instance = MagicMock()
    mock_res = MagicMock()
    mock_res.status = "partial"
    mock_res.jobs_discovered = 5
    mock_res.jobs_new = 0
    mock_res.jobs_matched = 0
    mock_res.notifications_sent = 0
    mock_service_instance.run_scan_for_all_profiles.return_value = [mock_res]
    mock_scan_service.return_value = mock_service_instance
    
    mock_exit = mocker.patch("sys.exit")
    
    run()
    
    mock_db.close.assert_called_once()
    mock_exit.assert_called_once_with(0)

def test_worker_fatal_failure(mocker):
    mock_session = mocker.patch("app.worker.scan.SessionLocal")
    mock_db = MagicMock()
    mock_session.return_value = mock_db
    
    mocker.patch("app.worker.scan.MatchService")
    mocker.patch("app.worker.scan.NotificationService")
    mock_scan_service = mocker.patch("app.worker.scan.ScanService")
    
    mock_service_instance = MagicMock()
    mock_res = MagicMock()
    mock_res.status = "failed"
    mock_res.jobs_discovered = 0
    mock_res.jobs_new = 0
    mock_res.jobs_matched = 0
    mock_res.notifications_sent = 0
    mock_service_instance.run_scan_for_all_profiles.return_value = [mock_res]
    mock_scan_service.return_value = mock_service_instance
    
    mock_exit = mocker.patch("sys.exit")
    
    run()
    
    mock_db.close.assert_called_once()
    mock_exit.assert_called_once_with(1)

def test_worker_unhandled_exception(mocker):
    mock_session = mocker.patch("app.worker.scan.SessionLocal")
    mock_db = MagicMock()
    mock_session.return_value = mock_db
    
    mocker.patch("app.worker.scan.ScanService", side_effect=Exception("Unexpected DB drop"))
    
    mock_exit = mocker.patch("sys.exit")
    
    run()
    
    mock_db.close.assert_called_once()
    mock_exit.assert_called_once_with(1)
