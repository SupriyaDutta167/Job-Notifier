import os
import sys
import logging
from uuid import uuid4
from app.services.crawler.adapters.generic_html import GenericHtmlAdapter, GenericSelectorConfig

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/live_test_playwright.py <url>")
        sys.exit(1)
        
    url = sys.argv[1]
    print(f"Testing URL: {url}")
    
    # We explicitly force PLAYWRIGHT_ENABLED=true for this test
    os.environ["PLAYWRIGHT_ENABLED"] = "true"
    os.environ["PLAYWRIGHT_HEADLESS"] = "true"
    
    print("--- 1. HTTP Extraction ---")
    
    adapter = GenericHtmlAdapter()
    
    # Temporarily disable fallback to see pure HTTP
    os.environ["PLAYWRIGHT_ENABLED"] = "false"
    
    print("\nStarting HTTP crawl...")
    http_result = adapter.discover_jobs(url, uuid4())
    
    if not http_result.success:
        print(f"HTTP Crawl Failed: {http_result.error}")
    else:
        print(f"HTTP Jobs Discovered: {len(http_result.jobs)}")
        
    print("\n--- 2. Playwright Extraction ---")
    
    from app.services.crawler.browser_renderer import BrowserRenderer
    from bs4 import BeautifulSoup
    
    renderer = BrowserRenderer()
    render_result = renderer.render(url)
    
    if not render_result.success:
        print(f"Playwright Crawl Failed: {render_result.error}")
        sys.exit(1)
        
    soup = BeautifulSoup(render_result.html, "html.parser")
    # we can use private methods just for this demo
    pw_jobs = adapter._extract_json_ld_jobs(soup, render_result.final_url or url)
    if not pw_jobs:
        pw_jobs = adapter._extract_html_heuristic_jobs(soup, render_result.final_url or url)
        
    print(f"Playwright Jobs Discovered: {len(pw_jobs)}")
    
    if not pw_jobs:
        print("No jobs found even with fallback.")
        sys.exit(0)
        
    print("\nSample Playwright Jobs (up to 3):")
    for job in pw_jobs[:3]:
        print("-" * 40)
        print(f"Title:       {job.title}")
        print(f"External ID: {job.external_id}")
        print(f"Location:    {job.location}")
        print(f"Apply URL:   {job.apply_url}")

if __name__ == "__main__":
    main()
