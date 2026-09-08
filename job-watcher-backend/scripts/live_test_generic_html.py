import argparse
import sys
import logging
from uuid import uuid4
from app.services.crawler.adapters.generic_html import GenericHtmlAdapter, GenericSelectorConfig

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description="Live test for Generic HTML Crawler Adapter")
    parser.add_argument("url", help="Public Career URL (e.g., https://example.com/careers)")
    args = parser.parse_args()
    
    url = args.url
    print(f"Testing URL: {url}")
    
    # Optional extensions for the future could go here
    config = GenericSelectorConfig()
    
    adapter = GenericHtmlAdapter(config=config)
    
    print("\nStarting crawl...")
    result = adapter.discover_jobs(url, uuid4())
    
    if not result.success:
        print(f"Crawl Failed: {result.error}")
        sys.exit(1)
        
    jobs = result.jobs
    print(f"Jobs Discovered: {len(jobs)}")
    
    if not jobs:
        print("No jobs found (or no high-confidence heuristics matched).")
        sys.exit(0)
        
    print("\nSample Jobs (up to 3):")
    for job in jobs[:3]:
        print("-" * 40)
        print(f"Title:       {job.title}")
        print(f"External ID: {job.external_id}")
        print(f"Location:    {job.location}")
        print(f"Job Type:    {job.job_type}")
        print(f"Posted At:   {job.posted_at}")
        print(f"Apply URL:   {job.apply_url}")
        if job.description:
            print(f"Description: Present ({len(job.description)} chars)")
        else:
            print("Description: Missing")

if __name__ == "__main__":
    main()
