import pytest
import httpx
import time
from unittest.mock import MagicMock
from app.services.crawler.reliability import (
    ReliableHttpClient,
    BudgetExceededError,
    UnsafeUrlError,
    CrawlerErrorCategory,
    categorize_crawler_error
)

def test_safe_url_validation():
    client = ReliableHttpClient()
    with pytest.raises(UnsafeUrlError):
        client.request("GET", "http://localhost/jobs")

def test_max_requests_budget():
    mock_base = MagicMock()
    mock_base.request.return_value = httpx.Response(200, request=httpx.Request("GET", ""))
    
    client = ReliableHttpClient(base_client=mock_base, max_requests=2)
    
    # First request
    client.request("GET", "https://example.com")
    # Second request
    client.request("GET", "https://example.com")
    
    # Third request should raise budget error
    with pytest.raises(BudgetExceededError) as exc_info:
        client.request("GET", "https://example.com")
        
    assert exc_info.value.category == CrawlerErrorCategory.CRAWL_BUDGET_EXCEEDED

def test_max_duration_budget():
    mock_base = MagicMock()
    mock_base.request.return_value = httpx.Response(200, request=httpx.Request("GET", ""))
    
    client = ReliableHttpClient(base_client=mock_base, max_duration=0) # 0 seconds budget
    
    time.sleep(0.01) # Ensure time passes
    with pytest.raises(BudgetExceededError) as exc_info:
        client.request("GET", "https://example.com")
        
    assert exc_info.value.category == CrawlerErrorCategory.CRAWL_BUDGET_EXCEEDED

def test_transient_error_retry(monkeypatch):
    mock_base = MagicMock()
    
    # Fail once, then succeed
    def mock_request(*args, **kwargs):
        if mock_base.request.call_count == 1:
            raise httpx.TimeoutException("Timeout")
        return httpx.Response(200, request=httpx.Request("GET", ""))
        
    mock_base.request.side_effect = mock_request
    
    client = ReliableHttpClient(base_client=mock_base, max_retries=1)
    
    monkeypatch.setattr("time.sleep", lambda x: None)
    
    response = client.request("GET", "https://example.com")
    assert response.status_code == 200
    assert mock_base.request.call_count == 2
    assert client.request_count == 2

def test_transient_error_exhaustion(monkeypatch):
    mock_base = MagicMock()
    mock_base.request.side_effect = httpx.TimeoutException("Timeout")
    
    client = ReliableHttpClient(base_client=mock_base, max_retries=2)
    monkeypatch.setattr("time.sleep", lambda x: None)
    
    with pytest.raises(httpx.TimeoutException):
        client.request("GET", "https://example.com")
        
    assert mock_base.request.call_count == 3
    assert client.request_count == 3

def test_404_no_retry():
    mock_base = MagicMock()
    mock_base.request.return_value = httpx.Response(404, request=httpx.Request("GET", ""))
    
    client = ReliableHttpClient(base_client=mock_base, max_retries=2)
    
    with pytest.raises(httpx.HTTPStatusError):
        client.request("GET", "https://example.com")
        
    assert mock_base.request.call_count == 1 # Did not retry

def test_429_retry_with_header(monkeypatch):
    mock_base = MagicMock()
    
    def mock_request(*args, **kwargs):
        if mock_base.request.call_count == 1:
            return httpx.Response(429, headers={"Retry-After": "1"}, request=httpx.Request("GET", ""))
        return httpx.Response(200, request=httpx.Request("GET", ""))
        
    mock_base.request.side_effect = mock_request
    
    client = ReliableHttpClient(base_client=mock_base, max_retries=1)
    
    mock_sleep = MagicMock()
    monkeypatch.setattr("time.sleep", mock_sleep)
    
    response = client.request("GET", "https://example.com")
    assert response.status_code == 200
    mock_sleep.assert_called_once_with(1.0)
    assert mock_base.request.call_count == 2

def test_error_categorization():
    assert categorize_crawler_error(httpx.TimeoutException("timeout")) == CrawlerErrorCategory.TIMEOUT
    assert categorize_crawler_error(httpx.ConnectError("connect error")) == CrawlerErrorCategory.CONNECTION_ERROR
    
    resp_403 = httpx.Response(403, request=httpx.Request("GET", ""))
    assert categorize_crawler_error(httpx.HTTPStatusError("403", request=resp_403.request, response=resp_403)) == CrawlerErrorCategory.HTTP_403
    
    assert categorize_crawler_error(ValueError("JSON decode failed")) == CrawlerErrorCategory.PARSE_ERROR
    assert categorize_crawler_error(Exception("playwright browser error")) == CrawlerErrorCategory.BROWSER_ERROR
