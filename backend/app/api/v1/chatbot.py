from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.schemas.chatbot import ChatbotConfigResponse, ChatbotConfigUpdate
from app.services.chatbot_service import get_or_create_chatbot_config

router = APIRouter()


@router.get("/config", response_model=ChatbotConfigResponse)
def get_chatbot_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Returns this user's chatbot configuration, auto-creating a default
    row (bot enabled, default prompt/fallback) if one doesn't exist yet.
    Admin-only: bot settings can affect every live customer conversation.
    """
    return get_or_create_chatbot_config(db, current_user.id)


@router.patch("/config", response_model=ChatbotConfigResponse)
def update_chatbot_config(
    data: ChatbotConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Updates any subset of: enabled, system_prompt, fallback_message.
    Admin-only — see get_chatbot_config note above.
    """
    config = get_or_create_chatbot_config(db, current_user.id)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(config, key, value)

    db.commit()
    db.refresh(config)
    return config