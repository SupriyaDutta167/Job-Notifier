import pytest
import uuid
import httpx
from datetime import datetime
from unittest.mock import MagicMock
from app.services.crawler.adapters.workday import (
    WorkdayAdapter, 
    parse_workday_url, 
    WORKDAY_PAGE_SIZE,
    WORKDAY_MAX_PAGES
)
from app.services.crawler.adapters.base import CrawlerParseError, CrawlerFetchError, CrawlerTimeoutError
from app.schemas.job import DiscoveredJob

def test_parse_workday_url_standard():
    res = parse_workday_url("https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite")
    assert res["tenant_host"] == "nvidia.wd5.myworkdayjobs.com"
    assert res["tenant"] == "nvidia"
    assert res["site"] == "NVIDIAExternalCareerSite"
    assert res["locale"] is None

def test_parse_workday_url_locale():
    res = parse_workday_url("https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite")
    assert res["tenant_host"] == "nvidia.wd5.myworkdayjobs.com"
    assert res["tenant"] == "nvidia"
    assert res["site"] == "NVIDIAExternalCareerSite"
    assert res["locale"] == "en-US"

def test_parse_workday_url_locale_trailing_slash():
    res = parse_workday_url("https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/")
    assert res["tenant"] == "nvidia"
    assert res["site"] == "NVIDIAExternalCareerSite"
    
def test_parse_workday_url_query_fragment():
    res = parse_workday_url("https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite?q=software#main")
    assert res["tenant"] == "nvidia"
    assert res["site"] == "NVIDIAExternalCareerSite"

def test_parse_workday_url_invalid():
    with pytest.raises(CrawlerParseError):
        parse_workday_url("https://example.com/jobs")
        
    with pytest.raises(CrawlerParseError):
        parse_workday_url("https://nvidia.wd5.myworkdayjobs.com/")

def test_adapter_success_no_details(monkeypatch):
    adapter = WorkdayAdapter()
    
    mock_post = MagicMock()
    mock_post_resp = MagicMock()
    mock_post_resp.json.return_value = {
        "total": 1,
        "jobPostings": [
            {
                "title": "Software Engineer",
                "externalPath": "/job/loc/sw-eng",
                "locationsText": "Remote",
                "bulletFields": ["JR123"]
            }
        ]
    }
    mock_post_resp.status_code = 200
    mock_post.return_value = mock_post_resp
    
    mock_get = MagicMock()
    mock_get_resp = MagicMock()
    mock_get_resp.status_code = 404 # Simulate detail fetch failure
    mock_get.return_value = mock_get_resp
    
    monkeypatch.setattr(adapter.client, "post", mock_post)
    monkeypatch.setattr(adapter.client, "get", mock_get)
    
    res = adapter.discover_jobs("https://nvidia.wd5.myworkdayjobs.com/Site", uuid.uuid4())
    
    assert res.success is True
    assert len(res.jobs) == 1
    job = res.jobs[0]
    
    assert job.source == "workday"
    assert job.title == "Software Engineer"
    assert job.location == "Remote"
    assert job.external_id == "JR123"
    assert job.description is None
    assert job.job_type is None
    assert str(job.apply_url) == "https://nvidia.wd5.myworkdayjobs.com/Site/job/loc/sw-eng"

def test_adapter_success_with_details(monkeypatch):
    adapter = WorkdayAdapter()
    
    mock_post = MagicMock()
    mock_post_resp = MagicMock()
    mock_post_resp.json.side_effect = [
        {
            "total": 1,
            "jobPostings": [
                {
                    "title": "Software Engineer",
                    "externalPath": "/job/loc/sw-eng",
                    "locationsText": "Remote"
                }
            ]
        },
        {"total": 1, "jobPostings": []}
    ]
    mock_post_resp.status_code = 200
    mock_post.return_value = mock_post_resp
    
    mock_get = MagicMock()
    mock_get_resp = MagicMock()
    mock_get_resp.status_code = 200
    mock_get_resp.json.return_value = {
        "jobPostingInfo": {
            "jobDescription": "Full job description text",
            "timeType": "Full time",
            "jobReqId": "REQ-001",
            "startDate": "2024-01-01T00:00:00Z"
        }
    }
    mock_get.return_value = mock_get_resp
    
    monkeypatch.setattr(adapter.client, "post", mock_post)
    monkeypatch.setattr(adapter.client, "get", mock_get)
    
    res = adapter.discover_jobs("https://nvidia.wd5.myworkdayjobs.com/en-US/Site", uuid.uuid4())
    
    assert res.success is True
    assert len(res.jobs) == 1
    job = res.jobs[0]
    
    assert job.description == "Full job description text"
    assert job.job_type == "Full time"
    assert job.external_id == "REQ-001"
    assert job.posted_at == datetime.fromisoformat("2024-01-01T00:00:00+00:00")
    assert str(job.apply_url) == "https://nvidia.wd5.myworkdayjobs.com/en-US/Site/job/loc/sw-eng"

