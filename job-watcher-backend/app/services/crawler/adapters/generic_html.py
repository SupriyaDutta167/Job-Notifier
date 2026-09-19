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
        
        # Disallowed path patterns: editorial, marketing, navigation, legal, auth, category directories
        disallowed_path_patterns = [
            r"/content/",
            r"/blog/",
            r"/news/",
            r"/press/",
            r"/events/",
            r"/categories",
            r"/category",
            r"/job[-_]categories",
            r"/business[-_]categories",
            r"/locations",
            r"/teams",
            r"/programs",
            r"/career[-_]programs",
            r"/students?",
            r"/military",
            r"/diversity",
            r"/inclusion",
            r"/benefits",
            r"/how[-_]we[-_]hire",
            r"/how[-_]we[-_]work",
            r"/interview",
            r"/accommodations",
            r"/privacy",
            r"/terms",
            r"/cookie",
            r"/eeo",
            r"/legal",
            r"/compliance",
            r"/applicant",
            r"/dashboard",
            r"/saved",
            r"/alerts",
            r"/recommendations",
            r"/settings",
            r"/preferences",
            r"/profile",
            r"/account",
            r"/login",
            r"/logout",
            r"/signin",
            r"/signup",
            r"\.(?:pdf|png|jpg|svg|docx?)$"
        ]
        disallowed_path_regex = re.compile("|".join(disallowed_path_patterns), re.I)

        non_job_segments = {
            "cloud", "youtube", "ai", "search", "results", "saved", "alerts", 
            "recommendations", "dashboard", "teams", "locations", "categories", 
            "category", "students", "military", "benefits", "privacy", "privacy-policy", 
            "terms", "eeo", "help", "overview", "all", "browse", "how-we-work", 
            "how-we-hire", "faq", "press", "news", "blog", "events", "culture", "diversity", 
            "navigation", "details", "apply"
        }

        false_positive_titles = {
            "home", "about", "about us", "contact", "contact us", "privacy policy", 
            "terms", "terms of service", "terms of use", "blog", "news", "press", 
            "apply now", "learn more", "careers", "jobs", "read more", "view details",
            "view job", "details", "back to top", "next", "previous",
            "log in", "login", "sign in", "sign up", "register", "sign out", "logout",
            "view all jobs", "view all", "see all jobs", "all open positions", "all open roles",
            "search", "job search", "saved jobs", "job alerts", "recommended jobs",
            "job categories", "military careers", "teams", "locations", "accommodations",
            "benefits", "inclusive experiences", "how we hire", "how we work",
            "google's eeo policy", "equal opportunity", "related information",
            "applicant & candidate privacy", "my applications", "my profile", "account security",
            "settings", "help", "google apps", "search sidebar", "sort by", "more about us",
            "departments", "explore jobs", "our culture", "life at amazon", "life at google"
        }

        role_noun_regex = re.compile(
            r"\b(engineer|developer|manager|analyst|architect|scientist|lead|director|designer|"
            r"specialist|technician|associate|consultant|recruiter|coordinator|intern|officer|"
            r"writer|representative|strategist|partner|administrator|expert|buyer|teller|"
            r"counsel|paralegal|operator|driver|instructor|assistant)\b",
            re.I
        )

        def clean_title_str(raw: str) -> str:
            raw = re.sub(r'^[a-z_]{4,}(?:[a-z_]{4,})*', '', raw)
            raw = re.sub(r"^(?:learn more about|view|apply for)\s+", "", raw, flags=re.I)
            raw = re.sub(r'\s*open_in_new\s*$', '', raw, flags=re.I)
            raw = re.sub(r'\.{2,}\s*read more.*$', '', raw, flags=re.I)
            return raw.strip()

        def is_ligature_dup(text: str) -> bool:
            n = len(text)
            if n >= 6 and n % 2 == 0:
                half = n // 2
                if text[:half].lower() == text[half:].lower():
                    return True
            return False

        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith(("javascript:", "mailto:", "tel:", "#")):
                continue
                
            abs_url = urljoin(base_url, href)
            parsed_url = urlparse(abs_url)
            
            # Same-domain restriction
            if parsed_url.hostname and parsed_url.hostname != base_parsed.hostname:
                continue
                
            path_lower = parsed_url.path.lower()
            
            # Check disallowed patterns
            if disallowed_path_regex.search(path_lower):
                continue
                
            # Reject index / root search paths
            if path_lower.rstrip("/").endswith(("/jobs", "/careers", "/results", "/search", "/teams", "/locations", "/students", "/dashboard", "/departments")):
                if not parsed_url.query:
                    continue

            # Identify if path looks like a job posting
            m_path = re.search(r"/(?:jobs?/|career[s]?/|posting[s]?/|positions?/|openings?/|roles?/|vacanc(?:y|ies)/|results/)(.+)$", path_lower)
            has_job_query = any(q in parsed_url.query.lower() for q in ["jobid=", "jid=", "id=", "req_id=", "postingid=", "position="])
            
            segments = []
            if m_path:
                tail = m_path.group(1).strip("/")
                segments = [s for s in tail.split("/") if s]

            if not segments and not has_job_query:
                continue

            if segments:
                first_seg = segments[0]
                if first_seg in non_job_segments:
                    if len(segments) > 1:
                        child_seg = segments[1]
                        if child_seg in non_job_segments:
                            continue
                        first_seg = child_seg
                    else:
                        continue
                        
                last_seg = segments[-1]
                if last_seg in non_job_segments:
                    continue

            # Check if enclosed in explicit job card container
            parent_card = a.find_parent(lambda tag: tag.name in ["li", "article", "div", "section", "tr"] and any(
                cls in " ".join(tag.get("class", [])).lower() 
                for cls in ["job-card", "job_card", "job-tile", "job-item", "job-listing", "job-row", "job-result", "smn82b"]
            ))

            # Must have an ID/slug with hyphens or digits, OR be inside an explicit job container
            has_id_or_slug = any(
                ("-" in s or any(c.isdigit() for c in s)) and len(s) >= 3 and s not in non_job_segments
                for s in segments
            )
            
            # Allow clean path segment if inside a verified job card container
            if not (has_id_or_slug or has_job_query or parent_card):
                # Also check if segments has a distinct slug and location is present
                if not (segments and len(segments[0]) >= 4 and segments[0] not in non_job_segments):
                    continue

            # Determine title: <a> text, aria-label, or card heading
            text = a.get_text(strip=True)
            aria_label = a.get("aria-label", "").strip()
            title = None
            
            if text and len(text) >= 3:
                title = clean_title_str(text)
                
            if (not title or title.lower() in false_positive_titles or is_ligature_dup(title)) and aria_label:
                title = clean_title_str(aria_label)
                
            if not title or title.lower() in false_positive_titles or is_ligature_dup(title):
                # Look for headings or explicit title elements in card container
                parent_scope = parent_card or a.find_parent(["li", "article", "div", "section"])
                if parent_scope:
                    for h in parent_scope.find_all(["h1", "h2", "h3", "h4", "span", "div", "p"]):
                        is_heading = h.name in ["h1", "h2", "h3", "h4"]
                        has_title_class = any("title" in c.lower() for c in h.get("class", []))
                        if is_heading or has_title_class:
                            h_text = clean_title_str(h.get_text(strip=True))
                            if h_text and h_text.lower() not in false_positive_titles and not is_ligature_dup(h_text) and len(h_text) >= 4:
                                title = h_text
                                break
                            
            if not title or title.lower() in false_positive_titles or is_ligature_dup(title):
                continue
                
            title_lower = title.lower()
            if any(nav in title_lower for nav in ["navigation", "link", "go to next", "previous page", "next page", "opens in a new tab", "privacy policy", "terms of use"]):
                continue
                
            if title_lower in {"google", "amazon", "nvidia", "meta", "apple", "microsoft", "ai at google", "google cloud", "youtube"}:
                continue
                
            has_role = bool(role_noun_regex.search(title))
            has_words = len(title.split()) >= 2 and len(title) >= 8
            if not (has_role or has_words or parent_card):
                continue
                
            if abs_url in seen_urls:
                continue
                
            # Extract location
            location = None
            parent_scope = parent_card or a.find_parent(["li", "article", "div", "section"])
            if parent_scope:
                loc_el = parent_scope.find(lambda t: (
                    t.name in ["posting-locations"] or 
                    any("location" in c.lower() or "place" in c.lower() or "job-info-value" in c.lower() for c in t.get("class", []))
                ) and len(t.get_text(strip=True)) > 2)
                if loc_el:
                    location = loc_el.get_text(strip=True)
                else:
                    # Look for Material Design place icon
                    loc_icon = parent_scope.find(lambda t: t.name in ["i", "span"] and t.get_text(strip=True) == "place")
                    if loc_icon and loc_icon.parent:
                        loc_val = loc_icon.parent.get_text(" ", strip=True).replace("place", "").strip()
                        if loc_val:
                            location = loc_val
                    else:
                        p_text = parent_scope.get_text(" | ", strip=True)
                        m_loc = re.search(r"Locations?:?\s*\|?\s*([^|\n]+?)(?=\||Job ID|$)", p_text, re.I)
                        if m_loc:
                            location = m_loc.group(1).strip()
                            
            if location:
                location = re.sub(r"^Locations?:?\s*", "", location, flags=re.I)
                location = re.sub(r"\|?\s*Job ID:?.*$", "", location, flags=re.I).strip()
                location = re.sub(r"\+\d+\s+other locations?.*$", "", location, flags=re.I).strip()
                location = re.sub(r"and\s*\d+\s*more.*$", "", location, flags=re.I).strip()
                if not location:
                    location = None
                            
            # Extract external_id
            external_id = None
            if segments:
                for s in segments:
                    m_id = re.search(r"(\d{5,})", s)
                    if m_id:
                        external_id = m_id.group(1)
                        break
            if not external_id and parsed_url.query:
                for q_param in ["jobid", "jid", "id", "req_id", "postingid"]:
                    m_q = re.search(rf"{q_param}=([^&]+)", parsed_url.query, re.I)
                    if m_q:
                        external_id = m_q.group(1)
                        break

            try:
                job = DiscoveredJob(
                    source=self.source_name,
                    external_id=external_id,
                    title=title,
                    description=None,
                    location=location,
                    job_type=None,
                    apply_url=abs_url,
                    source_url=abs_url,
                    posted_at=None
                )
                jobs.append(job)
                seen_urls.add(abs_url)
                logger.info(f"generic_html_candidate_found: Parsed job '{title}' from {abs_url}")
            except Exception as e:
                logger.warning(f"generic_html_candidate_rejected: Validation failed for {abs_url}: {e}")
                
        return jobs
