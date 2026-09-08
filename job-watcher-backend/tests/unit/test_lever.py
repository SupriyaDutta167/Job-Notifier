import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
import httpx
from app.services.crawler.adapters.lever import LeverAdapter
from app.services.crawler.adapters.base import CrawlerParseError

def test_extract_company_identifier():
    adapter = LeverAdapter()
    
    assert adapter._extract_company_identifier("https://jobs.lever.co/leverdemo") == "leverdemo"
    assert adapter._extract_company_identifier("https://jobs.lever.co/leverdemo/12345") == "leverdemo"
    
    with pytest.raises(CrawlerParseError):
        adapter._extract_company_identifier("https://jobs.lever.co/")

def test_discover_jobs_success(monkeypatch):
    mock_get = MagicMock()
    mock_get = MagicMock()
    adapter = LeverAdapter()
    company_id = uuid.uuid4()
    
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = [
        {
            "id": "abc-123",
            "text": "Software Engineer",
            "hostedUrl": "https://jobs.lever.co/test/abc-123",
            "applyUrl": "https://jobs.lever.co/test/abc-123/apply",
            "categories": {"location": "Remote"},
            "description": "<p>Intro</p>",
            "lists": [{"text": "Requirements", "content": "<ul><li>Python</li></ul>"}],
            "additional": "<p>Outro</p>",
            "createdAt": 1704067200000 # 2024-01-01 00:00:00 UTC
        }
    ]
    mock_get.return_value = mock_response
    
    monkeypatch.setattr(adapter.client, "get", mock_get)
    result = adapter.discover_jobs("https://jobs.lever.co/test", company_id)
    
    assert result.success is True
    assert result.source == "lever"
    assert len(result.jobs) == 1
    
    job = result.jobs[0]
    assert job.title == "Software Engineer"
    assert job.external_id == "abc-123"
    assert job.location == "Remote"
    assert str(job.apply_url) == "https://jobs.lever.co/test/abc-123/apply"
    assert str(job.source_url) == "https://jobs.lever.co/test/abc-123"
    assert job.posted_at == datetime(2024, 1, 1, 0, 0, tzinfo=timezone.utc)
    assert job.job_type is None
    
    # Description should combine the parts
    assert "<p>Intro</p>" in job.description
    assert "<h3>Requirements</h3>" in job.description
    assert "<ul><li>Python</li></ul>" in job.description
    assert "<p>Outro</p>" in job.description
    
    mock_get.assert_called_once_with("https://api.lever.co/v0/postings/test?mode=json")

def test_discover_jobs_malformed_skipped(monkeypatch):
    mock_get = MagicMock()
    mock_get = MagicMock()
    adapter = LeverAdapter()
    company_id = uuid.uuid4()
    
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = [
        {
            # Missing text (title)
            "id": "1",
            "applyUrl": "https://test.com/1"
        },
        {
            # Missing applyUrl
            "id": "2",
            "text": "Missing URL Job"
        },
        {
            # Valid
            "id": "3",
            "text": "Valid Job",
            "applyUrl": "https://test.com/3"
        }
    ]
    mock_get.return_value = mock_response
    
    monkeypatch.setattr(adapter.client, "get", mock_get)
    result = adapter.discover_jobs("https://jobs.lever.co/test", company_id)
    
    assert result.success is True
    assert len(result.jobs) == 1
    assert result.jobs[0].title == "Valid Job"

def test_discover_jobs_http_error(monkeypatch):
    mock_get = MagicMock()
    mock_get = MagicMock()
    adapter = LeverAdapter()
    company_id = uuid.uuid4()
    
    request = httpx.Request("GET", "https://test.com")
    response = httpx.Response(404, request=request)
    mock_get.side_effect = httpx.HTTPStatusError("Not Found", request=request, response=response)
    
    monkeypatch.setattr(adapter.client, "get", mock_get)
    result = adapter.discover_jobs("https://jobs.lever.co/test", company_id)
    
    assert result.success is False
    assert result.jobs == []
    assert "HTTP error 404" in result.error

def test_discover_jobs_timeout(monkeypatch):
    mock_get = MagicMock()
    mock_get = MagicMock()
    adapter = LeverAdapter()
    company_id = uuid.uuid4()
    
    mock_get.side_effect = httpx.TimeoutException("Timeout")
    
    monkeypatch.setattr(adapter.client, "get", mock_get)
    result = adapter.discover_jobs("https://jobs.lever.co/test", company_id)
    
    assert result.success is False
    assert result.jobs == []
    assert "Timeout fetching" in result.error

def test_discover_jobs_invalid_json_structure(monkeypatch):
    mock_get = MagicMock()
    mock_get = MagicMock()
    adapter = LeverAdapter()
    company_id = uuid.uuid4()
    
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    # Returns an object instead of array
    mock_response.json.return_value = {"error": "Not an array"}
    mock_get.return_value = mock_response
    
    monkeypatch.setattr(adapter.client, "get", mock_get)
    result = adapter.discover_jobs("https://jobs.lever.co/test", company_id)
    
    assert result.success is False
    assert result.jobs == []
    assert "Expected a JSON array" in result.error
