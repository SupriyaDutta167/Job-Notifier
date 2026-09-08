import httpx
import logging
import re
from uuid import UUID
from datetime import datetime
from typing import Dict, Any, Optional
from urllib.parse import urlparse, urljoin
from app.services.crawler.adapters.base import (
    BaseAdapter, 
    CrawlerFetchError, 
    CrawlerParseError, 
    CrawlerTimeoutError
)
from app.services.crawler.interfaces import CrawlerResult
from app.schemas.job import DiscoveredJob

logger = logging.getLogger(__name__)

WORKDAY_MAX_PAGES = 5
WORKDAY_PAGE_SIZE = 20

def parse_workday_url(career_url: str) -> Dict[str, Optional[str]]:
    parsed = urlparse(career_url)
    if not parsed.hostname or "myworkdayjobs.com" not in parsed.hostname:
        raise CrawlerParseError(f"Not a Workday URL: {career_url}")
        
    parts = parsed.hostname.split(".")
    tenant = parts[0]
    
    path_segments = [p for p in parsed.path.split("/") if p]
    if not path_segments:
        raise CrawlerParseError(f"Missing site identifier in URL: {career_url}")
        
    locale = None
    site = None
    
    # Check if first segment is locale (e.g., en-US, pt-BR)
    if re.match(r"^[a-z]{2}-[A-Z]{2}$", path_segments[0]) or re.match(r"^[a-z]{2}$", path_segments[0]):
        locale = path_segments[0]
        if len(path_segments) > 1:
            site = path_segments[1]
        else:
            raise CrawlerParseError(f"Missing site identifier in URL: {career_url}")
    else:
        site = path_segments[0]
        
    return {
        "tenant_host": parsed.hostname,
        "tenant": tenant,
        "site": site,
        "locale": locale,
        "original_url": career_url
    }

class WorkdayAdapter(BaseAdapter):
    source_name = "workday"
    
    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        try:
            parsed_data = parse_workday_url(career_url)
        except CrawlerParseError as e:
            return self.create_error_result(e)
            
        tenant_host = parsed_data["tenant_host"]
        tenant = parsed_data["tenant"]
        site = parsed_data["site"]
        
        base_url = f"https://{tenant_host}"
        search_api_url = f"{base_url}/wday/cxs/{tenant}/{site}/jobs"
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "JobWatcher/1.0 (Job Discovery Crawler)"
        }
        
        discovered_jobs = []
        malformed_count = 0
        pages_fetched = 0
        offset = 0
        total_reported = None
        
        while pages_fetched < WORKDAY_MAX_PAGES:
            payload = {
                "appliedFacets": {},
                "limit": WORKDAY_PAGE_SIZE,
                "offset": offset,
                "searchText": ""
            }
            
            try:
                logger.info(f"workday_page_fetched: Fetching Workday page {pages_fetched + 1} for {site} at offset {offset}")
                response = self.client.post(search_api_url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
            except httpx.TimeoutException as e:
                if pages_fetched == 0:
                    return self.create_error_result(CrawlerTimeoutError(f"Timeout fetching Workday API: {e}"))
                logger.warning(f"Timeout on page {pages_fetched + 1}, stopping pagination.")
                break
            except httpx.HTTPStatusError as e:
                # E.g. 403 Bot protection or 400 Bad Request
                if e.response.status_code in (403, 429, 400):
                    logger.error(f"workday_crawl_failed: HTTP {e.response.status_code} from {search_api_url}")
                if pages_fetched == 0:
                    return self.create_error_result(CrawlerFetchError(f"HTTP error {e.response.status_code} fetching Workday API: {e}"))
                break
            except (httpx.RequestError, ValueError) as e:
                if pages_fetched == 0:
                    return self.create_error_result(CrawlerFetchError(f"Request error fetching Workday API: {e}"))
                break
                
            job_postings = data.get("jobPostings", [])
            if total_reported is None:
                total_reported = data.get("total")
                
            if not job_postings:
                # No more jobs
                break
                
            for posting in job_postings:
                try:
                    job = self._process_posting(posting, base_url, tenant, site, headers, parsed_data['locale'])
                    if job:
                        discovered_jobs.append(job)
                    else:
                        malformed_count += 1
                        logger.warning("workday_record_skipped: Job posting missing required data.")
                except Exception as e:
                    malformed_count += 1
                    logger.warning(f"workday_record_skipped: Failed to parse job posting: {e}")
                    
            pages_fetched += 1
            offset += WORKDAY_PAGE_SIZE
            
            if total_reported is not None and offset >= total_reported:
                break
                
        logger.info(f"workday_crawl_completed: Found {len(discovered_jobs)} valid jobs, {malformed_count} malformed skipped. Pages: {pages_fetched}")
        return self.create_success_result(discovered_jobs)

    def _process_posting(self, posting: Dict[str, Any], base_url: str, tenant: str, site: str, headers: Dict[str, str], locale: Optional[str]) -> Optional[DiscoveredJob]:
        title = posting.get("title")
        external_path = posting.get("externalPath")
        
        if not title or not external_path:
            return None
            
        # The external path typically looks like /job/location/title_id
        # We need to construct the API URL for detailed info and the public apply URL
        apply_url = urljoin(base_url, f"/{locale + '/' if locale else ''}{site}{external_path}")
        
        detail_api_url = f"{base_url}/wday/cxs/{tenant}/{site}{external_path}"
        
        # Try to fetch detailed info for description, job_type, and stable ID
        description = None
        job_type = None
        external_id = None
        posted_at = None
        
        try:
            detail_resp = self.client.get(detail_api_url, headers=headers)
            if detail_resp.status_code == 200:
                detail_data = detail_resp.json()
                info = detail_data.get("jobPostingInfo", {})
                
                description = info.get("jobDescription")
                job_type = info.get("timeType")
                external_id = info.get("jobReqId") or info.get("id")
                
                start_date_str = info.get("startDate")
                # Sometimes postedOn is just 'Posted Today', startDate is more reliable if available
                # Workday doesn't always provide an exact timestamp.
                if start_date_str:
                    try:
                        posted_at = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
                    except (ValueError, TypeError):
                        pass
        except Exception as e:
            logger.warning(f"workday_record_skipped: Failed to fetch detail for {external_path}: {e}")
            pass
            
        # Fallback to extract ID from bulletFields if detailed fetch failed or didn't have it
        if not external_id:
            bullets = posting.get("bulletFields", [])
            if bullets and isinstance(bullets, list) and len(bullets) > 0:
                external_id = str(bullets[0])
                
        # Primary location
        locations_text = posting.get("locationsText")
        location = locations_text if locations_text else None
        
        return DiscoveredJob(
            source=self.source_name,
            external_id=str(external_id) if external_id else None,
            title=title,
            description=description,
            location=location,
            job_type=job_type,
            apply_url=apply_url,
            source_url=apply_url,
            posted_at=posted_at
        )

