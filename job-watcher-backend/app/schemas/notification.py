from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    job_id: UUID
    watch_profile_id: UUID
    channel: str
    status: str
    recipient: str | None = None
    message: str | None = None
    sent_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime
    
    # Contextual fields for dashboard and detail
    job_title: str | None = None
    company_name: str | None = None
    watch_profile_name: str | None = None
    apply_url: str | None = None
    source_url: str | None = None
    match_reason: str | None = None
    match_score: float | None = None

    model_config = ConfigDict(from_attributes=True)

class TelegramTestResponse(BaseModel):
    success: bool
    message: str
