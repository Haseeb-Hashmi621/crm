from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.security import get_password_hash
from app.models.user import User

router = APIRouter()

VALID_ROLES = {"admin", "manager", "agent", "employee"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserAdminResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "employee"   # 'admin' | 'manager' | 'agent' | 'employee'


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None   # if provided, reset password


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserAdminResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all users in the system (admin only)."""
    return db.query(User).order_by(User.created_at.asc()).all()


@router.post("/users", response_model=UserAdminResponse, status_code=201)
def create_user(
    data: CreateUserRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Create a new user account (admin only)."""
    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {sorted(VALID_ROLES)}")

    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserAdminResponse)
def update_user(
    user_id: UUID,
    data: UpdateUserRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Update a user's details or role (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from demoting themselves if they're the only admin
    if data.role and data.role != "admin" and str(user.id) == str(admin.id):
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot demote the only admin. Promote another user first."
            )

    if data.role and data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {sorted(VALID_ROLES)}")

    if data.email:
        existing = db.query(User).filter(User.email == data.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = data.email

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        user.role = data.role
    if data.password:
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        user.hashed_password = get_password_hash(data.password)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Delete a user account (admin only). Cannot delete yourself."""
    if str(user_id) == str(admin.id):
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deleting last admin
    if user.role == "admin":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the only admin account."
            )

    db.delete(user)
    db.commit()