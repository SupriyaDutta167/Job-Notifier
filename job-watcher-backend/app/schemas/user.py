import re
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

class UserResponse(BaseModel):
    id: UUID
    email: str | None = None
    telegram_chat_id: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    telegram_chat_id: str | None = None

    @field_validator("telegram_chat_id")
    @classmethod
    def validate_telegram_chat_id(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if not re.match(r"^-?\d{5,16}$", v):
            raise ValueError("Invalid Telegram chat ID format. Must be a numeric ID (e.g. 123456789 or -100123456789).")
        return v
