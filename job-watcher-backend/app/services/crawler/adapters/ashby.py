import httpx
import logging
from uuid import UUID
from datetime import datetime
from urllib.parse import urlparse
from app.services.crawler.adapters.base import (
    BaseAdapter, 
    CrawlerFetchError, 
    CrawlerParseError, 
    CrawlerTimeoutError
)
from app.services.crawler.interfaces import CrawlerResult
from app.schemas.job import DiscoveredJob

logger = logging.getLogger(__name__)

class AshbyAdapter(BaseAdapter):
    source_name = "ashby"
    
    def _extract_board_name(self, career_url: str) -> str:
        """
        Extract the Ashby board name from the URL.
        URL is typically https://jobs.ashbyhq.com/<slug>
        """
        parsed = urlparse(career_url)
        path_parts = [p for p in parsed.path.split('/') if p]
        
        if len(path_parts) >= 1:
            return path_parts[0]
            
        raise CrawlerParseError(f"Could not extract Ashby board name from URL: {career_url}")

    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        try:
            board_name = self._extract_board_name(career_url)
        except CrawlerParseError as e:
            return self.create_error_result(e)
            
        api_url = f"https://api.ashbyhq.com/posting-api/job-board/{board_name}"
        
        try:
            # We don't append includeCompensation=true as per instructions
            response = self.client.get(api_url)
            response.raise_for_status()
        except httpx.TimeoutException as e:
            return self.create_error_result(CrawlerTimeoutError(f"Timeout fetching Ashby API for {board_name}: {e}"))
        except httpx.HTTPStatusError as e:
            return self.create_error_result(CrawlerFetchError(f"HTTP error {e.response.status_code} fetching Ashby API for {board_name}"))
        except httpx.RequestError as e:
            return self.create_error_result(CrawlerFetchError(f"Request error fetching Ashby API for {board_name}: {e}"))
            
        try:
            data = response.json()
            raw_jobs = data.get("jobs", [])
        except ValueError as e:
            return self.create_error_result(CrawlerParseError(f"Failed to parse JSON from Ashby API: {e}"))
            
        discovered_jobs = []
        malformed_count = 0
        
        # The public API appears to return the entire active posting list, 
        # so pagination is not currently needed.
        for raw_job in raw_jobs:
            title = raw_job.get("title")
            if not title:
                malformed_count += 1
                logger.warning(f"Ashby job missing title, skipping. Board: {board_name}")
                continue
                
            job_url = raw_job.get("jobUrl")
            apply_url = raw_job.get("applyUrl")
            if not job_url and not apply_url:
                malformed_count += 1
                logger.warning(f"Ashby job missing both jobUrl and applyUrl, skipping. Board: {board_name}, Title: {title}")
                continue
                
            # If one is missing, fallback to the other
            source_url = job_url or apply_url
            apply_url = apply_url or job_url
            
            external_id = raw_job.get("id")
            if external_id is not None:
                external_id = str(external_id)
                
            # DiscoveredJob only supports a single location string currently. 
            # We map the primary 'location' and intentionally ignore 'secondaryLocations' 
            # (which Ashby might expose) to adhere to the current schema. Future schema changes 
            # could parse 'secondaryLocations' into an array of strings.
            location = raw_job.get("location")
            if not isinstance(location, str):
                location = None
            
            description = raw_job.get("descriptionHtml")
            
            job_type = raw_job.get("employmentType")
            if not isinstance(job_type, str):
                job_type = None
            
            posted_at_str = raw_job.get("publishedAt")
            posted_at = None
            if posted_at_str:
                try:
                    posted_at = datetime.fromisoformat(posted_at_str.replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    pass
                    
            try:
                job = DiscoveredJob(
                    source=self.source_name,
                    external_id=external_id,
                    title=title,
                    description=description,
                    location=location,
                    job_type=job_type,
                    apply_url=apply_url,
                    source_url=source_url,
                    posted_at=posted_at
                )
                discovered_jobs.append(job)
            except Exception as e:
                malformed_count += 1
                logger.warning(f"Failed to validate DiscoveredJob from Ashby. Error: {e}")
                
        logger.info(f"Ashby adapter finished for {board_name}: {len(discovered_jobs)} valid jobs, {malformed_count} malformed skipped.")
        return self.create_success_result(discovered_jobs)
