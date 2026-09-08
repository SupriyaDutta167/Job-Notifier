import argparse
import sys
import logging
import json
from uuid import uuid4
from app.services.crawler.adapters.workday import WorkdayAdapter, parse_workday_url

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description="Live test for Workday Crawler Adapter")
    parser.add_argument("url", help="Public Workday Career URL (e.g., https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite)")
    args = parser.parse_args()
    
    url = args.url
    print(f"Testing URL: {url}")
    
    try:
        parsed = parse_workday_url(url)
        print(f"Detected Tenant Host: {parsed['tenant_host']}")
        print(f"Detected Tenant: {parsed['tenant']}")
        print(f"Detected Site: {parsed['site']}")
        print(f"Detected Locale: {parsed['locale']}")
    except Exception as e:
        print(f"Failed to parse URL: {e}")
        sys.exit(1)
        
    adapter = WorkdayAdapter()
    
    print("\nStarting crawl...")
    result = adapter.discover_jobs(url, uuid4())
    
    if not result.success:
        print(f"Crawl Failed: {result.error}")
        sys.exit(1)
        
    jobs = result.jobs
    print(f"Jobs Discovered: {len(jobs)}")
    
    if not jobs:
        print("No jobs found.")
        sys.exit(0)
        
    print("\nSample Jobs (up to 3):")
    for job in jobs[:3]:
        print("-" * 40)
        print(f"Title:       {job.title}")
        print(f"External ID: {job.external_id}")
        print(f"Location:    {job.location}")
        print(f"Job Type:    {job.job_type}")
        print(f"Apply URL:   {job.apply_url}")
        if job.description:
            print(f"Description: Present ({len(job.description)} chars)")
        else:
            print("Description: Missing")

if __name__ == "__main__":
    main()
