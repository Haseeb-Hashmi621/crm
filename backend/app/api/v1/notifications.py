from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.notification_service import (
    get_notifications, get_unread_count,
    mark_as_read, mark_all_as_read,
    delete_notification, clear_all_notifications
)
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

router = APIRouter()


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    title: str
    message: Optional[str] = None
    link: Optional[str] = None
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    count: int


@router.get("/", response_model=List[NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_notifications(db, current_user.id)


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = get_unread_count(db, current_user.id)
    return {"count": count}


@router.put("/{notification_id}/read")
def read_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mark_as_read(db, notification_id, current_user.id)
    return {"message": "Marked as read"}


@router.put("/mark-all-read")
def read_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = mark_all_as_read(db, current_user.id)
    return {"marked": count}


@router.delete("/{notification_id}")
def remove_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    delete_notification(db, notification_id, current_user.id)
    return {"message": "Deleted"}


@router.delete("/")
def clear_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = clear_all_notifications(db, current_user.id)
    return {"cleared": count}