from sqlalchemy.orm import Session, joinedload
from app.models.activity import Activity
from app.models.contact import Contact
from app.schemas.activity import ActivityCreate
from app.services.notification_service import create_notification
from typing import List

def get_activities_by_contact(db: Session, contact_id: str) -> List[Activity]:
    return db.query(Activity).filter(
        Activity.contact_id == contact_id
    ).order_by(Activity.created_at.desc()).all()

def get_activities_by_deal(db: Session, deal_id: str) -> List[Activity]:
    return db.query(Activity).filter(
        Activity.deal_id == deal_id
    ).order_by(Activity.created_at.desc()).all()

def get_recent_activities(db: Session, limit: int = 50) -> List[Activity]:
    """Single query — fetches recent activities across all contacts with contact info joined."""
    return (
        db.query(Activity)
        .options(joinedload(Activity.contact))
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )

def create_activity(db: Session, activity_data: ActivityCreate) -> Activity:
    db_activity = Activity(
        contact_id=activity_data.contact_id,
        deal_id=activity_data.deal_id,
        type=activity_data.type,
        content=activity_data.content
    )
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity

def delete_activity(db: Session, activity_id: str) -> bool:
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        return False
    db.delete(activity)
    db.commit()
    return True