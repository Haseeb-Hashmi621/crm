from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import uuid
import resend

from app.core.config import settings
from app.models.email_sequence import (
    EmailSequence, EmailSequenceStep, SequenceEnrollment, SequenceStepSend
)
from app.models.contact import Contact
from app.models.activity import Activity
from app.schemas.email_sequence import SequenceCreate, SequenceUpdate

resend.api_key = settings.RESEND_API_KEY


# ── Sequence CRUD ────────────────────────────────────────────────────────────

def get_sequences(db: Session, user_id: uuid.UUID) -> List[EmailSequence]:
    return db.query(EmailSequence).filter(
        EmailSequence.user_id == user_id
    ).order_by(EmailSequence.created_at.desc()).all()


def get_sequence(db: Session, sequence_id: str, user_id: uuid.UUID) -> Optional[EmailSequence]:
    return db.query(EmailSequence).filter(
        EmailSequence.id == sequence_id, EmailSequence.user_id == user_id
    ).first()


def create_sequence(db: Session, data: SequenceCreate, user_id: uuid.UUID) -> EmailSequence:
    sequence = EmailSequence(
        user_id=user_id,
        name=data.name,
        description=data.description,
        exit_on_reply=data.exit_on_reply,
        from_name=data.from_name,
        status="draft",
    )
    db.add(sequence)
    db.flush()

    for i, step in enumerate(data.steps):
        db.add(EmailSequenceStep(
            sequence_id=sequence.id,
            step_order=i,
            subject=step.subject,
            body=step.body,
            delay_days=step.delay_days,
            delay_hours=step.delay_hours,
        ))

    db.commit()
    db.refresh(sequence)
    return sequence


def update_sequence(
    db: Session, sequence_id: str, data: SequenceUpdate, user_id: uuid.UUID
) -> Optional[EmailSequence]:
    sequence = get_sequence(db, sequence_id, user_id)
    if not sequence:
        return None

    update_data = data.model_dump(exclude_unset=True, exclude={"steps"})
    for key, value in update_data.items():
        setattr(sequence, key, value)

    if data.steps is not None:
        db.query(EmailSequenceStep).filter(EmailSequenceStep.sequence_id == sequence.id).delete()
        for i, step in enumerate(data.steps):
            db.add(EmailSequenceStep(
                sequence_id=sequence.id,
                step_order=i,
                subject=step.subject,
                body=step.body,
                delay_days=step.delay_days,
                delay_hours=step.delay_hours,
            ))

    db.commit()
    db.refresh(sequence)
    return sequence


def delete_sequence(db: Session, sequence_id: str, user_id: uuid.UUID) -> bool:
    sequence = get_sequence(db, sequence_id, user_id)
    if not sequence:
        return False
    db.delete(sequence)
    db.commit()
    return True


def get_sequence_stats(db: Session, sequence_id: str, user_id: uuid.UUID) -> Optional[dict]:
    sequence = get_sequence(db, sequence_id, user_id)
    if not sequence:
        return None

    enrollments = db.query(SequenceEnrollment).filter(
        SequenceEnrollment.sequence_id == sequence_id
    ).all()

    counts = {"active": 0, "completed": 0, "paused": 0, "cancelled": 0, "exited": 0, "failed": 0}
    for e in enrollments:
        if e.status in counts:
            counts[e.status] += 1

    total_sent = db.query(SequenceStepSend).join(
        SequenceEnrollment, SequenceStepSend.enrollment_id == SequenceEnrollment.id
    ).filter(
        SequenceEnrollment.sequence_id == sequence_id,
        SequenceStepSend.status == "sent",
    ).count()

    return {
        "sequence_id": sequence.id,
        "total_enrolled": len(enrollments),
        "total_emails_sent": total_sent,
        **counts,
    }


# ── Personalization ──────────────────────────────────────────────────────────

def _personalize(text: str, contact: Contact) -> str:
    name = f"{contact.first_name or ''} {contact.last_name or ''}".strip() or "there"
    return (
        (text or "")
        .replace("{{name}}", name)
        .replace("{{email}}", contact.email or "")
        .replace("{{company}}", contact.company or "")
    )


