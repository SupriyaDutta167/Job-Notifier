from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class WatchProfileBase(BaseModel):
    name: str = Field(..., min_length=1)
    is_active: bool = True

class WatchProfileCreate(WatchProfileBase):
    pass

class WatchProfileUpdate(BaseModel):
    name: str | None = Field(None, min_length=1)
    is_active: bool | None = None

class WatchProfileResponse(WatchProfileBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
