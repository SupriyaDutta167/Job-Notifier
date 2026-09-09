from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, HttpUrl, field_validator

class WatchProfileCompanyBase(BaseModel):
    company_id: UUID
    career_url: HttpUrl
    is_active: bool = True

    @field_validator('career_url')
    @classmethod
    def validate_career_url(cls, v: HttpUrl) -> HttpUrl:
        if v.host in ('localhost', '127.0.0.1', '::1'):
            raise ValueError("URL cannot point to localhost")
        return v

class WatchProfileCompanyCreate(WatchProfileCompanyBase):
    pass

class WatchProfileCompanyUpdate(BaseModel):
    career_url: HttpUrl | None = None
    is_active: bool | None = None
    
    @field_validator('career_url')
    @classmethod
    def validate_career_url(cls, v: HttpUrl | None) -> HttpUrl | None:
        if v and v.host in ('localhost', '127.0.0.1', '::1'):
            raise ValueError("URL cannot point to localhost")
        return v

class WatchProfileCompanyResponse(BaseModel):
    id: UUID
    company_id: UUID
    watch_profile_id: UUID
    career_url: str  # Convert HttpUrl to string for response
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