def test_adapter_malformed_skipped(monkeypatch):
    adapter = WorkdayAdapter()
    
    mock_post = MagicMock()
    mock_post_resp = MagicMock()
    mock_post_resp.json.return_value = {
        "total": 2,
        "jobPostings": [
            {"title": "Valid Job", "externalPath": "/path"},
            {"title": None, "externalPath": "/path2"} # Malformed
        ]
    }
    mock_post.return_value = mock_post_resp
    
    mock_get = MagicMock()
    mock_get_resp = MagicMock()
    mock_get_resp.status_code = 404
    mock_get.return_value = mock_get_resp
    
    monkeypatch.setattr(adapter.client, "post", mock_post)
    monkeypatch.setattr(adapter.client, "get", mock_get)
    
    res = adapter.discover_jobs("https://nvidia.wd5.myworkdayjobs.com/Site", uuid.uuid4())
    assert res.success is True
    assert len(res.jobs) == 1
    assert res.jobs[0].title == "Valid Job"

def test_adapter_http_error(monkeypatch):
    adapter = WorkdayAdapter()
    
    def mock_post_error(*args, **kwargs):
        resp = httpx.Response(403)
        raise httpx.HTTPStatusError("Forbidden", request=httpx.Request("POST", ""), response=resp)
        
    monkeypatch.setattr(adapter.client, "post", mock_post_error)
    
    res = adapter.discover_jobs("https://nvidia.wd5.myworkdayjobs.com/Site", uuid.uuid4())
    assert res.success is False
    assert "HTTP error 403" in res.error

def test_adapter_timeout(monkeypatch):
    adapter = WorkdayAdapter()
    
    def mock_post_timeout(*args, **kwargs):
        raise httpx.TimeoutException("Connection timed out")
        
    monkeypatch.setattr(adapter.client, "post", mock_post_timeout)
    
    res = adapter.discover_jobs("https://nvidia.wd5.myworkdayjobs.com/Site", uuid.uuid4())
    assert res.success is False
    assert "Timeout fetching" in res.error

def test_adapter_invalid_json(monkeypatch):
    adapter = WorkdayAdapter()
    
    mock_post = MagicMock()
    mock_post_resp = MagicMock()
    mock_post_resp.json.side_effect = ValueError("Invalid JSON")
    mock_post.return_value = mock_post_resp
    
    monkeypatch.setattr(adapter.client, "post", mock_post)
    
    res = adapter.discover_jobs("https://nvidia.wd5.myworkdayjobs.com/Site", uuid.uuid4())
    assert res.success is False
    assert "Request error fetching Workday API" in res.error

def test_adapter_pagination_bounds(monkeypatch):
    adapter = WorkdayAdapter()
    
    mock_post = MagicMock()
    mock_post_resp = MagicMock()
    
    # Return 20 jobs each time to ensure it hits the WORKDAY_MAX_PAGES limit
    mock_post_resp.json.return_value = {
        "total": 1000,
        "jobPostings": [{"title": f"Job {i}", "externalPath": f"/path/{i}"} for i in range(WORKDAY_PAGE_SIZE)]
    }
    mock_post.return_value = mock_post_resp
    
    mock_get = MagicMock()
    mock_get_resp = MagicMock()
    mock_get_resp.status_code = 404
    mock_get.return_value = mock_get_resp
    
    monkeypatch.setattr(adapter.client, "post", mock_post)
    monkeypatch.setattr(adapter.client, "get", mock_get)
    
    res = adapter.discover_jobs("https://nvidia.wd5.myworkdayjobs.com/Site", uuid.uuid4())
    assert res.success is True
    # If WORKDAY_MAX_PAGES is 5 and WORKDAY_PAGE_SIZE is 20, max jobs is 100
    assert len(res.jobs) == WORKDAY_MAX_PAGES * WORKDAY_PAGE_SIZE
    assert mock_post.call_count == WORKDAY_MAX_PAGES
