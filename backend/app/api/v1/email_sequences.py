from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.email_sequence import (
    SequenceCreate, SequenceUpdate, SequenceResponse, SequenceStatsResponse,
    EnrollRequest, EnrollResponse, EnrollmentResponse,
)
from app.services.email_sequence_service import (
    get_sequences, get_sequence, create_sequence, update_sequence, delete_sequence,
    get_sequence_stats, enroll_contacts, get_enrollments,
    pause_enrollment, resume_enrollment, cancel_enrollment,
)
from typing import List

router = APIRouter()


@router.get("/", response_model=List[SequenceResponse])
def list_sequences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_sequences(db, current_user.id)


@router.post("/", response_model=SequenceResponse, status_code=201)
def add_sequence(
    data: SequenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_sequence(db, data, current_user.id)


@router.get("/{sequence_id}", response_model=SequenceResponse)
def get_one_sequence(
    sequence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sequence = get_sequence(db, sequence_id, current_user.id)
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return sequence


@router.patch("/{sequence_id}", response_model=SequenceResponse)
def edit_sequence(
    sequence_id: str,
    data: SequenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.status and data.status not in ("draft", "active", "paused", "archived"):
        raise HTTPException(status_code=400, detail="Invalid status")
    sequence = update_sequence(db, sequence_id, data, current_user.id)
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return sequence


@router.delete("/{sequence_id}")
def remove_sequence(
    sequence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = delete_sequence(db, sequence_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return {"message": "Sequence deleted"}


@router.get("/{sequence_id}/stats", response_model=SequenceStatsResponse)
def sequence_stats(
    sequence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stats = get_sequence_stats(db, sequence_id, current_user.id)
    if not stats:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return stats


@router.post("/{sequence_id}/enroll", response_model=EnrollResponse)
def enroll_route(
    sequence_id: str,
    data: EnrollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.contact_ids:
        raise HTTPException(status_code=400, detail="At least one contact_id is required")
    result = enroll_contacts(db, sequence_id, current_user.id, data.contact_ids)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{sequence_id}/enrollments", response_model=List[EnrollmentResponse])
def list_enrollments(
    sequence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_enrollments(db, sequence_id, current_user.id)


@router.post("/enrollments/{enrollment_id}/pause", response_model=EnrollmentResponse)
def pause_enrollment_route(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = pause_enrollment(db, enrollment_id, current_user.id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["enrollment"]


@router.post("/enrollments/{enrollment_id}/resume", response_model=EnrollmentResponse)
def resume_enrollment_route(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = resume_enrollment(db, enrollment_id, current_user.id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["enrollment"]


@router.post("/enrollments/{enrollment_id}/cancel", response_model=EnrollmentResponse)
def cancel_enrollment_route(
    enrollment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = cancel_enrollment(db, enrollment_id, current_user.id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["enrollment"]