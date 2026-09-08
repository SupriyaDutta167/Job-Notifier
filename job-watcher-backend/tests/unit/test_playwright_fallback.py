import pytest
import httpx
import uuid
from unittest.mock import MagicMock
from app.services.crawler.adapters.generic_html import GenericHtmlAdapter
from app.services.crawler.browser_renderer import BrowserRenderer, RenderedPageResult

def test_browser_renderer_abstraction():
    # Verify the abstraction interface
    renderer = BrowserRenderer()
    assert hasattr(renderer, "render")

def test_fallback_not_invoked_if_jobs_found(monkeypatch):
    adapter = GenericHtmlAdapter()
    
    mock_client = MagicMock()
    mock_resp = MagicMock()
    html = """
    <html><body>
        <div class="job-card"><a href="/job/123">Software Engineer</a><span class="location">Remote</span></div>
    </body></html>
    """
    mock_resp.iter_bytes.return_value = [html.encode("utf-8")]
    mock_resp.encoding = "utf-8"
    mock_resp.url = "https://example.com/jobs"
    mock_resp.headers = {"Content-Type": "text/html"}
    
    mock_stream = MagicMock()
    mock_stream.__enter__.return_value = mock_resp
    mock_client.stream.return_value = mock_stream
    
    monkeypatch.setattr(adapter, "client", mock_client)
    
    # Track if renderer is invoked
    mock_render = MagicMock()
    monkeypatch.setattr("app.services.crawler.browser_renderer.BrowserRenderer.render", mock_render)
    
    res = adapter.discover_jobs("https://example.com/jobs", uuid.uuid4())
    
    assert res.success is True
    assert len(res.jobs) == 1
    mock_render.assert_not_called()

def test_fallback_invoked_if_no_jobs_found(monkeypatch):
    monkeypatch.setenv("PLAYWRIGHT_ENABLED", "true")
    adapter = GenericHtmlAdapter()
    
    mock_client = MagicMock()
    mock_resp = MagicMock()
    html = """<html><body><div id="root"></div></body></html>"""
    mock_resp.iter_bytes.return_value = [html.encode("utf-8")]
    mock_resp.encoding = "utf-8"
    mock_resp.url = "https://example.com/jobs"
    mock_resp.headers = {"Content-Type": "text/html"}
    
    mock_stream = MagicMock()
    mock_stream.__enter__.return_value = mock_resp
    mock_client.stream.return_value = mock_stream
    
    monkeypatch.setattr(adapter, "client", mock_client)
    
    # Mock renderer to return jobs
    mock_render = MagicMock()
    mock_render.return_value = RenderedPageResult(
        success=True,
        html="""<html><body><div class="job-card"><a href="/job/pw">Browser Job</a><span class="location">NY</span></div></body></html>""",
        final_url="https://example.com/jobs"
    )
    monkeypatch.setattr("app.services.crawler.browser_renderer.BrowserRenderer.render", mock_render)
    
    res = adapter.discover_jobs("https://example.com/jobs", uuid.uuid4())
    
    assert res.success is True
    assert len(res.jobs) == 1
    assert res.jobs[0].title == "Browser Job"
    mock_render.assert_called_once()

def test_fallback_failure_returns_error(monkeypatch):
    monkeypatch.setenv("PLAYWRIGHT_ENABLED", "true")
    adapter = GenericHtmlAdapter()
    
    mock_client = MagicMock()
    mock_resp = MagicMock()
    html = """<html><body><div id="root"></div></body></html>"""
    mock_resp.iter_bytes.return_value = [html.encode("utf-8")]
    mock_resp.encoding = "utf-8"
    mock_resp.url = "https://example.com/jobs"
    mock_resp.headers = {"Content-Type": "text/html"}
    
    mock_stream = MagicMock()
    mock_stream.__enter__.return_value = mock_resp
    mock_client.stream.return_value = mock_stream
    
    monkeypatch.setattr(adapter, "client", mock_client)
    
    mock_render = MagicMock()
    mock_render.return_value = RenderedPageResult(
        success=False,
        error="Browser timeout"
    )
    monkeypatch.setattr("app.services.crawler.browser_renderer.BrowserRenderer.render", mock_render)
    
    res = adapter.discover_jobs("https://example.com/jobs", uuid.uuid4())
    
    assert res.success is False
    assert "Browser fallback failed" in res.error

def test_fallback_disabled(monkeypatch):
    monkeypatch.setenv("PLAYWRIGHT_ENABLED", "false")
    adapter = GenericHtmlAdapter()
    
    mock_client = MagicMock()
    mock_resp = MagicMock()
    html = """<html><body><div id="root"></div></body></html>"""
    mock_resp.iter_bytes.return_value = [html.encode("utf-8")]
    mock_resp.encoding = "utf-8"
    mock_resp.url = "https://example.com/jobs"
    mock_resp.headers = {"Content-Type": "text/html"}
    
    mock_stream = MagicMock()
    mock_stream.__enter__.return_value = mock_resp
    mock_client.stream.return_value = mock_stream
    
    monkeypatch.setattr(adapter, "client", mock_client)
    
    mock_render = MagicMock()
    monkeypatch.setattr("app.services.crawler.browser_renderer.BrowserRenderer.render", mock_render)
    
    res = adapter.discover_jobs("https://example.com/jobs", uuid.uuid4())
    
    assert res.success is True
    assert len(res.jobs) == 0
    mock_render.assert_not_called()
