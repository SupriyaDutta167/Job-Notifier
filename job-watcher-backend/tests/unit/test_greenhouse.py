import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
import httpx
from app.services.crawler.adapters.greenhouse import GreenhouseAdapter
from app.services.crawler.adapters.base import CrawlerParseError

def test_extract_board_token():
    adapter = GreenhouseAdapter()
    
    # Standard URL
    assert adapter._extract_board_token("https://boards.greenhouse.io/figma") == "figma"
    assert adapter._extract_board_token("https://boards.greenhouse.io/figma/jobs") == "figma"
    
    # Embed URL
    assert adapter._extract_board_token("https://boards.greenhouse.io/embed/job_board?for=airbnb") == "airbnb"
    
    # Invalid
    with pytest.raises(CrawlerParseError):
        adapter._extract_board_token("https://boards.greenhouse.io/")

def test_discover_jobs_success(monkeypatch):
    mock_get = MagicMock()
    adapter = GreenhouseAdapter()
    company_id = uuid.uuid4()
    
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "jobs": [
            {
                "id": 12345,
                "title": "Software Engineer",
                "absolute_url": "https://boards.greenhouse.io/test/jobs/12345",
                "location": {"name": "Remote"},
                "content": "<p>Job Description</p>",
                "first_published": "2024-01-01T12:00:00Z"
            }
        ]
    }
    mock_get.return_value = mock_response
    
    monkeypatch.setattr(adapter.client, "get", mock_get)
    result = adapter.discover_jobs("https://boards.greenhouse.io/test", company_id)
    
    assert result.success is True
    assert result.source == "greenhouse"
    assert len(result.jobs) == 1
    job = result.jobs[0]
    assert job.title == "Software Engineer"
    assert job.external_id == "12345"
    assert job.location == "Remote"
    assert job.apply_url
    assert str(job.apply_url) == "https://boards.greenhouse.io/test/jobs/12345"
    assert job.posted_at == datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
    mock_get.assert_called_once_with("https://boards-api.greenhouse.io/v1/boards/test/jobs?content=true")

def test_discover_jobs_malformed_skipped(monkeypatch):
    mock_get = MagicMock()
    mock_get = MagicMock()
    adapter = GreenhouseAdapter()
    company_id = uuid.uuid4()
    
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "jobs": [
            {
                # Missing title
                "id": 1,
                "absolute_url": "https://test.com/1"
            },
            {
                # Missing absolute_url
                "id": 2,
                "title": "Missing URL Job"
            },
            {
                # Valid job
                "id": 3,
                "title": "Valid Job",
                "absolute_url": "https://test.com/3"
            }
        ]
    }
    mock_get.return_value = mock_response
    
    monkeypatch.setattr(adapter.client, "get", mock_get)
    result = adapter.discover_jobs("https://boards.greenhouse.io/test", company_id)
    
    assert result.success is True
    assert len(result.jobs) == 1
    assert result.jobs[0].title == "Valid Job"

def test_discover_jobs_http_error(monkeypatch):
    mock_get = MagicMock()
    mock_get = MagicMock()
    adapter = GreenhouseAdapter()
    company_id = uuid.uuid4()
    
    # Setup HTTPStatusError
    request = httpx.Request("GET", "https://test.com")
    response = httpx.Response(404, request=request)
    mock_get.side_effect = httpx.HTTPStatusError("Not Found", request=request, response=response)
    
    monkeypatch.setattr(adapter.client, "get", mock_get)
    result = adapter.discover_jobs("https://boards.greenhouse.io/test", company_id)
    
    assert result.success is False
    assert result.jobs == []
    assert "HTTP error 404" in result.error

def test_discover_jobs_timeout(monkeypatch):
    mock_get = MagicMock()
    mock_get = MagicMock()
    adapter = GreenhouseAdapter()
    company_id = uuid.uuid4()
    
    mock_get.side_effect = httpx.TimeoutException("Timeout")
    
    monkeypatch.setattr(adapter.client, "get", mock_get)
    result = adapter.discover_jobs("https://boards.greenhouse.io/test", company_id)
    
    assert result.success is False
    assert result.jobs == []
    assert "Timeout fetching" in result.error

def test_discover_jobs_invalid_json(monkeypatch):
    mock_get = MagicMock()
    mock_get = MagicMock()
    adapter = GreenhouseAdapter()
    company_id = uuid.uuid4()
    
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.side_effect = ValueError("Invalid JSON")
    mock_get.return_value = mock_response
    
    monkeypatch.setattr(adapter.client, "get", mock_get)
    result = adapter.discover_jobs("https://boards.greenhouse.io/test", company_id)
    
    assert result.success is False
    assert result.jobs == []
    assert "Failed to parse JSON" in result.error
