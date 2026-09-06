from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, HttpUrl

class WatchProfileCompanyBase(BaseModel):
    company_id: UUID
    career_url: HttpUrl
    is_active: bool = True

class WatchProfileCompanyCreate(WatchProfileCompanyBase):
    pass

class WatchProfileCompanyUpdate(BaseModel):
    is_active: bool | None = None

class WatchProfileCompanyResponse(WatchProfileCompanyBase):
    id: UUID
    watch_profile_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
