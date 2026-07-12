"""
backend/app/api/v1/website_chat.py

Public (no-auth) endpoint for the Zahra website widget. Anonymous
visitors chat here; when they drop a phone/email, we auto-create a
CRM Contact (owned by an admin account) and log the exchange as an
Activity, same pattern as form_service.py uses for public form
submissions.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db
from app.models.user import User
from app.models.contact import Contact
from app.models.activity import Activity
from app.services.website_chat_service import generate_reply, detect_contact

router = APIRouter()

# Optional override — if you want leads to always land under one specific
# account, set this to that account's email. Leave as None to auto-fallback
# to the first admin user in the system (works out of the box on localhost).
WIDGET_OWNER_EMAIL: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    reply: str
    engine: str
    lead_captured: bool = False


def _get_widget_owner(db: Session) -> Optional[User]:
    """Resolve which CRM user account should own leads captured by the widget.

    Priority:
      1. WIDGET_OWNER_EMAIL if explicitly set and that user exists
      2. First admin user in the system
      3. First user in the system (last resort)
    """
    if WIDGET_OWNER_EMAIL:
        user = db.query(User).filter(User.email == WIDGET_OWNER_EMAIL).first()
        if user:
            return user

    admin = db.query(User).filter(User.role == "admin").order_by(User.created_at.asc()).first()
    if admin:
        return admin

    return db.query(User).order_by(User.created_at.asc()).first()


def _capture_lead_if_present(db: Session, owner: User, session_id: Optional[str], last_user_message: str) -> bool:
    contact_info = detect_contact(last_user_message)
    if not contact_info:
        return False

    email = contact_info.get("email")
    phone = contact_info.get("phone")

    existing = None
    if email:
        existing = db.query(Contact).filter(Contact.user_id == owner.id, Contact.email == email).first()
    if not existing and phone:
        existing = db.query(Contact).filter(Contact.user_id == owner.id, Contact.phone == phone).first()

    if existing:
        contact = existing
    else:
        contact = Contact(
            first_name="Website",
            last_name="Chat Lead",
            email=email,
            phone=phone,
            company=None,
            user_id=owner.id,
        )
        db.add(contact)
        db.flush()

    db.add(Activity(
        contact_id=contact.id,
        type="note",
        content=f"[Website Chat] Visitor shared contact info (session {session_id or 'unknown'}): {last_user_message}",
    ))
    db.commit()
    return True


@router.post("/message", response_model=ChatResponse)
def send_message(data: ChatRequest, db: Session = Depends(get_db)):
    if not data.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    messages = [{"role": m.role, "content": m.content} for m in data.messages]
    result = generate_reply(messages)

    lead_captured = False
    last_user = next((m for m in reversed(messages) if m["role"] == "user"), None)
    owner = _get_widget_owner(db)
    if owner and last_user:
        try:
            lead_captured = _capture_lead_if_present(db, owner, data.session_id, last_user["content"])
        except Exception:
            db.rollback()

    return ChatResponse(reply=result["reply"], engine=result["engine"], lead_captured=lead_captured)


@router.get("/health")
def health():
    return {"status": "ok", "assistant": "Zahra"}