import pytest
from unittest.mock import MagicMock
from app.services.notifications.interfaces import NotificationDeliveryResult
from app.services.notifications.message_builder import build_job_match_message
from app.db.models.job import Job
from app.db.models.company import Company
from app.db.models.job_match import JobMatch
from app.services.notifications.telegram import TelegramNotificationProvider
import httpx

def test_message_builder_complete():
    job = Job(
        title="Software Engineer",
        location="Remote",
        job_type="FullTime",
        source="greenhouse",
        apply_url="https://apply.com",
        source_url="https://source.com"
    )
    company = Company(name="Test Co")
    job_match = JobMatch(match_reason="Matched all requirements")
    
    msg = build_job_match_message(job, company, job_match)
    
    assert "Company: Test Co" in msg
    assert "Role: Software Engineer" in msg
    assert "Location: Remote" in msg
    assert "Type: FullTime" in msg
    assert "Matched all requirements" in msg
    assert "https://apply.com" in msg
    assert "Source:\ngreenhouse" in msg

def test_message_builder_missing_fields():
    job = Job(
        title="Software Engineer",
        location=None,
        job_type=None,
        source=None,
        apply_url=None,
        source_url="https://source.com"
    )
    company = Company(name="Test Co")
    job_match = JobMatch(match_reason=None)
    
    msg = build_job_match_message(job, company, job_match)
    
    assert "Location: Not specified" in msg
    assert "Type: Not specified" in msg
    assert "Source:\nUnknown" in msg
    assert "https://source.com" in msg # fallback
    assert "Matched" in msg # fallback reason

def test_telegram_provider_success(mocker):
    mock_post = mocker.patch("httpx.Client.post")
    mock_response = MagicMock()
    mock_response.json.return_value = {"ok": True}
    mock_response.raise_for_status.return_value = None
    mock_post.return_value = mock_response

    provider = TelegramNotificationProvider(token="fake_token")
    result = provider.send("12345", "Hello")
    
    assert result.success is True
    assert result.error is None
    
    # Assert called correctly
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert "fake_token" in args[0]
    assert kwargs["json"]["chat_id"] == "12345"
    assert kwargs["json"]["text"] == "Hello"

def test_telegram_provider_api_error(mocker):
    mock_post = mocker.patch("httpx.Client.post")
    mock_response = MagicMock()
    mock_response.json.return_value = {"ok": False, "description": "Bad Request: chat not found"}
    mock_response.raise_for_status.return_value = None
    mock_post.return_value = mock_response

    provider = TelegramNotificationProvider(token="fake_token")
    result = provider.send("12345", "Hello")
    
    assert result.success is False
    assert result.error == "Bad Request: chat not found"

def test_telegram_provider_http_error(mocker):
    mock_post = mocker.patch("httpx.Client.post")
    mock_post.side_effect = httpx.HTTPStatusError("Error", request=MagicMock(), response=MagicMock(status_code=401))

    provider = TelegramNotificationProvider(token="fake_token")
    result = provider.send("12345", "Hello")
    
    assert result.success is False
    assert "HTTP 401" in result.error

def test_telegram_provider_timeout(mocker):
    mock_post = mocker.patch("httpx.Client.post")
    mock_post.side_effect = httpx.TimeoutException("Timeout")

    provider = TelegramNotificationProvider(token="fake_token")
    result = provider.send("12345", "Hello")
    
    assert result.success is False
    assert result.error == "Timeout"

def test_telegram_provider_invalid_json(mocker):
    mock_post = mocker.patch("httpx.Client.post")
    mock_response = MagicMock()
    mock_response.json.side_effect = ValueError("Invalid JSON")
    mock_response.raise_for_status.return_value = None
    mock_post.return_value = mock_response

    provider = TelegramNotificationProvider(token="fake_token")
    result = provider.send("12345", "Hello")
    
    assert result.success is False
    assert result.error == "Invalid JSON response"

from app.services.notifications.notification_service import NotificationService

def test_notification_service_matched_false(mocker):
    provider_mock = MagicMock()
    service = NotificationService(provider=provider_mock)
    
    db_mock = MagicMock()
    job_match_mock = MagicMock()
    job_match_mock.matched = False
    
    db_mock.execute.return_value.scalars.return_value.first.return_value = job_match_mock
    
    result = service.send_job_match_notification(db_mock, "user_id", "job_match_id")
    
    assert result is None
    provider_mock.send.assert_not_called()

def test_notification_service_already_sent(mocker):
    provider_mock = MagicMock()
    service = NotificationService(provider=provider_mock)
    
    db_mock = MagicMock()
    
    job_match_mock = MagicMock()
    job_match_mock.matched = True
    job_match_mock.watch_profile_id = "profile_id"
    job_match_mock.job.id = "job_id"
    job_match_mock.job.company_id = "company_id"
    
    user_mock = MagicMock()
    user_mock.id = "user_id"
    user_mock.telegram_chat_id = "123"
    
    profile_mock = MagicMock()
    profile_mock.id = "profile_id"
    profile_mock.user_id = "user_id"
    
    company_mock = MagicMock()
    
    existing_notification = MagicMock()
    existing_notification.status = "sent"
    
    db_mock.execute.return_value.scalars.return_value.first.side_effect = [
        job_match_mock,
        user_mock,
        profile_mock,
        company_mock,
        existing_notification
    ]
    
    result = service.send_job_match_notification(db_mock, "user_id", "job_match_id")
    
    assert result == existing_notification
    provider_mock.send.assert_not_called()
