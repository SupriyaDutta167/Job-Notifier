from uuid import UUID
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
