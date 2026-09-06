import pytest
import httpx
from uuid import uuid4
from unittest.mock import Mock, patch
from datetime import datetime
from app.services.crawler.adapters.ashby import AshbyAdapter
from app.services.crawler.adapters.base import CrawlerParseError
from app.schemas.job import DiscoveredJob

@pytest.fixture
def adapter():
    return AshbyAdapter()

@pytest.fixture
def company_id():
    return uuid4()

def test_extract_board_name(adapter):
    # Valid urls
    assert adapter._extract_board_name("https://jobs.ashbyhq.com/figma") == "figma"
    assert adapter._extract_board_name("https://jobs.ashbyhq.com/figma/") == "figma"
    assert adapter._extract_board_name("https://jobs.ashbyhq.com/figma?something=123") == "figma"
    assert adapter._extract_board_name("https://jobs.ashbyhq.com/figma#fragment") == "figma"
    
    # Missing slug
    with pytest.raises(CrawlerParseError):
        adapter._extract_board_name("https://jobs.ashbyhq.com/")
        
def test_discover_jobs_success(adapter, company_id):
    mock_response = {
        "jobs": [
            {
                "id": "abc-123",
                "title": "Software Engineer",
                "department": "Engineering",
                "location": "Remote",
                "jobUrl": "https://jobs.ashbyhq.com/figma/abc-123",
                "applyUrl": "https://jobs.ashbyhq.com/figma/abc-123/application",
                "publishedAt": "2023-01-01T12:00:00Z",
                "descriptionHtml": "<p>Hello</p>",
                "employmentType": "FullTime"
            },
            {
                "id": "def-456",
                "title": "Product Manager",
                # missing some optional fields
                "jobUrl": "https://jobs.ashbyhq.com/figma/def-456"
            }
        ]
    }
    
    mock_client = Mock()
    mock_response_obj = Mock()
    mock_response_obj.json.return_value = mock_response
    mock_client.get.return_value = mock_response_obj
    
    adapter.client = mock_client
    
    result = adapter.discover_jobs("https://jobs.ashbyhq.com/figma", company_id)
    
    assert result.success is True
    assert len(result.jobs) == 2
    
    job1 = result.jobs[0]
    assert job1.external_id == "abc-123"
    assert job1.title == "Software Engineer"
    assert job1.location == "Remote"
    assert str(job1.apply_url) == "https://jobs.ashbyhq.com/figma/abc-123/application"
    assert str(job1.source_url) == "https://jobs.ashbyhq.com/figma/abc-123"
    assert job1.description == "<p>Hello</p>"
    assert job1.job_type == "FullTime"
    assert job1.posted_at == datetime(2023, 1, 1, 12, 0, tzinfo=datetime.fromisoformat("2023-01-01T12:00:00+00:00").tzinfo)
    assert job1.source == "ashby"

    job2 = result.jobs[1]
    assert job2.external_id == "def-456"
    assert job2.title == "Product Manager"
    assert job2.location is None
    assert str(job2.apply_url) == "https://jobs.ashbyhq.com/figma/def-456" # Fallback to jobUrl
    assert str(job2.source_url) == "https://jobs.ashbyhq.com/figma/def-456"

def test_discover_jobs_malformed_skipped(adapter, company_id):
    mock_response = {
        "jobs": [
            {
                "id": "abc-123",
                "title": "Software Engineer",
                "jobUrl": "https://jobs.ashbyhq.com/figma/abc-123"
            },
            {
                "id": "def-456",
                # missing title, should be skipped
                "jobUrl": "https://jobs.ashbyhq.com/figma/def-456"
            },
            {
                "id": "ghi-789",
                "title": "Designer"
                # missing jobUrl and applyUrl, should be skipped
            }
        ]
    }
    
    mock_client = Mock()
    mock_response_obj = Mock()
    mock_response_obj.json.return_value = mock_response
    mock_client.get.return_value = mock_response_obj
    
    adapter.client = mock_client
    
    result = adapter.discover_jobs("https://jobs.ashbyhq.com/figma", company_id)
    
    assert result.success is True
    assert len(result.jobs) == 1
    assert result.jobs[0].title == "Software Engineer"

def test_discover_jobs_http_error(adapter, company_id):
    mock_client = Mock()
    mock_client.get.side_effect = httpx.HTTPStatusError("404 Not Found", request=Mock(), response=Mock(status_code=404))
    adapter.client = mock_client
    
    result = adapter.discover_jobs("https://jobs.ashbyhq.com/figma", company_id)
    
    assert result.success is False
    assert result.error is not None
    assert "HTTP error 404" in str(result.error)

def test_discover_jobs_timeout(adapter, company_id):
    mock_client = Mock()
    mock_client.get.side_effect = httpx.TimeoutException("Timeout")
    adapter.client = mock_client
    
    result = adapter.discover_jobs("https://jobs.ashbyhq.com/figma", company_id)
    
    assert result.success is False
    assert result.error is not None
    assert "Timeout" in str(result.error)

def test_discover_jobs_invalid_json(adapter, company_id):
    mock_client = Mock()
    mock_response_obj = Mock()
    mock_response_obj.json.side_effect = ValueError("Invalid JSON")
    mock_client.get.return_value = mock_response_obj
    adapter.client = mock_client
    
    result = adapter.discover_jobs("https://jobs.ashbyhq.com/figma", company_id)
    
    assert result.success is False
    assert result.error is not None
    assert "Failed to parse JSON from Ashby API" in str(result.error)

def test_discover_jobs_normalization_compatibility(adapter, company_id):
    mock_response = {
        "jobs": [
            {
                "id": "abc-123",
                "title": "  Software   Engineer  ",
                "jobUrl": "https://jobs.ashbyhq.com/figma/abc-123?gh_src=123",
                "descriptionHtml": "<p>  Some  text </p>"
            }
        ]
    }
    
    mock_client = Mock()
    mock_response_obj = Mock()
    mock_response_obj.json.return_value = mock_response
    mock_client.get.return_value = mock_response_obj
    adapter.client = mock_client
    
    result = adapter.discover_jobs("https://jobs.ashbyhq.com/figma", company_id)
    
    from app.services.jobs.normalization import normalize_title, normalize_url, normalize_description
    
    job = result.jobs[0]
    
    # Prove that the raw fields can be passed cleanly to normalization
    assert normalize_title(job.title) == "Software Engineer"
    assert normalize_url(str(job.source_url)) == "https://jobs.ashbyhq.com/figma/abc-123?gh_src=123"
    assert normalize_description(job.description) == "Some text"
