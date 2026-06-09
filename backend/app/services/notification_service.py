from sqlalchemy.orm import Session
from app.models.notification import Notification
from typing import List
import uuid


def get_notifications(db: Session, user_id: uuid.UUID, limit: int = 20) -> List[Notification]:
    return db.query(Notification).filter(
        Notification.user_id == user_id
    ).order_by(Notification.created_at.desc()).limit(limit).all()


def get_unread_count(db: Session, user_id: uuid.UUID) -> int:
    return db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.read == False
    ).count()


def create_notification(
    db: Session,
    user_id: uuid.UUID,
    type: str,
    title: str,
    message: str = None,
    link: str = None
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        link=link,
        read=False
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def mark_as_read(db: Session, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    if not notification:
        return False
    notification.read = True
    db.commit()
    return True


def mark_all_as_read(db: Session, user_id: uuid.UUID) -> int:
    count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.read == False
    ).update({"read": True})
    db.commit()
    return count


def delete_notification(db: Session, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    if not notification:
        return False
    db.delete(notification)
    db.commit()
    return True


def clear_all_notifications(db: Session, user_id: uuid.UUID) -> int:
    count = db.query(Notification).filter(
        Notification.user_id == user_id
    ).delete()
    db.commit()
    return count