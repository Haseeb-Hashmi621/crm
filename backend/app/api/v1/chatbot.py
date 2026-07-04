from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.chatbot import ChatbotConfigResponse, ChatbotConfigUpdate
from app.services.chatbot_service import get_or_create_chatbot_config

router = APIRouter()


@router.get("/config", response_model=ChatbotConfigResponse)
def get_chatbot_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns this user's chatbot configuration, auto-creating a default
    row (bot enabled, default prompt/fallback) if one doesn't exist yet.
    """
    return get_or_create_chatbot_config(db, current_user.id)


@router.patch("/config", response_model=ChatbotConfigResponse)
def update_chatbot_config(
    data: ChatbotConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates any subset of: enabled, system_prompt, fallback_message.
    This is the on/off switch and prompt editor the client needs —
    no code changes required to turn the bot off or change its tone.
    """
    config = get_or_create_chatbot_config(db, current_user.id)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(config, key, value)

    db.commit()
    db.refresh(config)
    return config