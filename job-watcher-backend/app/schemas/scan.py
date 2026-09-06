from uuid import UUID
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict

class ScanRunResponse(BaseModel):
    id: UUID
    watch_profile_id: UUID
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    jobs_discovered: int
    jobs_new: int
    jobs_matched: int
    notifications_sent: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ScanErrorResponse(BaseModel):
    id: UUID
    scan_run_id: UUID
    watch_profile_company_id: UUID | None = None
    error_type: str
    message: str | None = None
    details: dict[str, Any] | None = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
