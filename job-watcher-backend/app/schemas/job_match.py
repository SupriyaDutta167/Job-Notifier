from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class JobMatchResponse(BaseModel):
    id: UUID
    job_id: UUID
    watch_profile_id: UUID
    matched: bool
    score: float
    match_reason: str | None = None
    matched_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
