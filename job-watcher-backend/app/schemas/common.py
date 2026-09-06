from pydantic import BaseModel

class MessageResponse(BaseModel):
    message: str

class APIError(BaseModel):
    code: str
    message: str
    details: dict | None = None
