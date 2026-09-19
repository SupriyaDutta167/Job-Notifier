from uuid import UUID
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict

class ScanRunResponse(BaseModel):
    id: UUID
    watch_profile_id: UUID
    watch_profile_name: str | None = None
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    companies_checked: int = 0
    jobs_discovered: int = 0
    jobs_new: int = 0
    jobs_matched: int = 0
    notifications_sent: int = 0
    error_count: int = 0
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ScanErrorResponse(BaseModel):
    id: UUID
    scan_run_id: UUID
    watch_profile_company_id: UUID | None = None
    company_name: str | None = None
    error_type: str
    message: str | None = None
    details: dict[str, Any] | None = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class CompanyScanStatusItem(BaseModel):
    company_id: UUID
    company_name: str
    status: str  # "completed" | "failed"
    error_type: str | None = None
    error_message: str | None = None
    career_url: str | None = None

class ScanDetailResponse(BaseModel):
    id: UUID
    watch_profile_id: UUID
    watch_profile_name: str | None = None
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    companies_checked: int = 0
    jobs_discovered: int = 0
    jobs_new: int = 0
    jobs_matched: int = 0
    notifications_sent: int = 0
    error_count: int = 0
    created_at: datetime
    errors: list[ScanErrorResponse] = []
    company_statuses: list[CompanyScanStatusItem] = []
    
    model_config = ConfigDict(from_attributes=True)
