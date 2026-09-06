import httpx
import logging
from uuid import UUID
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from app.services.crawler.adapters.base import (
    BaseAdapter, 
    CrawlerFetchError, 
    CrawlerParseError, 
    CrawlerTimeoutError
)
from app.services.crawler.interfaces import CrawlerResult
from app.schemas.job import DiscoveredJob

logger = logging.getLogger(__name__)

class GreenhouseAdapter(BaseAdapter):
    source_name = "greenhouse"
    
    def _extract_board_token(self, career_url: str) -> str:
        """
        Extract the Greenhouse board token from various known URL structures.
        """
        parsed = urlparse(career_url)
        path_parts = [p for p in parsed.path.split('/') if p]
        
        # Structure: https://boards.greenhouse.io/embed/job_board?for=figma
        if "embed/job_board" in parsed.path:
            query = parse_qs(parsed.query)
            if "for" in query and query["for"]:
                return query["for"][0]
                
        # Structure: https://boards.greenhouse.io/figma or https://boards.greenhouse.io/figma/jobs
        if len(path_parts) >= 1 and path_parts[0] != "embed":
            return path_parts[0]
            
        raise CrawlerParseError(f"Could not extract Greenhouse board token from URL: {career_url}")

    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        try:
            board_token = self._extract_board_token(career_url)
        except CrawlerParseError as e:
            return self.create_error_result(e)
            
        api_url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true"
        
        try:
            response = self.client.get(api_url)
            response.raise_for_status()
        except httpx.TimeoutException as e:
            return self.create_error_result(CrawlerTimeoutError(f"Timeout fetching Greenhouse API for {board_token}: {e}"))
        except httpx.HTTPStatusError as e:
            return self.create_error_result(CrawlerFetchError(f"HTTP error {e.response.status_code} fetching Greenhouse API for {board_token}"))
        except httpx.RequestError as e:
            return self.create_error_result(CrawlerFetchError(f"Request error fetching Greenhouse API for {board_token}: {e}"))
            
        try:
            data = response.json()
            raw_jobs = data.get("jobs", [])
        except ValueError as e:
            return self.create_error_result(CrawlerParseError(f"Failed to parse JSON from Greenhouse API: {e}"))
            
        discovered_jobs = []
        malformed_count = 0
        
        # Greenhouse v1 API returns all active jobs, so pagination is generally not needed for this endpoint.
        # But we still iterate through safely.
        for raw_job in raw_jobs:
            title = raw_job.get("title")
            if not title:
                malformed_count += 1
                logger.warning(f"Greenhouse job missing title, skipping. Board: {board_token}")
                continue
                
            absolute_url = raw_job.get("absolute_url")
            if not absolute_url:
                malformed_count += 1
                logger.warning(f"Greenhouse job missing absolute_url, skipping. Board: {board_token}, Title: {title}")
                continue
                
            external_id = raw_job.get("id")
            if external_id is not None:
                external_id = str(external_id)
                
            location_data = raw_job.get("location")
            location = location_data.get("name") if isinstance(location_data, dict) else None
            
            description = raw_job.get("content")
            
            # Use first_published if available, otherwise updated_at
            posted_at_str = raw_job.get("first_published") or raw_job.get("updated_at")
            posted_at = None
            if posted_at_str:
                try:
                    posted_at = datetime.fromisoformat(posted_at_str.replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    pass # Ignore unparseable dates
                    
            try:
                job = DiscoveredJob(
                    source=self.source_name,
                    external_id=external_id,
                    title=title,
                    description=description,
                    location=location,
                    job_type=None, # Greenhouse v1 API typically doesn't expose employment_type easily here
                    apply_url=absolute_url,
                    source_url=absolute_url,
                    posted_at=posted_at
                )
                discovered_jobs.append(job)
            except Exception as e:
                malformed_count += 1
                logger.warning(f"Failed to validate DiscoveredJob from Greenhouse. Error: {e}")
                
        logger.info(f"Greenhouse adapter finished for {board_token}: {len(discovered_jobs)} valid jobs, {malformed_count} malformed skipped.")
        return self.create_success_result(discovered_jobs)
