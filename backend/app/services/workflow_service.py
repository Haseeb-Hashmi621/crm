from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

from app.models.workflow import WorkflowRule, WorkflowRunLog
from app.models.contact import Contact
from app.models.tag import Tag
from app.models.task import Task
from app.services.notification_service import create_notification
from app.core.config import settings
import resend

resend.api_key = settings.RESEND_API_KEY


TRIGGER_TYPES = [
    {
        "id": "contact_created", "label": "Contact Created",
        "description": "Fires whenever a new contact is added.",
        "config_fields": [],
    },
    {
        "id": "deal_created", "label": "Deal Created",
        "description": "Fires whenever a new deal is added to the pipeline.",
        "config_fields": [],
    },
    {
        "id": "deal_stage_changed", "label": "Deal Stage Changed",
        "description": "Fires when a deal moves to a specific stage (leave blank for any stage).",
        "config_fields": [
            {"key": "stage", "label": "Stage (optional)", "type": "select",
             "options": ["new", "contacted", "proposal", "negotiation", "won", "lost"]}
        ],
    },
    {
        "id": "tag_added", "label": "Tag Added to Contact",
        "description": "Fires when a specific tag (or any tag) is added to a contact.",
        "config_fields": [
            {"key": "tag_name", "label": "Tag name (optional)", "type": "text"}
        ],
    },
    {
        "id": "form_submitted", "label": "Form Submitted",
        "description": "Fires whenever a public lead-capture form receives a submission.",
        "config_fields": [
            {"key": "form_id", "label": "Form ID (optional, blank = any form)", "type": "text"}
        ],
    },
]

ACTION_TYPES = [
    {
        "id": "create_task", "label": "Create Task",
        "description": "Creates a follow-up task, linked to the triggering contact when available.",
        "config_fields": [
            {"key": "title", "label": "Task title", "type": "text"},
            {"key": "task_type", "label": "Type", "type": "select", "options": ["call", "email", "follow_up", "meeting"]},
            {"key": "priority", "label": "Priority", "type": "select", "options": ["low", "medium", "high"]},
            {"key": "due_in_days", "label": "Due in (days)", "type": "number"},
        ],
    },
    {
        "id": "add_tag", "label": "Add Tag to Contact",
        "description": "Tags the triggering contact.",
        "config_fields": [{"key": "tag_name", "label": "Tag name", "type": "text"}],
    },
    {
        "id": "send_notification", "label": "Send In-App Notification",
        "description": "Creates a notification for yourself inside the CRM.",
        "config_fields": [
            {"key": "title", "label": "Title", "type": "text"},
            {"key": "message", "label": "Message", "type": "text"},
        ],
    },
    {
        "id": "send_email", "label": "Send Email to Contact",
        "description": "Emails the triggering contact (requires the contact to have an email address).",
        "config_fields": [
            {"key": "subject", "label": "Subject", "type": "text"},
            {"key": "body", "label": "Body", "type": "textarea"},
        ],
    },
    {
        "id": "enroll_in_sequence", "label": "Enroll in Email Sequence",
        "description": "Enrolls the triggering contact into a drip email sequence.",
        "config_fields": [
            {"key": "sequence_id", "label": "Sequence ID", "type": "text"},
        ],
    },
]


def get_meta() -> dict:
    return {"triggers": TRIGGER_TYPES, "actions": ACTION_TYPES}


def _personalize(text: str, contact: Optional[Contact]) -> str:
    if not text:
        return text
    if not contact:
        return text
    name = f"{contact.first_name or ''} {contact.last_name or ''}".strip()
    return (
        text.replace("{{name}}", name or "there")
            .replace("{{email}}", contact.email or "")
            .replace("{{company}}", contact.company or "")
    )


# ── CRUD ──────────────────────────────────────────────────────────────────

def get_rules(db: Session, user_id: uuid.UUID) -> List[WorkflowRule]:
    return db.query(WorkflowRule).filter(
        WorkflowRule.user_id == user_id
    ).order_by(WorkflowRule.created_at.desc()).all()


