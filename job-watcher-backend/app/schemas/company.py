from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, HttpUrl

class CompanyBase(BaseModel):
    name: str = Field(..., min_length=1)
    slug: str = Field(..., min_length=1)
    website_url: HttpUrl | None = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: str | None = Field(None, min_length=1)
    slug: str | None = Field(None, min_length=1)
    website_url: HttpUrl | None = None

class CompanyResponse(CompanyBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