def _compute_send_at(base_time: datetime, step: EmailSequenceStep) -> datetime:
    return base_time + timedelta(days=step.delay_days or 0, hours=step.delay_hours or 0)


# ── Enrollment ────────────────────────────────────────────────────────────

def enroll_contacts(
    db: Session, sequence_id: str, user_id: uuid.UUID, contact_ids: List[uuid.UUID]
) -> dict:
    sequence = get_sequence(db, sequence_id, user_id)
    if not sequence:
        return {"error": "Sequence not found"}
    if not sequence.steps:
        return {"error": "Sequence has no steps — add at least one step before enrolling contacts"}

    first_step = sequence.steps[0]
    now = datetime.now(timezone.utc)

    enrolled = 0
    skipped = 0
    reasons = []

    for contact_id in contact_ids:
        contact = db.query(Contact).filter(
            Contact.id == contact_id, Contact.user_id == user_id
        ).first()
        if not contact:
            skipped += 1
            reasons.append(f"Contact {contact_id} not found")
            continue
        if not contact.email:
            skipped += 1
            reasons.append(f"{contact.first_name or contact_id} has no email")
            continue

        existing = db.query(SequenceEnrollment).filter(
            SequenceEnrollment.sequence_id == sequence_id,
            SequenceEnrollment.contact_id == contact_id,
            SequenceEnrollment.status.in_(["active", "paused"]),
        ).first()
        if existing:
            skipped += 1
            reasons.append(f"{contact.first_name or contact_id} already enrolled")
            continue

        enrollment = SequenceEnrollment(
            sequence_id=sequence_id,
            contact_id=contact_id,
            user_id=user_id,
            status="active",
            current_step_index=0,
            enrolled_at=now,
            next_send_at=_compute_send_at(now, first_step),
        )
        db.add(enrollment)
        enrolled += 1

    # Auto-activate a draft sequence the moment someone is enrolled
    if enrolled > 0 and sequence.status == "draft":
        sequence.status = "active"

    db.commit()
    return {"enrolled": enrolled, "skipped": skipped, "skipped_reasons": reasons[:20]}


def get_enrollments(db: Session, sequence_id: str, user_id: uuid.UUID) -> List[SequenceEnrollment]:
    sequence = get_sequence(db, sequence_id, user_id)
    if not sequence:
        return []
    return db.query(SequenceEnrollment).filter(
        SequenceEnrollment.sequence_id == sequence_id
    ).order_by(SequenceEnrollment.enrolled_at.desc()).all()


def _get_enrollment(db: Session, enrollment_id: str, user_id: uuid.UUID) -> Optional[SequenceEnrollment]:
    return db.query(SequenceEnrollment).filter(
        SequenceEnrollment.id == enrollment_id, SequenceEnrollment.user_id == user_id
    ).first()


def pause_enrollment(db: Session, enrollment_id: str, user_id: uuid.UUID) -> dict:
    enrollment = _get_enrollment(db, enrollment_id, user_id)
    if not enrollment:
        return {"error": "Enrollment not found"}
    if enrollment.status != "active":
        return {"error": f"Cannot pause an enrollment with status '{enrollment.status}'"}
    enrollment.status = "paused"
    db.commit()
    return {"enrollment": enrollment}


def resume_enrollment(db: Session, enrollment_id: str, user_id: uuid.UUID) -> dict:
    enrollment = _get_enrollment(db, enrollment_id, user_id)
    if not enrollment:
        return {"error": "Enrollment not found"}
    if enrollment.status != "paused":
        return {"error": f"Cannot resume an enrollment with status '{enrollment.status}'"}

    sequence = db.query(EmailSequence).filter(EmailSequence.id == enrollment.sequence_id).first()
    now = datetime.now(timezone.utc)
    # If resumed after its scheduled time already passed, send on next tick
    if not enrollment.next_send_at or enrollment.next_send_at < now:
        enrollment.next_send_at = now
    enrollment.status = "active"
    db.commit()
    return {"enrollment": enrollment}