def get_rule(db: Session, rule_id: str, user_id: uuid.UUID) -> Optional[WorkflowRule]:
    return db.query(WorkflowRule).filter(
        WorkflowRule.id == rule_id, WorkflowRule.user_id == user_id
    ).first()


def create_rule(db: Session, data, user_id: uuid.UUID) -> WorkflowRule:
    rule = WorkflowRule(
        user_id=user_id,
        name=data.name,
        description=data.description,
        trigger_type=data.trigger_type,
        trigger_config=data.trigger_config or {},
        actions=[a.model_dump() for a in data.actions],
        is_active=data.is_active,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def update_rule(db: Session, rule_id: str, data, user_id: uuid.UUID) -> Optional[WorkflowRule]:
    rule = get_rule(db, rule_id, user_id)
    if not rule:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("actions") is not None:
        update_data["actions"] = [a if isinstance(a, dict) else a.model_dump() for a in data.actions]
    for key, value in update_data.items():
        setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return rule


def delete_rule(db: Session, rule_id: str, user_id: uuid.UUID) -> bool:
    rule = get_rule(db, rule_id, user_id)
    if not rule:
        return False
    db.delete(rule)
    db.commit()
    return True


def get_run_logs(db: Session, rule_id: str, user_id: uuid.UUID, limit: int = 50) -> List[WorkflowRunLog]:
    return (
        db.query(WorkflowRunLog)
        .filter(WorkflowRunLog.workflow_id == rule_id, WorkflowRunLog.user_id == user_id)
        .order_by(WorkflowRunLog.created_at.desc())
        .limit(limit)
        .all()
    )


# ── Action executors ──────────────────────────────────────────────────────

def _exec_create_task(db: Session, user_id: uuid.UUID, config: dict, contact: Optional[Contact]) -> dict:
    title = _personalize(config.get("title") or "Follow up", contact)
    due_days = int(config.get("due_in_days") or 1)
    task = Task(
        user_id=user_id,
        contact_id=contact.id if contact else None,
        title=title,
        task_type=config.get("task_type") or "follow_up",
        priority=config.get("priority") or "medium",
        status="pending",
        due_at=datetime.now(timezone.utc) + timedelta(days=due_days),
        notes="Created automatically by a workflow automation rule.",
    )
    db.add(task)
    db.flush()
    return {"type": "create_task", "success": True, "detail": f"Task '{title}' created"}


def _exec_add_tag(db: Session, user_id: uuid.UUID, config: dict, contact: Optional[Contact]) -> dict:
    if not contact:
        return {"type": "add_tag", "success": False, "detail": "No contact in trigger context"}
    tag_name = (config.get("tag_name") or "").strip()
    if not tag_name:
        return {"type": "add_tag", "success": False, "detail": "No tag name configured"}
    tag = db.query(Tag).filter(Tag.name == tag_name, Tag.user_id == user_id).first()
    if not tag:
        tag = Tag(name=tag_name, user_id=user_id)
        db.add(tag)
        db.flush()
    if tag not in contact.tags:
        contact.tags.append(tag)
        db.flush()
    return {"type": "add_tag", "success": True, "detail": f"Tagged '{tag_name}'"}


def _exec_send_notification(db: Session, user_id: uuid.UUID, config: dict, contact: Optional[Contact]) -> dict:
    title = _personalize(config.get("title") or "Workflow triggered", contact)
    message = _personalize(config.get("message") or "", contact)
    create_notification(db, user_id, type="workflow", title=title, message=message)
    return {"type": "send_notification", "success": True, "detail": f"Notification '{title}' sent"}


def _exec_send_email(db: Session, user_id: uuid.UUID, config: dict, contact: Optional[Contact]) -> dict:
    if not contact or not contact.email:
        return {"type": "send_email", "success": False, "detail": "Contact has no email"}
    subject = _personalize(config.get("subject") or "", contact)
    body = _personalize(config.get("body") or "", contact)
    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": contact.email,
            "subject": subject,
            "html": f"<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;'>{body.replace(chr(10), '<br>')}</div>",
        })
        return {"type": "send_email", "success": True, "detail": f"Email sent to {contact.email}"}
    except Exception as e:
        return {"type": "send_email", "success": False, "detail": str(e)[:200]}


