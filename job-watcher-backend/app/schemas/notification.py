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
    
    model_config = ConfigDict(from_attributes=True)
