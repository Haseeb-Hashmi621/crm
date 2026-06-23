from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.form import FormCreate, FormUpdate, FormOut, FormSubmissionCreate, FormSubmissionOut
import app.services.form_service as svc

router = APIRouter(tags=["Forms"])


# ── Auth-protected routes ──────────────────────────────────────────────────

@router.post("/", response_model=FormOut)
def create_form(
    data: FormCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.create_form(db, current_user.id, data)


@router.get("/", response_model=list[FormOut])
def list_forms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.get_forms(db, current_user.id)


@router.get("/{form_id}", response_model=FormOut)
def get_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    form = svc.get_form(db, form_id, current_user.id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    subs = svc.get_submissions(db, form_id, current_user.id)
    return {
        "id": form.id,
        "user_id": form.user_id,
        "name": form.name,
        "description": form.description,
        "fields": form.fields,
        "is_active": form.is_active,
        "submit_button_text": form.submit_button_text,
        "success_message": form.success_message,
        "created_at": form.created_at,
        "updated_at": form.updated_at,
        "submission_count": len(subs),
    }


@router.put("/{form_id}", response_model=FormOut)
def update_form(
    form_id: int,
    data: FormUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    form = svc.update_form(db, form_id, current_user.id, data)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


@router.delete("/{form_id}")
def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ok = svc.delete_form(db, form_id, current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Form not found")
    return {"message": "Form deleted"}


@router.get("/{form_id}/submissions", response_model=list[FormSubmissionOut])
def get_submissions(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.get_submissions(db, form_id, current_user.id)


# ── Public routes (no auth) ────────────────────────────────────────────────

@router.get("/public/{form_id}")
def get_public_form(form_id: int, db: Session = Depends(get_db)):
    form = svc.get_form_public(db, form_id)
    if not form:
        raise HTTPException(status_code=404, detail="Form not found or inactive")
    return {
        "id": form.id,
        "name": form.name,
        "description": form.description,
        "fields": form.fields,
        "submit_button_text": form.submit_button_text,
        "success_message": form.success_message,
    }


@router.post("/public/{form_id}/submit")
def submit_form(
    form_id: int,
    data: FormSubmissionCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else None
    result = svc.submit_form(db, form_id, data, ip)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result