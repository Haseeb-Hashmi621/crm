from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class ChatbotConfigResponse(BaseModel):
    id: UUID
    user_id: UUID
    enabled: bool
    system_prompt: str
    fallback_message: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatbotConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    system_prompt: Optional[str] = None
    fallback_message: Optional[str] = None