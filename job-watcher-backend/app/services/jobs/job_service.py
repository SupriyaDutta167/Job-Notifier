from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.db.models.job import Job
from app.db.models.company import Company
from app.schemas.job import DiscoveredJob
from app.services.jobs.normalization import (
    normalize_title,
    normalize_location,
    normalize_job_type,
    normalize_url,
    normalize_description,
    normalize_source
)
from app.services.jobs.deduplication import generate_fingerprint
from app.core.exceptions import NotFoundError, ConflictError

def get_job(db: Session, job_id: UUID) -> Job:
    job = db.execute(select(Job).where(Job.id == job_id)).scalars().first()
    if not job:
        raise NotFoundError("Job not found")
    return job

def list_jobs(db: Session, company_id: UUID | None = None, is_active: bool | None = None) -> list[Job]:
    query = select(Job)
    if company_id:
        query = query.where(Job.company_id == company_id)
    if is_active is not None:
        query = query.where(Job.is_active == is_active)
        
    query = query.order_by(Job.first_seen_at.desc())
    return list(db.execute(query).scalars().all())

def create_or_get_job(db: Session, company_id: UUID, discovered_job: DiscoveredJob) -> tuple[Job, bool]:
    """
    Normalizes a discovered job, computes its fingerprint, and attempts to persist it.
    If the job already exists (by fingerprint or external_id), it updates last_seen_at.
    Returns: (Job, is_new: bool)
    """
    
    # Verify company exists to prevent orphan jobs
    company = db.execute(select(Company).where(Company.id == company_id)).scalars().first()
    if not company:
        raise NotFoundError("Company not found")
        
    # Normalize fields
    norm_title = normalize_title(discovered_job.title)
    norm_location = normalize_location(discovered_job.location)
    norm_job_type = normalize_job_type(discovered_job.job_type)
    norm_apply_url = normalize_url(str(discovered_job.apply_url)) if discovered_job.apply_url else None
    norm_source_url = normalize_url(str(discovered_job.source_url)) if discovered_job.source_url else None
    norm_desc = normalize_description(discovered_job.description)
    norm_source = normalize_source(discovered_job.source)
    norm_external_id = str(discovered_job.external_id).strip() if discovered_job.external_id else None
    
    # Generate fingerprint
    fingerprint = generate_fingerprint(
        company_id=company_id,
        source=norm_source,
        title=norm_title,
        location=norm_location,
        apply_url=norm_apply_url
    )
    
    now = datetime.now(timezone.utc)
    
    # Pre-check lookup (optimistic)
    existing_job = db.execute(
        select(Job).where(
            (Job.fingerprint == fingerprint) | 
            ((Job.external_id == norm_external_id) & (Job.source == norm_source) & (Job.company_id == company_id) & (Job.external_id.isnot(None)))
        )
    ).scalars().first()
    
    if existing_job:
        # Update last_seen_at
        existing_job.last_seen_at = now
        existing_job.is_active = True
        
        # We can opportunistically update changeable fields here if needed
        existing_job.title = norm_title
        existing_job.description = norm_desc
        existing_job.location = norm_location
        existing_job.job_type = norm_job_type
        existing_job.apply_url = norm_apply_url
        existing_job.source_url = norm_source_url
        
        db.commit()
        db.refresh(existing_job)
        return existing_job, False
        
    # Attempt creation
    new_job = Job(
        company_id=company_id,
        source=norm_source,
        external_id=norm_external_id,
        fingerprint=fingerprint,
        title=norm_title,
        description=norm_desc,
        location=norm_location,
        job_type=norm_job_type,
        apply_url=norm_apply_url,
        source_url=norm_source_url,
        posted_at=discovered_job.posted_at,
        first_seen_at=now,
        last_seen_at=now,
        is_active=True
    )
    
    db.add(new_job)
    try:
        db.commit()
        db.refresh(new_job)
        return new_job, True
    except IntegrityError:
        # Concurrent insertion occurred
        db.rollback()
        
        # Re-fetch the job
        existing_job = db.execute(
            select(Job).where(
                (Job.fingerprint == fingerprint) | 
                ((Job.external_id == norm_external_id) & (Job.source == norm_source) & (Job.company_id == company_id) & (Job.external_id.isnot(None)))
            )
        ).scalars().first()
        
        if existing_job:
            existing_job.last_seen_at = now
            existing_job.is_active = True
            db.commit()
            db.refresh(existing_job)
            return existing_job, False
            
        raise ConflictError("Job deduplication failed in an unexpected way during concurrent insertion.")
