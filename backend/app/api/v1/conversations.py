from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.conversation import (
    ConversationListItem, ConversationThreadResponse,
    SendMessageRequest, SendMessageResponse
)
from app.services.conversation_service import (
    get_conversations, get_conversation_thread, send_message
)
from typing import List

router = APIRouter()


@router.get("/", response_model=List[ConversationListItem])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = get_conversations(db, current_user.id)
    items = []
    for r in results:
        last = r["last_activity"]
        items.append(ConversationListItem(
            contact=r["contact"],
            last_message_type=last.type if last else None,
            last_message_preview=(last.content[:120] if last else None),
            last_message_at=last.created_at if last else None,
        ))
    return items


@router.get("/{contact_id}", response_model=ConversationThreadResponse)
def get_thread(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = get_conversation_thread(db, current_user.id, contact_id)
    if not result:
        raise HTTPException(status_code=404, detail="Contact not found")
    return result


@router.post("/{contact_id}/send", response_model=SendMessageResponse)
def send_conversation_message(
    contact_id: str,
    data: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = send_message(db, current_user.id, contact_id, data.channel, data.content, data.subject)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return SendMessageResponse(message=result["activity"])