def cancel_enrollment(db: Session, enrollment_id: str, user_id: uuid.UUID) -> dict:
    enrollment = _get_enrollment(db, enrollment_id, user_id)
    if not enrollment:
        return {"error": "Enrollment not found"}
    if enrollment.status in ("completed", "cancelled"):
        return {"error": f"Enrollment already '{enrollment.status}'"}
    enrollment.status = "cancelled"
    enrollment.next_send_at = None
    db.commit()
    return {"enrollment": enrollment}


# ── Processing (called by the scheduler) ────────────────────────────────────

def _has_replied_since(db: Session, contact_id: uuid.UUID, since: datetime) -> bool:
    reply = db.query(Activity).filter(
        Activity.contact_id == contact_id,
        Activity.content.like("[Inbound]%"),
        Activity.created_at >= since,
    ).first()
    return reply is not None


def process_due_enrollments(db: Session) -> dict:
    """Called every scheduler tick. Sends the current due step for every
    active enrollment, advances to the next step (or completes), and
    honors exit_on_reply. Isolated per-enrollment try/except so one bad
    contact never blocks the rest of the batch."""
    now = datetime.now(timezone.utc)

    due = db.query(SequenceEnrollment).filter(
        SequenceEnrollment.status == "active",
        SequenceEnrollment.next_send_at.isnot(None),
        SequenceEnrollment.next_send_at <= now,
    ).all()

    sent_count = 0
    failed_count = 0
    exited_count = 0

    for enrollment in due:
        try:
            sequence = db.query(EmailSequence).filter(
                EmailSequence.id == enrollment.sequence_id
            ).first()
            if not sequence or sequence.status != "active":
                continue

            contact = db.query(Contact).filter(Contact.id == enrollment.contact_id).first()
            if not contact or not contact.email:
                enrollment.status = "failed"
                enrollment.last_error = "Contact has no email"
                db.commit()
                failed_count += 1
                continue

            # Exit-on-reply check
            if sequence.exit_on_reply and _has_replied_since(db, contact.id, enrollment.enrolled_at):
                enrollment.status = "exited"
                enrollment.next_send_at = None
                db.commit()
                exited_count += 1
                continue

            steps = sorted(sequence.steps, key=lambda s: s.step_order)
            if enrollment.current_step_index >= len(steps):
                enrollment.status = "completed"
                enrollment.completed_at = now
                enrollment.next_send_at = None
                db.commit()
                continue

            step = steps[enrollment.current_step_index]

            subject = _personalize(step.subject, contact)
            body = _personalize(step.body, contact)
            html_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                {body.replace(chr(10), '<br>')}
            </div>
            """

            send_status = "sent"
            error_msg = None
            try:
                params = {
                    "from": (f"{sequence.from_name} <{settings.RESEND_FROM_EMAIL}>"
                             if sequence.from_name else settings.RESEND_FROM_EMAIL),
                    "to": contact.email,
                    "subject": subject,
                    "html": html_body,
                }
                resend.Emails.send(params)
                sent_count += 1
            except Exception as e:
                send_status = "failed"
                error_msg = str(e)[:500]
                failed_count += 1

            db.add(SequenceStepSend(
                enrollment_id=enrollment.id,
                step_id=step.id,
                status=send_status,
                error=error_msg,
            ))

            # Advance regardless of send success — a bounce shouldn't infinite-loop
            enrollment.current_step_index += 1
            if enrollment.current_step_index < len(steps):
                next_step = steps[enrollment.current_step_index]
                enrollment.next_send_at = _compute_send_at(now, next_step)
            else:
                enrollment.status = "completed"
                enrollment.completed_at = now
                enrollment.next_send_at = None

            enrollment.last_error = error_msg
            db.commit()

        except Exception as e:
            db.rollback()
            try:
                enrollment.last_error = str(e)[:500]
                db.commit()
            except Exception:
                db.rollback()

    return {"processed": len(due), "sent": sent_count, "failed": failed_count, "exited": exited_count}