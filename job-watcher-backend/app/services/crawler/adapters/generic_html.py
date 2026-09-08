import httpx
import logging
import json
import re
import ipaddress
from uuid import UUID
from datetime import datetime
from typing import Dict, Any, Optional, List
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from pydantic import BaseModel
from app.services.crawler.adapters.base import (
    BaseAdapter, 
    CrawlerFetchError, 
    CrawlerParseError, 
    CrawlerTimeoutError
)
from app.services.crawler.interfaces import CrawlerResult
from app.schemas.job import DiscoveredJob
from app.services.crawler.reliability import is_safe_url

logger = logging.getLogger(__name__)

GENERIC_HTML_MAX_RESPONSE_BYTES = 5 * 1024 * 1024  # 5MB
GENERIC_HTML_MAX_JOB_LINKS = 100

class GenericSelectorConfig(BaseModel):
    """
    Future extension point for custom CSS selectors.
    Not yet exposed to the database or public API.
    """
    job_card_selector: Optional[str] = None
    title_selector: Optional[str] = None
    location_selector: Optional[str] = None
    description_selector: Optional[str] = None
    job_link_selector: Optional[str] = None
    apply_link_selector: Optional[str] = None


class GenericHtmlAdapter(BaseAdapter):
    source_name = "generic_html"
    
    def __init__(self, config: Optional[GenericSelectorConfig] = None):
        super().__init__()
        self.config = config or GenericSelectorConfig()
        
    def discover_jobs(self, career_url: str, company_id: UUID) -> CrawlerResult:
        if not is_safe_url(career_url):
            return self.create_error_result(CrawlerParseError(f"Unsafe or invalid URL provided: {career_url}"))
            
        logger.info(f"generic_html_fetch_started: Fetching {career_url}")
        
        try:
            # We don't fetch unbounded response size. We can use a stream or just get and check Content-Length.
            # httpx allows checking content length but servers can lie. We'll use a stream.
            html_content = b""
            with self.client.stream("GET", career_url, follow_redirects=True) as response:
                response.raise_for_status()
                
                content_type = response.headers.get("Content-Type", "")
                if "text/html" not in content_type.lower() and "application/xhtml+xml" not in content_type.lower():
                    logger.warning(f"generic_html_crawl_failed: Unsupported content type {content_type}")
                    return self.create_success_result([]) # Empty result for unsupported
                
                # Check redirects for SSRF safety
                if not is_safe_url(str(response.url)):
                    return self.create_error_result(CrawlerFetchError(f"Redirected to unsafe URL: {response.url}"))
                    
                bytes_downloaded = 0
                for chunk in response.iter_bytes(chunk_size=65536):
                    bytes_downloaded += len(chunk)
                    if bytes_downloaded > GENERIC_HTML_MAX_RESPONSE_BYTES:
                        return self.create_error_result(CrawlerFetchError(f"Response too large, exceeded {GENERIC_HTML_MAX_RESPONSE_BYTES} bytes"))
                    html_content += chunk
                    
            text_content = html_content.decode(response.encoding or "utf-8", errors="replace")
            
            logger.info("generic_html_fetch_completed")
            
            soup = BeautifulSoup(text_content, "html.parser")
            
            # 1. Try JSON-LD JobPosting schemas first
            discovered_jobs = self._extract_json_ld_jobs(soup, career_url)
            
            # 2. If no JSON-LD found, fall back to HTML heuristics
            if not discovered_jobs:
                discovered_jobs = self._extract_html_heuristic_jobs(soup, career_url)
                
            # Limit number of discovered jobs
            discovered_jobs = discovered_jobs[:GENERIC_HTML_MAX_JOB_LINKS]
            
            # If no jobs found, it might be a JS-rendered page
            if not discovered_jobs:
                logger.info("generic_html_crawl_completed: No jobs discovered. Page may be JS-rendered or unsupported.")
                
                import os
                playwright_enabled = os.getenv("PLAYWRIGHT_ENABLED", "true").lower() == "true"
                
                if playwright_enabled:
                    logger.info("Triggering Playwright fallback...")
                    from app.services.crawler.browser_renderer import BrowserRenderer
                    
                    headless = os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() == "true"
                    timeout = int(os.getenv("PLAYWRIGHT_TIMEOUT_MS", "30000"))
                    
                    renderer = BrowserRenderer(headless=headless, timeout_ms=timeout)
                    render_result = renderer.render(career_url)
                    
                    if not render_result.success:
                        logger.error(f"Playwright fallback failed: {render_result.error}")
                        return self.create_error_result(CrawlerFetchError(f"Browser fallback failed: {render_result.error}"))
                        
                    soup_pw = BeautifulSoup(render_result.html, "html.parser")
                    pw_jobs = self._extract_json_ld_jobs(soup_pw, render_result.final_url or career_url)
                    if not pw_jobs:
                        pw_jobs = self._extract_html_heuristic_jobs(soup_pw, render_result.final_url or career_url)
                        
                    pw_jobs = pw_jobs[:GENERIC_HTML_MAX_JOB_LINKS]
                    logger.info(f"Playwright fallback found {len(pw_jobs)} jobs.")
                    return self.create_success_result(pw_jobs)
                
            return self.create_success_result(discovered_jobs)
            
        except httpx.TimeoutException as e:
            logger.error(f"generic_html_crawl_failed: Timeout fetching {career_url}")
            return self.create_error_result(CrawlerTimeoutError(str(e)))
        except httpx.HTTPStatusError as e:
            logger.error(f"generic_html_crawl_failed: HTTP {e.response.status_code}")
            return self.create_error_result(CrawlerFetchError(f"HTTP error {e.response.status_code}"))
        except httpx.RequestError as e:
            logger.error(f"generic_html_crawl_failed: Request error {e}")
            return self.create_error_result(CrawlerFetchError(str(e)))
        except Exception as e:
            logger.exception(f"generic_html_crawl_failed: Unexpected error")
            return self.create_error_result(CrawlerParseError(str(e)))

    def _extract_json_ld_jobs(self, soup: BeautifulSoup, base_url: str) -> List[DiscoveredJob]:
        jobs = []
        seen_urls = set()
        
        for script in soup.find_all("script", type="application/ld+json"):
            if not script.string:
                continue
                
            try:
                data = json.loads(script.string)
            except ValueError:
                continue
                
            # JSON-LD can be a single dict, a list, or contain @graph
            objects = []
            if isinstance(data, list):
                objects.extend(data)
            elif isinstance(data, dict):
                if "@graph" in data and isinstance(data["@graph"], list):
                    objects.extend(data["@graph"])
                else:
                    objects.append(data)
                    
            for obj in objects:
                if not isinstance(obj, dict):
                    continue
                    
                obj_type = obj.get("@type", "")
                if isinstance(obj_type, list):
                    if "JobPosting" not in obj_type:
                        continue
                else:
                    if obj_type != "JobPosting":
                        continue
                        
                # Extract fields
                title = obj.get("title")
                url = obj.get("url")
                
                if not title:
                    continue
                    
                if not url:
                    url = base_url
                    
                abs_url = urljoin(base_url, url)
                if abs_url in seen_urls:
                    continue
                    
                description = obj.get("description")
                
                job_type = obj.get("employmentType")
                if isinstance(job_type, list) and job_type:
                    job_type = job_type[0]
                
                posted_at_str = obj.get("datePosted")
                posted_at = None
                if posted_at_str:
                    try:
                        # Attempt to parse ISO 8601
                        posted_at = datetime.fromisoformat(posted_at_str.replace("Z", "+00:00"))
                    except (ValueError, TypeError):
                        pass
                        
                # Identifier
                external_id = None
                identifier = obj.get("identifier")
                if isinstance(identifier, dict):
                    external_id = identifier.get("value")
                elif isinstance(identifier, str):
                    external_id = identifier
                    
                # Location
                location = None
                loc_data = obj.get("jobLocation")
                if isinstance(loc_data, dict):
                    addr = loc_data.get("address")
                    if isinstance(addr, dict):
                        parts = []
                        if addr.get("addressLocality"):
                            parts.append(addr.get("addressLocality"))
                        if addr.get("addressRegion"):
                            parts.append(addr.get("addressRegion"))
                        if addr.get("addressCountry"):
                            parts.append(addr.get("addressCountry"))
                        if parts:
                            location = ", ".join(parts)
                            
                try:
                    job = DiscoveredJob(
                        source=self.source_name,
                        external_id=str(external_id) if external_id else None,
                        title=title,
                        description=description,
                        location=location,
                        job_type=job_type,
                        apply_url=abs_url,
                        source_url=abs_url,
                        posted_at=posted_at
                    )
                    jobs.append(job)
                    seen_urls.add(abs_url)
                    logger.info(f"generic_html_candidate_found: Parsed JSON-LD JobPosting for {title}")
                except Exception as e:
                    logger.warning(f"generic_html_candidate_rejected: Failed to validate JobPosting schema: {e}")
                    
        return jobs

    def _extract_html_heuristic_jobs(self, soup: BeautifulSoup, base_url: str) -> List[DiscoveredJob]:
        jobs = []
        seen_urls = set()
        base_parsed = urlparse(base_url)
        
        # Heuristic 1: Find <a> tags that look like jobs
        # Reject false positives
        false_positive_texts = {
            "home", "about", "about us", "contact", "contact us", "privacy policy", 
            "terms", "terms of service", "terms of use", "blog", "news", "press", 
            "apply now", "learn more", "careers", "jobs", "read more", "view details",
            "log in", "login", "sign in", "sign up", "register", "view all jobs",
            "view all", "see all jobs", "all open positions", "all open roles"
        }
        
        job_url_paths = {"/job", "/jobs", "/career", "/careers", "/opening", "/openings", "/position", "/positions", "/vacancy", "/vacancies", "/role", "/roles"}
        
        for a in soup.find_all("a", href=True):
            href = a["href"]
            text = a.get_text(strip=True)
            
            if not text or len(text) < 3 or len(text) > 100:
                continue
                
            if text.lower() in false_positive_texts:
                continue
                
            # Filter non-http schemas
            if href.startswith(("javascript:", "mailto:", "tel:", "#")):
                continue
                
            abs_url = urljoin(base_url, href)
            parsed_url = urlparse(abs_url)
            
            # Same-domain restriction
            if parsed_url.hostname and parsed_url.hostname != base_parsed.hostname:
                continue
                
            # Check if URL path looks like a job or text looks like a job
            path_lower = parsed_url.path.lower()
            looks_like_job_url = any(p in path_lower for p in job_url_paths)
            
            # Basic sanity on text (titles usually have spaces, capitalized words, etc)
            looks_like_title = " " in text and not text.islower()
            
            # Need to be conservative. If it doesn't look like a job URL, 
            # we need stronger evidence (e.g., location present).
            
            if not looks_like_title:
                continue
                
            if abs_url in seen_urls:
                continue
                
            location = None
            parent = a.find_parent(["div", "li", "tr", "article", "section"])
            if parent:
                loc_span = parent.find(class_=re.compile("location", re.I))
                if loc_span:
                    location = loc_span.get_text(strip=True)
                    
            # Stricter requirement: Must either look like a job URL path,
            # or it must have a clearly identified location nearby.
            if not looks_like_job_url and not location:
                continue
                
            try:
                job = DiscoveredJob(
                    source=self.source_name,
                    external_id=None,
                    title=text,
                    description=None,
                    location=location,
                    job_type=None,
                    apply_url=abs_url,
                    source_url=abs_url,
                    posted_at=None
                )
                jobs.append(job)
                seen_urls.add(abs_url)
                logger.info(f"generic_html_candidate_found: Heuristic match for {text}")
            except Exception as e:
                logger.warning(f"generic_html_candidate_rejected: Validation failed: {e}")
                    
        return jobs
