from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

class WatchRuleBase(BaseModel):
    job_type: str | None = None
    role_keywords: list[str] | None = None
    location_keywords: list[str] | None = None
    include_keywords: list[str] | None = None
    exclude_keywords: list[str] | None = None

    @field_validator(
        "role_keywords", "location_keywords", "include_keywords", "exclude_keywords", mode="before"
    )
    def clean_keywords(cls, v):
        if v is None:
            return v
        if not isinstance(v, list):
            raise ValueError("Keywords must be a list of strings")
        cleaned = [str(item).strip() for item in v if str(item).strip()]
        return cleaned

class WatchRuleCreate(WatchRuleBase):
    pass

class WatchRuleUpdate(WatchRuleBase):
    pass

class WatchRuleResponse(WatchRuleBase):
    id: UUID
    watch_profile_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
