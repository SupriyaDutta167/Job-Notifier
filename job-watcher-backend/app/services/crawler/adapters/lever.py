import httpx
import logging
from uuid import UUID
from datetime import datetime, timezone
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

class LeverAdapter(BaseAdapter):
    source_name = "lever"
    
    def _extract_company_identifier(self, career_url: str) -> str:
        """
        Extract the Lever company identifier from known URL structures.
        Supports format: https://jobs.lever.co/<company_identifier>
        """
        parsed = urlparse(career_url)
        path_parts = [p for p in parsed.path.split('/') if p]
        
        if not path_parts:
            raise CrawlerParseError(f"Could not extract Lever company identifier from URL: {career_url}")
            
        return path_parts[0]

    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        try:
            company_identifier = self._extract_company_identifier(career_url)
        except CrawlerParseError as e:
            return self.create_error_result(e)
            
        # The official public JSON API for Lever postings
        api_url = f"https://api.lever.co/v0/postings/{company_identifier}?mode=json"
        
        try:
            response = self.client.get(api_url)
            response.raise_for_status()
        except httpx.TimeoutException as e:
            return self.create_error_result(CrawlerTimeoutError(f"Timeout fetching Lever API for {company_identifier}: {e}"))
        except httpx.HTTPStatusError as e:
            return self.create_error_result(CrawlerFetchError(f"HTTP error {e.response.status_code} fetching Lever API for {company_identifier}"))
        except httpx.RequestError as e:
            return self.create_error_result(CrawlerFetchError(f"Request error fetching Lever API for {company_identifier}: {e}"))
            
        try:
            data = response.json()
            # Lever returns a JSON array of postings directly
            if not isinstance(data, list):
                raise ValueError("Expected a JSON array of postings")
        except ValueError as e:
            return self.create_error_result(CrawlerParseError(f"Failed to parse JSON from Lever API: {e}"))
            
        discovered_jobs = []
        malformed_count = 0
        
        # Lever API v0 returns all active public postings in a single unpaginated array.
        for raw_job in data:
            if not isinstance(raw_job, dict):
                malformed_count += 1
                continue
                
            title = raw_job.get("text")
            if not title:
                malformed_count += 1
                logger.warning(f"Lever job missing text (title), skipping. Account: {company_identifier}")
                continue
                
            apply_url = raw_job.get("applyUrl")
            source_url = raw_job.get("hostedUrl")
            if not apply_url:
                malformed_count += 1
                logger.warning(f"Lever job missing applyUrl, skipping. Account: {company_identifier}, Title: {title}")
                continue
                
            external_id = raw_job.get("id")
            if external_id is not None:
                external_id = str(external_id)
                
            categories = raw_job.get("categories") or {}
            location = categories.get("location")
            
            # Combine the scattered HTML fields to form the full description
            desc_parts = []
            if raw_job.get("description"):
                desc_parts.append(raw_job.get("description"))
                
            lists = raw_job.get("lists") or []
            for lst in lists:
                if lst.get("text"):
                    desc_parts.append(f"<h3>{lst['text']}</h3>")
                if lst.get("content"):
                    desc_parts.append(lst["content"])
                    
            if raw_job.get("additional"):
                desc_parts.append(raw_job.get("additional"))
                
            description = "\\n".join(desc_parts) if desc_parts else None
            
            # Parse created timestamp if available
            posted_at = None
            created_at_ms = raw_job.get("createdAt")
            if created_at_ms and isinstance(created_at_ms, (int, float)):
                try:
                    posted_at = datetime.fromtimestamp(created_at_ms / 1000.0, tz=timezone.utc)
                except (ValueError, TypeError, OverflowError):
                    pass
                    
            # Job type is not reliably structured as standard employment type
            # 'commitment' exists in categories but it's often free text. We follow instruction to use None if not reliable structured field.
            job_type = None
            
            try:
                job = DiscoveredJob(
                    source=self.source_name,
                    external_id=external_id,
                    title=title,
                    description=description,
                    location=location,
                    job_type=job_type,
                    apply_url=apply_url,
                    source_url=source_url or apply_url,
                    posted_at=posted_at
                )
                discovered_jobs.append(job)
            except Exception as e:
                malformed_count += 1
                logger.warning(f"Failed to validate DiscoveredJob from Lever. Error: {e}")
                
        logger.info(f"Lever adapter finished for {company_identifier}: {len(discovered_jobs)} valid jobs, {malformed_count} malformed skipped.")
        return self.create_success_result(discovered_jobs)
