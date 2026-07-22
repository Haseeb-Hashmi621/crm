from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.form import Form, FormSubmission
from app.schemas.form import FormCreate, FormUpdate, FormSubmissionCreate
from app.models.contact import Contact
from app.services import workflow_service
from datetime import datetime


def create_form(db: Session, user_id, data: FormCreate) -> Form:
    form = Form(
        user_id=user_id,
        name=data.name,
        description=data.description,
        fields=[f.model_dump() for f in data.fields],
        submit_button_text=data.submit_button_text,
        success_message=data.success_message,
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return form


def get_forms(db: Session, user_id) -> list[dict]:
    forms = db.query(Form).filter(Form.user_id == user_id).order_by(Form.created_at.desc()).all()
    result = []
    for form in forms:
        count = db.query(func.count(FormSubmission.id)).filter(FormSubmission.form_id == form.id).scalar()
        result.append({
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
            "submission_count": count,
        })
    return result


def get_form(db: Session, form_id: int, user_id) -> Form | None:
    return db.query(Form).filter(
        Form.id == form_id,
        Form.user_id == user_id
    ).first()


def get_form_public(db: Session, form_id: int) -> Form | None:
    return db.query(Form).filter(
        Form.id == form_id,
        Form.is_active == True
    ).first()


def update_form(db: Session, form_id: int, user_id, data: FormUpdate) -> Form | None:
    form = get_form(db, form_id, user_id)
    if not form:
        return None

    update_data = data.model_dump(exclude_unset=True)

    if "fields" in update_data and update_data["fields"] is not None:
        update_data["fields"] = [
            f if isinstance(f, dict) else f.model_dump()
            for f in data.fields
        ]

    for key, value in update_data.items():
        setattr(form, key, value)

    form.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(form)
    return form


def delete_form(db: Session, form_id: int, user_id) -> bool:
    form = get_form(db, form_id, user_id)
    if not form:
        return False

    db.delete(form)
    db.commit()
    return True


def submit_form(db: Session, form_id: int, data: FormSubmissionCreate, ip: str | None) -> dict:
    form = get_form_public(db, form_id)
    if not form:
        return {"success": False, "message": "Form not found or inactive"}

    submission = FormSubmission(
        form_id=form_id,
        data=data.data,
        submitter_ip=ip,
    )
    db.add(submission)
    db.flush()

    contact_created = False
    contact_id = None
    email = None
    name = None
    phone = None

    for field in form.fields:
        label_lower = field.get("label", "").lower()
        field_type = field.get("type", "")
        value = data.data.get(field.get("label", ""))

        if field_type == "email" or "email" in label_lower:
            email = value

        if "name" in label_lower and field_type == "text":
            name = value

        if (
            field_type == "phone"
            or "phone" in label_lower
            or "mobile" in label_lower
        ):
            phone = value

    if email:
        existing = db.query(Contact).filter(
            Contact.email == email,
            Contact.user_id == form.user_id
        ).first()

        if not existing:
            parts = (name or "").strip().split(" ", 1)

            contact = Contact(
                user_id=form.user_id,
                first_name=parts[0] or "Form",
                last_name=parts[1] if len(parts) > 1 else "Submission",
                email=email,
                phone=phone or "",
                status="lead",
                source="form",
                notes=f"Auto-created from form: {form.name}",
            )

            db.add(contact)
            db.flush()

            submission.contact_created = True
            submission.contact_id = contact.id

            contact_created = True
            contact_id = str(contact.id)

        else:
            submission.contact_id = existing.id
            contact_id = str(existing.id)

    db.commit()

    submitted_contact = None
    if contact_id:
        submitted_contact = db.query(Contact).filter(
            Contact.id == contact_id
        ).first()

    workflow_service.trigger_event(
        db,
        form.user_id,
        "form_submitted",
        {
            "contact": submitted_contact,
            "form_id": str(form_id),
            "summary": f"Form '{form.name}' submitted",
        },
    )

    return {
        "success": True,
        "message": form.success_message,
        "contact_created": contact_created,
        "contact_id": contact_id,
    }


def get_submissions(db: Session, form_id: int, user_id) -> list[FormSubmission]:
    form = get_form(db, form_id, user_id)
    if not form:
        return []

    return (
        db.query(FormSubmission)
        .filter(FormSubmission.form_id == form_id)
        .order_by(FormSubmission.created_at.desc())
        .all()
    )