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

def test_navigation_and_content_links_rejected_as_false_positives(monkeypatch):
    """
    Ensure common career site navigation, content, category, and policy links
    (like the ones previously returned for Amazon and Google) are never parsed as jobs.
    """
    html = """
    <html>
        <body>
            <!-- Amazon-style false positives -->
            <a href="/content/en/career-programs/military">Military careers</a>
            <a href="/content/en/job-categories">Job Categories</a>
            <a href="/en/job_categories">Job categories</a>
            <a href="/en/locations">Locations</a>
            <a href="/en/business_categories">Teams</a>
            <a href="/content/how-we-hire/accommodations">Accommodations</a>

            <!-- Google-style false positives -->
            <a href="/about/careers/applications/jobs/cloud?hl=en_US">Google Cloud</a>
            <a href="/about/careers/applications/jobs/jobs/alerts?hl=en_US">Job alerts</a>
            <a href="/about/careers/applications/jobs/jobs/results?hl=en_US">Job search</a>
            <a href="/about/careers/applications/jobs/jobs/recommendations?hl=en_US">Recommended jobs</a>
            <a href="/about/careers/applications/jobs/ai?hl=en_US">AI at Google</a>
            <a href="/about/careers/applications/jobs/dashboard?hl=en_US">person_outlineperson_outlineYour careerYour career</a>
            <a href="/about/careers/applications/jobs/teams?hl=en_US">googlegoogleHow we workHow we work</a>
            <a href="/about/careers/applications/jobs/jobs/saved?hl=en_US">Saved jobs</a>
            <a href="/about/careers/applications/jobs/how-we-hire?hl=en_US">handymanhandymanHow we hireHow we hire</a>
            <a href="/about/careers/applications/eeo">Google's EEO Policy</a>
            <a href="/about/careers/applications/jobs/privacy-policy">Applicant & Candidate Privacyopen_in_new</a>
        </body>
    </html>
    """
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.iter_bytes.return_value = [html.encode("utf-8")]
    mock_resp.encoding = "utf-8"
    mock_resp.url = "https://www.example.com/careers"
    mock_resp.headers = {"Content-Type": "text/html"}
    
    mock_stream = MagicMock()
    mock_stream.__enter__.return_value = mock_resp
    mock_client.stream.return_value = mock_stream
    
    adapter = GenericHtmlAdapter()
    monkeypatch.setattr(adapter, "client", mock_client)
    monkeypatch.setenv("PLAYWRIGHT_ENABLED", "false")
    
    res = adapter.discover_jobs("https://www.example.com/careers", uuid.uuid4())
    assert res.success is True
    # None of the navigation/content links should be discovered as jobs
    assert len(res.jobs) == 0

def test_amazon_and_google_style_cards_parsed_correctly(monkeypatch):
    """
    Verify real job postings with typical dynamic card structures (Amazon and Google)
    are properly parsed.
    """
    html = """
    <html>
        <body>
            <!-- Amazon-style card -->
            <div class="job-tile">
                <h3 class="job-title">
                    <a href="/en/jobs/10554141/sde-ii-ml-infra">SDE II, ML Infra Services</a>
                </h3>
                <div class="info">
                    <span>LocationsSeattle, WA, USA|Job ID: 10554141</span>
                </div>
            </div>

            <!-- Google-style card -->
            <div class="smn82b">
                <h3>Program Manager, Regulatory PMO</h3>
                <div>
                    <span>place</span>
                    <span>Mountain View, CA, USA</span>
                </div>
                <a href="/jobs/results/89009299044344518-program-manager" aria-label="Learn more about Program Manager, Regulatory PMO"></a>
            </div>
        </body>
    </html>
    """
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.iter_bytes.return_value = [html.encode("utf-8")]
    mock_resp.encoding = "utf-8"
    mock_resp.url = "https://www.example.com/careers"
    mock_resp.headers = {"Content-Type": "text/html"}
    
    mock_stream = MagicMock()
    mock_stream.__enter__.return_value = mock_resp
    mock_client.stream.return_value = mock_stream
    
    adapter = GenericHtmlAdapter()
    monkeypatch.setattr(adapter, "client", mock_client)
    
    res = adapter.discover_jobs("https://www.example.com/careers", uuid.uuid4())
    assert res.success is True
    assert len(res.jobs) == 2
    
    jobs_by_title = {j.title: j for j in res.jobs}
    assert "SDE II, ML Infra Services" in jobs_by_title
    amz_job = jobs_by_title["SDE II, ML Infra Services"]
    assert amz_job.location == "Seattle, WA, USA"
    assert amz_job.external_id == "10554141"
    
    assert "Program Manager, Regulatory PMO" in jobs_by_title
    goog_job = jobs_by_title["Program Manager, Regulatory PMO"]
    assert "Mountain View, CA, USA" in goog_job.location
    assert goog_job.external_id == "89009299044344518"

