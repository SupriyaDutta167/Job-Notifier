import time
from typing import List
from uuid import UUID
from app.services.crawler.interfaces import CrawlerAdapter, CrawlerResult
from app.schemas.job import DiscoveredJob
from app.core.exceptions import JobWatcherException
from app.services.crawler.reliability import ReliableHttpClient, categorize_crawler_error, CrawlerErrorCategory

class CrawlerFetchError(JobWatcherException):
    pass

class CrawlerParseError(JobWatcherException):
    pass

class CrawlerTimeoutError(JobWatcherException):
    pass

class UnsupportedSourceError(JobWatcherException):
    pass

class BaseAdapter(CrawlerAdapter):
    source_name: str = "generic"
    
    def __init__(self):
        self.client = ReliableHttpClient()
        self.start_time = time.monotonic()
        
    def _get_metadata(self) -> dict:
        duration_ms = int((time.monotonic() - self.start_time) * 1000)
        req_count = getattr(self.client, "request_count", 0)
        requests_made = int(req_count) if isinstance(req_count, (int, float, str)) else 0
        return {"duration_ms": duration_ms, "requests_made": requests_made}
        
    def create_success_result(self, jobs: List[DiscoveredJob]) -> CrawlerResult:
        meta = self._get_metadata()
        return CrawlerResult(
            jobs=jobs, 
            source=self.source_name, 
            success=True,
            **meta
        )
        
    def create_error_result(self, error: Exception) -> CrawlerResult:
        meta = self._get_metadata()
        category = categorize_crawler_error(error)
        return CrawlerResult(
            jobs=[], 
            source=self.source_name, 
            success=False, 
            error=str(error),
            error_category=category.value,
            **meta
        )
