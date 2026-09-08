import pytest
import uuid
import httpx
from datetime import datetime
from unittest.mock import MagicMock
from app.services.crawler.adapters.generic_html import (
    GenericHtmlAdapter,
    is_safe_url,
    GenericSelectorConfig
)

def test_is_safe_url():
    assert is_safe_url("https://example.com/jobs") is True
    assert is_safe_url("http://careers.google.com") is True
    
    # Unsafe schemes
    assert is_safe_url("ftp://example.com") is False
    assert is_safe_url("file:///etc/passwd") is False
    assert is_safe_url("javascript:alert(1)") is False
    
    # Internal / Private
    assert is_safe_url("http://localhost") is False
    assert is_safe_url("http://127.0.0.1") is False
    assert is_safe_url("http://192.168.1.1") is False
    assert is_safe_url("http://10.0.0.5") is False
    
    # Invalid
    assert is_safe_url("not-a-url") is False

def test_generic_adapter_ssrf_protection():
    adapter = GenericHtmlAdapter()
    res = adapter.discover_jobs("http://127.0.0.1/jobs", uuid.uuid4())
    assert res.success is False
    assert "Unsafe or invalid URL" in res.error

def test_json_ld_single_jobposting(monkeypatch):
    html = """
    <html>
        <head>
            <script type="application/ld+json">
            {
                "@context": "http://schema.org",
                "@type": "JobPosting",
                "title": "Senior Software Engineer",
                "url": "https://example.com/job/1",
                "description": "Great role",
                "datePosted": "2024-01-01T12:00:00Z",
                "employmentType": ["FULL_TIME"],
                "identifier": {"value": "REQ-123"},
                "jobLocation": {"address": {"addressLocality": "London"}}
            }
            </script>
        </head>
        <body></body>
    </html>
    """
    
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.iter_bytes.return_value = [html.encode("utf-8")]
    mock_resp.encoding = "utf-8"
    mock_resp.url = "https://example.com/jobs"
    mock_resp.headers = {"Content-Type": "text/html"}
    
    mock_stream = MagicMock()
    mock_stream.__enter__.return_value = mock_resp
    mock_client.stream.return_value = mock_stream
    
    adapter = GenericHtmlAdapter()
    monkeypatch.setattr(adapter, "client", mock_client)
    
    res = adapter.discover_jobs("https://example.com/jobs", uuid.uuid4())
    
    assert res.success is True
    assert len(res.jobs) == 1
    job = res.jobs[0]
    
    assert job.title == "Senior Software Engineer"
    assert job.external_id == "REQ-123"
    assert job.description == "Great role"
    assert job.job_type == "FULL_TIME"
    assert job.location == "London"
    assert job.posted_at == datetime.fromisoformat("2024-01-01T12:00:00+00:00")
    assert str(job.apply_url) == "https://example.com/job/1"

def test_json_ld_multiple_and_graph(monkeypatch):
    html = """
    <html>
        <head>
            <script type="application/ld+json">
            {
                "@graph": [
                    {
                        "@type": "JobPosting",
                        "title": "Job A"
                    },
                    {
                        "@type": "JobPosting",
                        "title": "Job B",
                        "url": "/job/b"
                    },
                    {
                        "@type": "Organization",
                        "name": "Ignore Me"
                    }
                ]
            }
            </script>
        </head>
    </html>
    """
    
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.iter_bytes.return_value = [html.encode("utf-8")]
    mock_resp.encoding = "utf-8"
    mock_resp.url = "https://example.com/jobs"
    mock_resp.headers = {"Content-Type": "text/html"}
    
    mock_stream = MagicMock()
    mock_stream.__enter__.return_value = mock_resp
    mock_client.stream.return_value = mock_stream
    
    adapter = GenericHtmlAdapter()
    monkeypatch.setattr(adapter, "client", mock_client)
    
    res = adapter.discover_jobs("https://example.com/jobs", uuid.uuid4())
    
    assert res.success is True
    assert len(res.jobs) == 2
    assert res.jobs[0].title == "Job A"
    assert str(res.jobs[0].apply_url) == "https://example.com/jobs" # fallback to base url
    assert res.jobs[1].title == "Job B"
    assert str(res.jobs[1].apply_url) == "https://example.com/job/b" # urljoin

def test_html_heuristics(monkeypatch):
    html = """
    <html>
        <body>
            <!-- Good candidates -->
            <div class="job-card">
                <a href="/career/engineering/software-dev">Software Developer</a>
                <span class="location">Remote</span>
            </div>
            
            <a href="/jobs/123">Data Scientist</a>
            
            <!-- False positives -->
            <a href="/about">About Us</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="https://linkedin.com/company">Follow us on LinkedIn</a>
            <a href="javascript:void(0)">Apply Now</a>
            <a href="/jobs/all">View All Jobs</a>
            <a href="/departments">Departments</a>
        </body>
    </html>
    """
    
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.iter_bytes.return_value = [html.encode("utf-8")]
    mock_resp.encoding = "utf-8"
    mock_resp.url = "https://example.com/jobs"
    mock_resp.headers = {"Content-Type": "text/html"}
    
    mock_stream = MagicMock()
    mock_stream.__enter__.return_value = mock_resp
    mock_client.stream.return_value = mock_stream
    
    adapter = GenericHtmlAdapter()
    monkeypatch.setattr(adapter, "client", mock_client)
    
    res = adapter.discover_jobs("https://example.com/jobs", uuid.uuid4())
    
    assert res.success is True
    assert len(res.jobs) == 2
    
    titles = {j.title for j in res.jobs}
    assert "Software Developer" in titles
    assert "Data Scientist" in titles
    assert "About Us" not in titles
    
    # Check location extraction
    sw_job = next(j for j in res.jobs if j.title == "Software Developer")
    assert sw_job.location == "Remote"

def test_unsupported_content_type(monkeypatch):
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.headers = {"Content-Type": "application/json"}
    
    mock_stream = MagicMock()
    mock_stream.__enter__.return_value = mock_resp
    mock_client.stream.return_value = mock_stream
    
    adapter = GenericHtmlAdapter()
    monkeypatch.setattr(adapter, "client", mock_client)
    
    res = adapter.discover_jobs("https://example.com/jobs", uuid.uuid4())
    
    assert res.success is True
    assert len(res.jobs) == 0

def test_timeout(monkeypatch):
    adapter = GenericHtmlAdapter()
    
    def mock_stream(*args, **kwargs):
        raise httpx.TimeoutException("Timeout")
        
    monkeypatch.setattr(adapter.client, "stream", mock_stream)
    
    res = adapter.discover_jobs("https://example.com/jobs", uuid.uuid4())
    assert res.success is False
    assert "Timeout" in res.error

def test_http_error(monkeypatch):
    adapter = GenericHtmlAdapter()
    
    def mock_stream(*args, **kwargs):
        resp = httpx.Response(404)
        raise httpx.HTTPStatusError("Not Found", request=httpx.Request("GET", ""), response=resp)
        
    monkeypatch.setattr(adapter.client, "stream", mock_stream)
    
    res = adapter.discover_jobs("https://example.com/jobs", uuid.uuid4())
    assert res.success is False
    assert "HTTP error 404" in res.error
