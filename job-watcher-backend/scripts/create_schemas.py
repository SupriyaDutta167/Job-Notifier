import os

base_dir = r"."\app\schemas"
os.makedirs(base_dir, exist_ok=True)

schemas = {
    "common.py": """from pydantic import BaseModel

class MessageResponse(BaseModel):
    message: str

class APIError(BaseModel):
    code: str
    message: str
    details: dict | None = None
""",
    "company.py": """from uuid import UUID
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
""",
    "watch_profile.py": """from uuid import UUID
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
""",
    "watch_profile_company.py": """from uuid import UUID
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
""",
    "watch_rule.py": """from uuid import UUID
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
""",
    "job.py": """from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, HttpUrl

class JobResponse(BaseModel):
    id: UUID
    company_id: UUID
    source: str
    external_id: str | None = None
    fingerprint: str
    title: str
    description: str | None = None
    location: str | None = None
    job_type: str | None = None
    apply_url: HttpUrl | None = None
    source_url: HttpUrl | None = None
    posted_at: datetime | None = None
    first_seen_at: datetime
    last_seen_at: datetime
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
""",
    "job_match.py": """from uuid import UUID
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
""",
    "notification.py": """from uuid import UUID
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
""",
    "scan.py": """from uuid import UUID
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
""",
    "__init__.py": """from app.schemas.common import MessageResponse, APIError
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse
from app.schemas.watch_profile import WatchProfileCreate, WatchProfileUpdate, WatchProfileResponse
from app.schemas.watch_profile_company import WatchProfileCompanyCreate, WatchProfileCompanyUpdate, WatchProfileCompanyResponse
from app.schemas.watch_rule import WatchRuleCreate, WatchRuleUpdate, WatchRuleResponse
from app.schemas.job import JobResponse
from app.schemas.job_match import JobMatchResponse
from app.schemas.notification import NotificationResponse
from app.schemas.scan import ScanRunResponse, ScanErrorResponse
"""
}

for filename, content in schemas.items():
    with open(os.path.join(base_dir, filename), "w", encoding="utf-8") as f:
        f.write(content)

print("Created all schemas successfully")
