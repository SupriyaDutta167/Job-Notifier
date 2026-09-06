import os
import asyncio
from uuid import uuid4
from app.services.crawler.adapters.ashby import AshbyAdapter

def test_live_ashby():
    print("Testing live Ashby adapter on 'multiverse'...")
    adapter = AshbyAdapter()
    
    result = adapter.discover_jobs("https://jobs.ashbyhq.com/multiverse", uuid4())
    
    print(f"Success: {result.success}")
    if not result.success:
        print(f"Error: {result.error}")
        return
        
    print(f"Jobs discovered: {len(result.jobs)}")
    
    if result.jobs:
        job = result.jobs[0]
        print("First job mapped fields:")
        print(f"  title: {job.title}")
        print(f"  external_id: {job.external_id}")
        print(f"  location: {job.location}")
        print(f"  job_type: {job.job_type}")
        print(f"  posted_at: {job.posted_at}")
        print(f"  apply_url: {job.apply_url}")
        print(f"  source_url: {job.source_url}")
        print(f"  description length: {len(job.description) if job.description else 0}")
        print(f"  source: {job.source}")

if __name__ == "__main__":
    test_live_ashby()
