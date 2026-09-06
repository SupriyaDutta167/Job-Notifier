import os
import uuid
from sqlalchemy import select
from app.db.session import SessionLocal
from app.db.models.company import Company
from app.db.models.job import Job
from app.services.crawler.persistence_pipeline import run_persistence_pipeline

def setup_test_company(db):
    slug = "figma-test"
    company = db.execute(select(Company).where(Company.slug == slug)).scalars().first()
    if not company:
        company = Company(
            name="Figma (Test)",
            slug=slug,
            website_url="https://figma.com"
        )
        db.add(company)
        db.commit()
        db.refresh(company)
    return company

def get_job_counts(db, company_id: uuid.UUID) -> int:
    return len(db.execute(select(Job.id).where(Job.company_id == company_id)).scalars().all())

def main():
    print("Starting Live Persistence Test")
    db = SessionLocal()
    
    try:
        company = setup_test_company(db)
        print(f"Using company: {company.name} ({company.id})")
        
        career_url = "https://boards.greenhouse.io/figma"
        
        before_count = get_job_counts(db, company.id)
        print(f"Jobs before crawl: {before_count}")
        
        # Run pipeline
        result = run_persistence_pipeline(db, career_url, company.id)
        
        print("\n--- Persistence Metrics ---")
        print(f"Crawl Success: {result.crawler_success}")
        print(f"Jobs Discovered (Processed): {result.jobs_processed}")
        print(f"New Jobs: {result.new_jobs}")
        print(f"Existing Jobs: {result.existing_jobs}")
        print(f"Failed Jobs: {result.failed_jobs}")
        
        after_count = get_job_counts(db, company.id)
        print(f"Jobs after crawl: {after_count}")
        
        assert after_count == before_count + result.new_jobs, "Row count mismatch!"
        print("Database row count confirms expected insertions.")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