def _exec_enroll_in_sequence(db: Session, user_id: uuid.UUID, config: dict, contact: Optional[Contact]) -> dict:
    if not contact:
        return {"type": "enroll_in_sequence", "success": False, "detail": "No contact in trigger context"}
    if not contact.email:
        return {"type": "enroll_in_sequence", "success": False, "detail": "Contact has no email"}

    sequence_id = (config.get("sequence_id") or "").strip()
    if not sequence_id:
        return {"type": "enroll_in_sequence", "success": False, "detail": "No sequence configured"}

    from app.services.email_sequence_service import enroll_contacts
    result = enroll_contacts(db, sequence_id, user_id, [contact.id])
    if "error" in result:
        return {"type": "enroll_in_sequence", "success": False, "detail": result["error"]}
    if result["enrolled"] == 0:
        return {"type": "enroll_in_sequence", "success": False, "detail": result["skipped_reasons"][0] if result["skipped_reasons"] else "Already enrolled"}
    return {"type": "enroll_in_sequence", "success": True, "detail": "Enrolled in sequence"}


ACTION_EXECUTORS = {
    "create_task": _exec_create_task,
    "add_tag": _exec_add_tag,
    "send_notification": _exec_send_notification,
    "send_email": _exec_send_email,
    "enroll_in_sequence": _exec_enroll_in_sequence,
}


def _matches_trigger(rule: WorkflowRule, event_type: str, context: dict) -> bool:
    if rule.trigger_type != event_type:
        return False
    config = rule.trigger_config or {}

    if event_type == "deal_stage_changed":
        wanted_stage = config.get("stage")
        if wanted_stage and context.get("stage") != wanted_stage:
            return False

    if event_type == "tag_added":
        wanted_tag = (config.get("tag_name") or "").strip().lower()
        if wanted_tag and (context.get("tag_name") or "").strip().lower() != wanted_tag:
            return False

    if event_type == "form_submitted":
        wanted_form = str(config.get("form_id") or "").strip()
        if wanted_form and str(context.get("form_id") or "") != wanted_form:
            return False

    return True


def trigger_event(db: Session, user_id: uuid.UUID, event_type: str, context: dict) -> None:
    """
    Called from other services (contact/deal/tag/form) right after the
    triggering action succeeds. Never raises — a workflow failure must
    never break the calling feature (contact creation, deal update, etc.).
    """
    try:
        rules = (
            db.query(WorkflowRule)
            .filter(
                WorkflowRule.user_id == user_id,
                WorkflowRule.trigger_type == event_type,
                WorkflowRule.is_active == True,
            )
            .all()
        )
    except Exception:
        return

    if not rules:
        return

    contact: Optional[Contact] = context.get("contact")

    for rule in rules:
        if not _matches_trigger(rule, event_type, context):
            continue

        executed = []
        success = True

        try:
            for action in (rule.actions or []):
                a_type = action.get("type")
                executor = ACTION_EXECUTORS.get(a_type)
                if not executor:
                    executed.append({"type": a_type, "success": False, "detail": "Unknown action type"})
                    continue
                result = executor(db, user_id, action.get("config") or {}, contact)
                executed.append(result)
                if not result.get("success"):
                    success = False

            rule.run_count = (rule.run_count or 0) + 1
            rule.last_run_at = datetime.now(timezone.utc)
            rule.last_error = None if success else "One or more actions failed — see run log"

            db.add(WorkflowRunLog(
                workflow_id=rule.id,
                user_id=user_id,
                trigger_type=event_type,
                context_summary=str(context.get("summary") or "")[:500],
                success=success,
                actions_executed=executed,
            ))
            db.commit()

        except Exception as e:
            db.rollback()
            try:
                rule.last_error = str(e)[:500]
                db.add(WorkflowRunLog(
                    workflow_id=rule.id,
                    user_id=user_id,
                    trigger_type=event_type,
                    context_summary=str(context.get("summary") or "")[:500],
                    success=False,
                    error=str(e)[:500],
                    actions_executed=executed,
                ))
                db.commit()
            except Exception:
                db.rollback()