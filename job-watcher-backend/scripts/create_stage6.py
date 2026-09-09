import os

base_dir = r".""
os.makedirs(os.path.join(base_dir, "app/services/jobs"), exist_ok=True)

schemas_update = """from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, HttpUrl

class DiscoveredJob(BaseModel):
    source: str
    external_id: str | None = None
    title: str
    description: str | None = None
    location: str | None = None
    job_type: str | None = None
    apply_url: HttpUrl | None = None
    source_url: HttpUrl | None = None
    posted_at: datetime | None = None

class JobResponse(BaseModel):
    id: UUID
    company_id: UUID
    source: str
    external_id: str | None = None
    fingerprint: str
    title: str
    description: str | None = None
    location: str | None = None
    job_type: str | None = None
    apply_url: HttpUrl | None = None
    source_url: HttpUrl | None = None
    posted_at: datetime | None = None
    first_seen_at: datetime
    last_seen_at: datetime
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
"""

with open(os.path.join(base_dir, "app/schemas/job.py"), "w", encoding="utf-8") as f:
    f.write(schemas_update)


files = {
    "app/services/jobs/__init__.py": "",
    "app/services/jobs/normalization.py": """import re
import html
from urllib.parse import urlparse, urlunparse

def clean_whitespace(text: str | None) -> str | None:
    if not text:
        return text
    text = str(text)
    # Replace unicode whitespace and collapse multiple spaces
    text = re.sub(r'\\s+', ' ', text)
    return text.strip()

def normalize_title(title: str) -> str:
    cleaned = clean_whitespace(title)
    return cleaned if cleaned else ""

def normalize_location(location: str | None) -> str | None:
    return clean_whitespace(location)

def normalize_job_type(job_type: str | None) -> str | None:
    if not job_type:
        return job_type
    return clean_whitespace(job_type).lower()

def normalize_url(url: str | None) -> str | None:
    if not url:
        return url
    url = str(url).strip()
    parsed = urlparse(url)
    # Remove trailing slash from path if it's not the root
    path = parsed.path
    if len(path) > 1 and path.endswith('/'):
        path = path.rstrip('/')
    
    # Reconstruct url
    return urlunparse((
        parsed.scheme,
        parsed.netloc.lower(),
        path,
        parsed.params,
        parsed.query,
        parsed.fragment
    ))

def normalize_description(html_desc: str | None) -> str | None:
    if not html_desc:
        return html_desc
    # Unescape HTML entities
    text = html.unescape(html_desc)
    # Remove HTML tags using a basic regex
    text = re.sub(r'<[^>]+>', ' ', text)
    # Clean up whitespace
    return clean_whitespace(text)

def normalize_source(source: str) -> str:
    cleaned = clean_whitespace(source)
    return cleaned.lower() if cleaned else "unknown"
""",
    "app/services/jobs/deduplication.py": """import hashlib
from uuid import UUID

def generate_fingerprint(company_id: UUID, source: str, title: str, location: str | None, apply_url: str | None) -> str:
    \"\"\"
    Generates a deterministic SHA-256 fingerprint for a job to prevent duplication.
    Identity fields: company_id, source, title, location, apply_url.
    \"\"\"
    components = [
        str(company_id),
        str(source).strip().lower(),
        str(title).strip().lower(),
        str(location).strip().lower() if location else "",
        str(apply_url).strip().lower() if apply_url else ""
    ]
    
    raw_string = "|".join(components)
    return hashlib.sha256(raw_string.encode('utf-8')).hexdigest()
""",
    "app/services/jobs/job_service.py": """from uuid import UUID
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
    \"\"\"
    Normalizes a discovered job, computes its fingerprint, and attempts to persist it.
    If the job already exists (by fingerprint or external_id), it updates last_seen_at.
    Returns: (Job, is_new: bool)
    \"\"\"
    
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
""",
    "app/api/v1/jobs.py": """from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.job import JobResponse
from app.services.jobs import job_service
from app.core.exceptions import NotFoundError

router = APIRouter()

@router.get("", response_model=list[JobResponse])
def list_jobs(
    company_id: UUID | None = Query(None, description="Filter jobs by company"),
    is_active: bool | None = Query(None, description="Filter jobs by active status"),
    db: Session = Depends(get_db)
):
    return job_service.list_jobs(db, company_id=company_id, is_active=is_active)

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    try:
        return job_service.get_job(db, job_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
"""
}

for filepath, content in files.items():
    full_path = os.path.join(base_dir, filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Created Stage 6 jobs files")
