import time
import logging
import httpx
from enum import Enum
from typing import Optional, Dict, Any, Tuple
import httpx
from enum import Enum
from urllib.parse import urlparse
from app.core.config import settings
import ipaddress

logger = logging.getLogger(__name__)

def is_safe_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
            
        hostname = parsed.hostname
        if not hostname:
            return False
            
        if hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
            return False
            
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                return False
        except ValueError:
            pass
            
        return True
    except Exception:
        return False

class CrawlerErrorCategory(str, Enum):
    TIMEOUT = "timeout"
    CONNECTION_ERROR = "connection_error"
    HTTP_403 = "http_403"
    HTTP_404 = "http_404"
    HTTP_429 = "http_429"
    HTTP_5XX = "http_5xx"
    PARSE_ERROR = "parse_error"
    UNSUPPORTED_SOURCE = "unsupported_source"
    BROWSER_ERROR = "browser_error"
    SSRF_BLOCKED = "ssrf_blocked"
    CRAWL_BUDGET_EXCEEDED = "crawl_budget_exceeded"
    UNKNOWN = "unknown"

class BudgetExceededError(Exception):
    def __init__(self, message: str, category: CrawlerErrorCategory):
        super().__init__(message)
        self.category = category

class UnsafeUrlError(Exception):
    def __init__(self, url: str):
        super().__init__(f"Unsafe URL detected: {url}")
        self.category = CrawlerErrorCategory.SSRF_BLOCKED

class ReliableHttpClient:
    """
    A wrapper around httpx.Client that enforces reliability policies:
    - Max requests per crawl
    - Max duration per crawl
    - Retries with exponential backoff and jitter
    - Safe URL validation
    - Specific handling of 429 and 5xx errors
    """
    
    def __init__(
        self, 
        base_client: Optional[httpx.Client] = None,
        max_requests: int = settings.CRAWLER_MAX_REQUESTS_PER_CRAWL,
        max_duration: int = settings.CRAWLER_MAX_DURATION_SECONDS,
        max_retries: int = settings.CRAWLER_MAX_RETRIES,
        timeout: int = settings.CRAWLER_REQUEST_TIMEOUT_SECONDS
    ):
        self._client = base_client or httpx.Client(
            timeout=timeout,
            headers={"User-Agent": "JobWatcher/1.0 (Job Discovery Crawler)"}
        )
        self.max_requests = max_requests
        self.max_duration = max_duration
        self.max_retries = max_retries
        self.timeout = timeout
        
        self.request_count = 0
        self.start_time = time.monotonic()
        
    def _check_budget(self):
        if self.request_count >= self.max_requests:
            raise BudgetExceededError(
                f"Exceeded max requests per crawl: {self.max_requests}",
                category=CrawlerErrorCategory.CRAWL_BUDGET_EXCEEDED
            )
            
        elapsed = time.monotonic() - self.start_time
        if elapsed >= self.max_duration:
            raise BudgetExceededError(
                f"Exceeded max crawl duration: {self.max_duration}s",
                category=CrawlerErrorCategory.CRAWL_BUDGET_EXCEEDED
            )
            
    def _calculate_backoff(self, attempt: int, retry_after: Optional[int] = None) -> float:
        if retry_after is not None:
            return min(float(retry_after), 10.0) # Cap Retry-After to 10s to avoid unbounded sleep
        # Simple exponential backoff: 1s, 2s, 4s...
        return min(2 ** attempt, 8.0)
        
    def request(self, method: str, url: str, **kwargs) -> httpx.Response:
        """Executes a request with retries and budget enforcement."""
        if not is_safe_url(url):
            raise UnsafeUrlError(url)
            
        attempt = 0
        
        while attempt <= self.max_retries:
            self._check_budget()
            self.request_count += 1
            
            try:
                response = self._client.request(method, url, **kwargs)
                
                # Check redirect safety
                if response.history:
                    if not is_safe_url(str(response.url)):
                        raise UnsafeUrlError(str(response.url))
                        
                # Handle status codes
                status = response.status_code
                
                if status == 429:
                    if attempt >= self.max_retries:
                        response.raise_for_status()
                    retry_after = response.headers.get("Retry-After")
                    delay = self._calculate_backoff(attempt, int(retry_after) if retry_after and retry_after.isdigit() else None)
                    logger.warning(f"Rate limited (429) on {url}. Retrying in {delay}s...")
                    time.sleep(delay)
                    attempt += 1
                    continue
                    
                if 500 <= status < 600:
                    if attempt >= self.max_retries:
                        response.raise_for_status()
                    delay = self._calculate_backoff(attempt)
                    logger.warning(f"Server error {status} on {url}. Retrying in {delay}s...")
                    time.sleep(delay)
                    attempt += 1
                    continue
                    
                response.raise_for_status()
                return response
                
            except (httpx.TimeoutException, httpx.ConnectError, httpx.ReadError) as e:
                if attempt >= self.max_retries:
                    raise
                delay = self._calculate_backoff(attempt)
                logger.warning(f"Transient network error on {url}: {e}. Retrying in {delay}s...")
                time.sleep(delay)
                attempt += 1
                
        raise RuntimeError("Unexpected retry loop exit")
        
    def get(self, url: str, **kwargs) -> httpx.Response:
        return self.request("GET", url, **kwargs)
        
    def post(self, url: str, **kwargs) -> httpx.Response:
        return self.request("POST", url, **kwargs)
        
    def stream(self, method: str, url: str, **kwargs):
        """Wrapper for stream. We only check budget before streaming, but retrying a stream is complex, so we just enforce safety and budget."""
        if not is_safe_url(url):
            raise UnsafeUrlError(url)
            
        self._check_budget()
        self.request_count += 1
        
        return self._client.stream(method, url, **kwargs)
        
    def close(self):
        self._client.close()

