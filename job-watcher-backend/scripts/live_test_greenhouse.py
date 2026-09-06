import asyncio
import uuid
from app.services.crawler.adapters.greenhouse import GreenhouseAdapter

async def main():
    adapter = GreenhouseAdapter()
    print("Testing live Greenhouse board: figma")
    result = adapter.discover_jobs("https://boards.greenhouse.io/figma", uuid.uuid4())
    print(f"Success: {result.success}")
    if result.success:
        print(f"Discovered jobs: {len(result.jobs)}")
        if result.jobs:
            print(f"Sample Job Title: {result.jobs[0].title}")
            print(f"Sample Job External ID: {result.jobs[0].external_id}")
            print(f"Sample Job Location: {result.jobs[0].location}")
    else:
        print(f"Error: {result.error}")

if __name__ == "__main__":
    asyncio.run(main())
