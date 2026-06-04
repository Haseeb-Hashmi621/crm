from sqlalchemy.orm import Session
from app.models.activity import Activity
from app.schemas.activity import ActivityCreate
from typing import List

def get_activities_by_contact(db: Session, contact_id: str) -> List[Activity]:
    return db.query(Activity).filter(
        Activity.contact_id == contact_id
    ).order_by(Activity.created_at.desc()).all()

def create_activity(db: Session, activity_data: ActivityCreate) -> Activity:
    db_activity = Activity(
        contact_id=activity_data.contact_id,
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