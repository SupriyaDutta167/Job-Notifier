from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

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
