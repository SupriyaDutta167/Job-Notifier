import httpx
from typing import List
from uuid import UUID
from app.services.crawler.interfaces import CrawlerAdapter, CrawlerResult
from app.schemas.job import DiscoveredJob
from app.core.exceptions import JobWatcherException

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
        self.client = httpx.Client(
            timeout=15.0,
            headers={"User-Agent": "JobWatcher/1.0 (Job Discovery Crawler)"}
        )
        
    def create_success_result(self, jobs: List[DiscoveredJob]) -> CrawlerResult:
        return CrawlerResult(jobs=jobs, source=self.source_name, success=True)
        
    def create_error_result(self, error: Exception) -> CrawlerResult:
        return CrawlerResult(jobs=[], source=self.source_name, success=False, error=str(error))
