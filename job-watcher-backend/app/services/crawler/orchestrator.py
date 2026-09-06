import logging
from uuid import UUID
from app.services.crawler.detector import detect_source
from app.services.crawler.adapters import AdapterRegistry
from app.services.crawler.interfaces import CrawlerResult
from app.services.crawler.adapters.base import UnsupportedSourceError

logger = logging.getLogger(__name__)

def execute_crawl(career_url: str, company_id: UUID) -> CrawlerResult:
    """
    Orchestrates the crawl execution for a single career URL.
    Ensures failures are structurally isolated and do not crash the caller.
    """
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