def categorize_crawler_error(error: Exception) -> CrawlerErrorCategory:
    if isinstance(error, BudgetExceededError):
        return error.category
    if isinstance(error, UnsafeUrlError):
        return CrawlerErrorCategory.SSRF_BLOCKED
    if isinstance(error, httpx.TimeoutException) or "timeout" in str(type(error)).lower() or "timeout" in str(error).lower():
        return CrawlerErrorCategory.TIMEOUT
    if isinstance(error, (httpx.ConnectError, httpx.ReadError)):
        return CrawlerErrorCategory.CONNECTION_ERROR
    if isinstance(error, httpx.HTTPStatusError):
        status = error.response.status_code
        if status == 403:
            return CrawlerErrorCategory.HTTP_403
        if status == 404:
            return CrawlerErrorCategory.HTTP_404
        if status == 429:
            return CrawlerErrorCategory.HTTP_429
        if 500 <= status < 600:
            return CrawlerErrorCategory.HTTP_5XX
        return CrawlerErrorCategory.UNKNOWN
        
    error_str = str(error).lower()
    
    # Catch wrapped HTTP statuses
    if "http error 403" in error_str:
        return CrawlerErrorCategory.HTTP_403
    if "http error 404" in error_str:
        return CrawlerErrorCategory.HTTP_404
    if "http error 429" in error_str:
        return CrawlerErrorCategory.HTTP_429
    if "http error 5" in error_str:
        return CrawlerErrorCategory.HTTP_5XX
        
    if "browser error" in error_str or "browser fallback failed" in error_str or "playwright" in error_str:
        return CrawlerErrorCategory.BROWSER_ERROR
    
    if "parse" in error_str or "validation failed" in error_str or "json" in error_str:
        return CrawlerErrorCategory.PARSE_ERROR
        
    if "connection" in error_str or "request error" in error_str:
        return CrawlerErrorCategory.CONNECTION_ERROR
        
    return CrawlerErrorCategory.UNKNOWN
