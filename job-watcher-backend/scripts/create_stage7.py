import os

base_dir = r".""
crawler_dir = os.path.join(base_dir, "app/services/crawler")
adapters_dir = os.path.join(crawler_dir, "adapters")
os.makedirs(adapters_dir, exist_ok=True)

files = {
    "app/services/crawler/interfaces.py": """from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.job import DiscoveredJob
from uuid import UUID

class CrawlerResult(BaseModel):
    jobs: List[DiscoveredJob]
    source: str
    success: bool
    error: Optional[str] = None
    
class CrawlerAdapter(ABC):
    @abstractmethod
    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        pass
""",
    "app/services/crawler/detector.py": """from urllib.parse import urlparse
from pydantic import BaseModel

class DetectedSource(BaseModel):
    source: str
    confidence: str
    reason: str

def detect_source(career_url: str) -> DetectedSource:
    try:
        parsed = urlparse(career_url)
        hostname = parsed.hostname or ""
        hostname = hostname.lower()
        
        if "boards.greenhouse.io" in hostname:
            return DetectedSource(source="greenhouse", confidence="high", reason="Known Greenhouse hostname")
            
        if "jobs.lever.co" in hostname:
            return DetectedSource(source="lever", confidence="high", reason="Known Lever hostname")
            
        if "myworkdayjobs.com" in hostname:
            return DetectedSource(source="workday", confidence="high", reason="Known Workday hostname")
            
        if "jobs.ashbyhq.com" in hostname:
            return DetectedSource(source="ashby", confidence="high", reason="Known Ashby hostname")
            
        return DetectedSource(source="generic_html", confidence="low", reason="No known ATS pattern matched, falling back to generic HTML")
    except Exception:
        return DetectedSource(source="generic_html", confidence="low", reason="URL parsing failed, falling back to generic HTML")
""",
    "app/services/crawler/adapters/base.py": """import httpx
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
""",
    "app/services/crawler/adapters/greenhouse.py": """from uuid import UUID
from app.services.crawler.adapters.base import BaseAdapter
from app.services.crawler.interfaces import CrawlerResult

class GreenhouseAdapter(BaseAdapter):
    source_name = "greenhouse"
    
    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        # Skeleton implementation for Stage 7
        try:
            return self.create_success_result([])
        except Exception as e:
            return self.create_error_result(e)
""",
    "app/services/crawler/adapters/lever.py": """from uuid import UUID
from app.services.crawler.adapters.base import BaseAdapter
from app.services.crawler.interfaces import CrawlerResult

class LeverAdapter(BaseAdapter):
    source_name = "lever"
    
    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        # Skeleton implementation for Stage 7
        try:
            return self.create_success_result([])
        except Exception as e:
            return self.create_error_result(e)
""",
    "app/services/crawler/adapters/workday.py": """from uuid import UUID
from app.services.crawler.adapters.base import BaseAdapter
from app.services.crawler.interfaces import CrawlerResult

class WorkdayAdapter(BaseAdapter):
    source_name = "workday"
    
    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        # Skeleton implementation for Stage 7
        try:
            return self.create_success_result([])
        except Exception as e:
            return self.create_error_result(e)
""",
    "app/services/crawler/adapters/ashby.py": """from uuid import UUID
from app.services.crawler.adapters.base import BaseAdapter
from app.services.crawler.interfaces import CrawlerResult

class AshbyAdapter(BaseAdapter):
    source_name = "ashby"
    
    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        # Skeleton implementation for Stage 7
        try:
            return self.create_success_result([])
        except Exception as e:
            return self.create_error_result(e)
""",
    "app/services/crawler/adapters/generic_html.py": """from uuid import UUID
from app.services.crawler.adapters.base import BaseAdapter
from app.services.crawler.interfaces import CrawlerResult

class GenericHtmlAdapter(BaseAdapter):
    source_name = "generic_html"
    
    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        # Skeleton implementation for Stage 7
        # Generic HTML crawling is inherently unreliable; conservative fallback
        try:
            return self.create_success_result([])
        except Exception as e:
            return self.create_error_result(e)
""",
    "app/services/crawler/adapters/__init__.py": """from app.services.crawler.adapters.greenhouse import GreenhouseAdapter
from app.services.crawler.adapters.lever import LeverAdapter
from app.services.crawler.adapters.workday import WorkdayAdapter
from app.services.crawler.adapters.ashby import AshbyAdapter
from app.services.crawler.adapters.generic_html import GenericHtmlAdapter
from app.services.crawler.interfaces import CrawlerAdapter
from app.services.crawler.adapters.base import UnsupportedSourceError

class AdapterRegistry:
    _adapters = {
        "greenhouse": GreenhouseAdapter,
        "lever": LeverAdapter,
        "workday": WorkdayAdapter,
        "ashby": AshbyAdapter,
        "generic_html": GenericHtmlAdapter,
    }
    
    @classmethod
    def get_adapter(cls, source: str) -> CrawlerAdapter:
        adapter_cls = cls._adapters.get(source)
        if not adapter_cls:
            raise UnsupportedSourceError(f"No crawler adapter found for source: {source}")
        return adapter_cls()
""",
    "app/services/crawler/orchestrator.py": """import logging
from uuid import UUID
from app.services.crawler.detector import detect_source
from app.services.crawler.adapters import AdapterRegistry
from app.services.crawler.interfaces import CrawlerResult
from app.services.crawler.adapters.base import UnsupportedSourceError

logger = logging.getLogger(__name__)

def execute_crawl(career_url: str, company_id: UUID) -> CrawlerResult:
    \"\"\"
    Orchestrates the crawl execution for a single career URL.
    Ensures failures are structurally isolated and do not crash the caller.
    \"\"\"
    try:
        # 1. Detect Source
        detected = detect_source(career_url)
        logger.info(f"Crawler detector identified {detected.source} with {detected.confidence} confidence for {career_url} (Reason: {detected.reason})")
        
        # 2. Select Adapter
        adapter = AdapterRegistry.get_adapter(detected.source)
        
        # 3. Execute
        logger.info(f"Crawler adapter {adapter.source_name} starting execution for {career_url}")
        result = adapter.discover_jobs(career_url, company_id)
        
        if result.success:
            logger.info(f"Crawler adapter {adapter.source_name} succeeded for {career_url}. Discovered {len(result.jobs)} jobs.")
        else:
            logger.error(f"Crawler adapter {adapter.source_name} reported failure for {career_url}. Error: {result.error}")
            
        return result
        
    except UnsupportedSourceError as e:
        logger.error(f"Crawler orchestration failed: {str(e)}")
        return CrawlerResult(jobs=[], source="unknown", success=False, error=str(e))
    except Exception as e:
        logger.exception(f"Crawler orchestration encountered an unexpected crash for {career_url}")
        return CrawlerResult(jobs=[], source="unknown", success=False, error=f"Unexpected orchestrator crash: {str(e)}")
""",
    "app/services/crawler/__init__.py": ""
}

for filepath, content in files.items():
    full_path = os.path.join(base_dir, filepath)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Created crawler architecture files successfully")
