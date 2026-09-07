from uuid import UUID
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.services.crawler.interfaces import CrawlerResult
from app.services.jobs.job_service import create_or_get_job
import logging

logger = logging.getLogger(__name__)

class PersistenceResult(BaseModel):
    jobs_processed: int = 0
    new_jobs: int = 0
    existing_jobs: int = 0
    failed_jobs: int = 0
    errors: list[str] = []
    crawler_success: bool = False
    new_job_ids: list[UUID] = []

from app.services.crawler.orchestrator import execute_crawl

def run_persistence_pipeline(db: Session, career_url: str, company_id: UUID) -> PersistenceResult:
    """
    Runs the end-to-end pipeline:
    1. Crawl jobs using orchestrator.
    2. Persist using JobService.create_or_get_job.
    """
    logger.info(f"Pipeline started for url {career_url} (company {company_id})")
    
    crawler_result = execute_crawl(career_url, company_id)
    
    result = PersistenceResult(
        crawler_success=crawler_result.success
    )
    
    if not crawler_result.success:
        logger.error(f"Crawl failed: {crawler_result.error}")
        result.errors.append(str(crawler_result.error))
        # Do not mark missing jobs inactive, preserve the failure state
        return result
        
    for discovered_job in crawler_result.jobs:
        result.jobs_processed += 1
        try:
            # JobService.create_or_get_job already applies normalization and fingerprinting
            job, is_new = create_or_get_job(db, company_id, discovered_job)
            
            if is_new:
                result.new_jobs += 1
                result.new_job_ids.append(job.id)
                logger.debug(f"New job discovered: {job.title} (ID: {job.external_id})")
            else:
                result.existing_jobs += 1
                logger.debug(f"Existing job found: {job.title} (ID: {job.external_id})")
        except Exception as e:
            result.failed_jobs += 1
            error_msg = f"Failed to persist job '{discovered_job.title}' (external_id={discovered_job.external_id}): {str(e)}"
            logger.error(error_msg)
            result.errors.append(error_msg)
            
    logger.info(f"Crawl completed. Processed: {result.jobs_processed}, New: {result.new_jobs}, Existing: {result.existing_jobs}, Failed: {result.failed_jobs}")
    return result
