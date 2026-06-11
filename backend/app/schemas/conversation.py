from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class ConversationContact(BaseModel):
    id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None

    class Config:
        from_attributes = True


class ConversationListItem(BaseModel):
    contact: ConversationContact
    last_message_type: Optional[str] = None
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None


class ConversationMessage(BaseModel):
    id: UUID
    type: str
    content: str
    created_at: datetime
    deal_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class ConversationThreadResponse(BaseModel):
    contact: ConversationContact
    messages: List[ConversationMessage]


class SendMessageRequest(BaseModel):
    channel: str  # note | call | meeting | email | sms | whatsapp
    content: str
    subject: Optional[str] = None  # used for email


class SendMessageResponse(BaseModel):
    message: ConversationMessage