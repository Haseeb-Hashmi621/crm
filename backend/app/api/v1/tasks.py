# backend/app/api/v1/tasks.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.task import Task
from app.models.contact import Contact

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class ContactMini(BaseModel):
    id: str
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    title: str
    notes: Optional[str] = None
    task_type: str = "follow_up"   # call | email | follow_up | meeting
    priority: str = "medium"       # low | medium | high
    due_at: Optional[datetime] = None
    contact_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    task_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_at: Optional[datetime] = None
    contact_id: Optional[str] = None


class TaskOut(BaseModel):
    id: str
    title: str
    notes: Optional[str] = None
    task_type: str
    priority: str
    status: str
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    contact: Optional[ContactMini] = None

    class Config:
        from_attributes = True


def serialize_task(task: Task) -> dict:
    contact_data = None
    if task.contact:
        contact_data = {
            "id": str(task.contact.id),
            "first_name": task.contact.first_name,
            "last_name": task.contact.last_name,
            "email": task.contact.email,
            "phone": task.contact.phone,
            "company": task.contact.company,
        }
    return {
        "id": str(task.id),
        "title": task.title,
        "notes": task.notes,
        "task_type": task.task_type,
        "priority": task.priority,
        "status": task.status,
        "due_at": task.due_at.isoformat() if task.due_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "created_at": task.created_at.isoformat(),
        "contact": contact_data,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

# IMPORTANT: /today and /overdue must come BEFORE /{task_id}

@router.get("/today")
def get_tasks_today(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Tasks due today (pending only)."""
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end   = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == "pending",
        Task.due_at >= start,
        Task.due_at <= end,
    ).order_by(Task.due_at).all()

    return [serialize_task(t) for t in tasks]


@router.get("/overdue")
def get_tasks_overdue(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Tasks past their due date (pending only)."""
    now = datetime.now(timezone.utc)
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == "pending",
        Task.due_at < start_of_today,
    ).order_by(Task.due_at).all()

    return [serialize_task(t) for t in tasks]


@router.get("/stats")
def get_task_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Quick counts for dashboard widget."""
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end   = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    total_pending  = db.query(Task).filter(Task.user_id == current_user.id, Task.status == "pending").count()
    due_today      = db.query(Task).filter(Task.user_id == current_user.id, Task.status == "pending", Task.due_at >= start, Task.due_at <= end).count()
    overdue        = db.query(Task).filter(Task.user_id == current_user.id, Task.status == "pending", Task.due_at < start).count()
    completed      = db.query(Task).filter(Task.user_id == current_user.id, Task.status == "completed").count()

    return {
        "total_pending": total_pending,
        "due_today": due_today,
        "overdue": overdue,
        "completed": completed,
    }


@router.get("/")
def get_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    task_type: Optional[str] = None,
    contact_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Task).filter(Task.user_id == current_user.id)

    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if task_type:
        query = query.filter(Task.task_type == task_type)
    if contact_id:
        query = query.filter(Task.contact_id == contact_id)

    tasks = query.order_by(Task.due_at.asc().nullslast(), Task.created_at.desc()).all()
    return [serialize_task(t) for t in tasks]


@router.post("/")
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    task = Task(
        user_id=current_user.id,
        title=data.title,
        notes=data.notes,
        task_type=data.task_type,
        priority=data.priority,
        due_at=data.due_at,
        contact_id=uuid.UUID(data.contact_id) if data.contact_id else None,
        status="pending",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.get("/{task_id}")
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return serialize_task(task)


@router.patch("/{task_id}")
def update_task(
    task_id: str,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if data.title is not None:
        task.title = data.title
    if data.notes is not None:
        task.notes = data.notes
    if data.task_type is not None:
        task.task_type = data.task_type
    if data.priority is not None:
        task.priority = data.priority
    if data.due_at is not None:
        task.due_at = data.due_at
    if data.contact_id is not None:
        task.contact_id = uuid.UUID(data.contact_id) if data.contact_id else None

    if data.status is not None:
        task.status = data.status
        if data.status == "completed" and not task.completed_at:
            task.completed_at = datetime.now(timezone.utc)
        elif data.status == "pending":
            task.completed_at = None

    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.delete("/{task_id}")
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"ok": True}


@router.post("/{task_id}/complete")
def complete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Quick complete endpoint — no body needed."""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = "completed"
    task.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    return serialize_task(task)
