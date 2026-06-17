from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import resend

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.mail import Email
from app.models.contact import Contact

resend.api_key = settings.RESEND_API_KEY

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class ContactMini(BaseModel):
    id: uuid.UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class EmailListItem(BaseModel):
    id: uuid.UUID
    folder: str
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    recipient_email: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    is_read: bool
    is_starred: bool
    has_attachments: bool
    created_at: datetime
    contact: Optional[ContactMini] = None

    class Config:
        from_attributes = True


class EmailDetail(EmailListItem):
    cc_emails: Optional[str] = None
    thread: Optional["EmailListItem"] = None


class EmailListResponse(BaseModel):
    items: List[EmailListItem]
    total: int
    page: int
    page_size: int
    has_more: bool


class FolderCounts(BaseModel):
    inbox: int
    sent: int
    drafts: int
    trash: int
    unread: int


class SendEmailRequest(BaseModel):
    recipient_email: str
    cc_emails: Optional[str] = None
    subject: str
    body: str
    contact_id: Optional[uuid.UUID] = None


class DraftEmailRequest(BaseModel):
    id: Optional[uuid.UUID] = None
    recipient_email: Optional[str] = None
    cc_emails: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    contact_id: Optional[uuid.UUID] = None


class ReplyRequest(BaseModel):
    original_email_id: uuid.UUID
    body: str


class ForwardRequest(BaseModel):
    original_email_id: uuid.UUID
    recipient_email: str
    body: Optional[str] = None


class MoveRequest(BaseModel):
    folder: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def _build_contact_mini(contact) -> Optional[ContactMini]:
    if not contact:
        return None
    return ContactMini(
        id=contact.id,
        first_name=contact.first_name,
        last_name=contact.last_name,
        company=contact.company,
        email=contact.email,
    )


def _serialize_email(email: Email) -> dict:
    return {
        "id": email.id,
        "folder": email.folder,
        "sender_name": email.sender_name,
        "sender_email": email.sender_email,
        "recipient_email": email.recipient_email,
        "subject": email.subject,
        "body": email.body,
        "is_read": email.is_read,
        "is_starred": email.is_starred,
        "has_attachments": email.has_attachments,
        "created_at": email.created_at,
        "contact": _build_contact_mini(email.contact),
    }


def _serialize_email_detail(email: Email) -> dict:
    d = _serialize_email(email)
    d["cc_emails"] = email.cc_emails
    d["thread"] = _serialize_email(email.thread) if email.thread else None
    return d


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/folder-counts", response_model=FolderCounts)
def get_folder_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = db.query(Email).filter(Email.user_id == current_user.id)
    inbox_count = base.filter(Email.folder == "inbox").count()
    sent_count = base.filter(Email.folder == "sent").count()
    drafts_count = base.filter(Email.folder == "drafts").count()
    trash_count = base.filter(Email.folder == "trash").count()
    unread_count = base.filter(Email.folder == "inbox", Email.is_read == False).count()
    return FolderCounts(
        inbox=inbox_count,
        sent=sent_count,
        drafts=drafts_count,
        trash=trash_count,
        unread=unread_count,
    )


@router.get("/", response_model=EmailListResponse)
def list_emails(
    folder: str = Query("inbox"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    filter: Optional[str] = Query(None),   # unread | starred
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Email).filter(
        Email.user_id == current_user.id,
        Email.folder == folder,
    )

    if filter == "unread":
        query = query.filter(Email.is_read == False)
    elif filter == "starred":
        query = query.filter(Email.is_starred == True)

    if search and search.strip():
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Email.subject).like(s),
                func.lower(Email.body).like(s),
                func.lower(Email.sender_name).like(s),
                func.lower(Email.sender_email).like(s),
                func.lower(Email.recipient_email).like(s),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    emails = query.order_by(desc(Email.created_at)).offset(offset).limit(page_size).all()

    return EmailListResponse(
        items=[EmailListItem(**_serialize_email(e)) for e in emails],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + page_size) < total,
    )


@router.get("/{email_id}")
def get_email(
    email_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    email = db.query(Email).filter(
        Email.id == email_id,
        Email.user_id == current_user.id,
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    # Mark as read
    if not email.is_read and email.folder == "inbox":
        email.is_read = True
        db.commit()

    return _serialize_email_detail(email)


@router.post("/send")
def send_email(
    data: SendEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get sender name from user profile
    sender_name = current_user.full_name or "CRM User"
    sender_email = settings.RESEND_FROM_EMAIL

    # Build HTML body
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        {data.body.replace(chr(10), '<br>')}
    </div>
    """

    # Build to list
    to_list = [data.recipient_email.strip()]
    if data.cc_emails:
        cc_list = [e.strip() for e in data.cc_emails.split(",") if e.strip()]
    else:
        cc_list = []

    try:
        params: dict = {
            "from": f"{sender_name} <{sender_email}>",
            "to": to_list,
            "subject": data.subject,
            "html": html_body,
        }
        if cc_list:
            params["cc"] = cc_list

        result = resend.Emails.send(params)
        external_id = result.get("id") if isinstance(result, dict) else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    # Store sent email
    db_email = Email(
        user_id=current_user.id,
        contact_id=data.contact_id,
        folder="sent",
        sender_name=sender_name,
        sender_email=sender_email,
        recipient_email=data.recipient_email.strip(),
        cc_emails=data.cc_emails,
        subject=data.subject,
        body=data.body,
        is_read=True,
        external_id=external_id,
    )
    db.add(db_email)
    db.commit()
    db.refresh(db_email)
    return _serialize_email(db_email)


@router.post("/draft")
def save_draft(
    data: DraftEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.id:
        # Update existing draft
        existing = db.query(Email).filter(
            Email.id == data.id,
            Email.user_id == current_user.id,
            Email.folder == "drafts",
        ).first()
        if existing:
            if data.recipient_email is not None:
                existing.recipient_email = data.recipient_email
            if data.subject is not None:
                existing.subject = data.subject
            if data.body is not None:
                existing.body = data.body
            if data.cc_emails is not None:
                existing.cc_emails = data.cc_emails
            if data.contact_id is not None:
                existing.contact_id = data.contact_id
            db.commit()
            db.refresh(existing)
            return _serialize_email(existing)

    # Create new draft
    sender_name = current_user.full_name or "CRM User"
    draft = Email(
        user_id=current_user.id,
        contact_id=data.contact_id,
        folder="drafts",
        sender_name=sender_name,
        sender_email=settings.RESEND_FROM_EMAIL,
        recipient_email=data.recipient_email,
        cc_emails=data.cc_emails,
        subject=data.subject,
        body=data.body,
        is_read=True,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return _serialize_email(draft)


@router.post("/reply")
def reply_to_email(
    data: ReplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original = db.query(Email).filter(
        Email.id == data.original_email_id,
        Email.user_id == current_user.id,
    ).first()
    if not original:
        raise HTTPException(status_code=404, detail="Original email not found")

    recipient = original.sender_email or original.recipient_email
    subject = original.subject or ""
    if not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"

    sender_name = current_user.full_name or "CRM User"
    sender_email = settings.RESEND_FROM_EMAIL

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        {data.body.replace(chr(10), '<br>')}
        <br><br>
        <div style="border-left: 3px solid #ccc; padding-left: 12px; color: #666; margin-top: 16px;">
            <p><strong>From:</strong> {original.sender_name} ({original.sender_email})</p>
            <p>{(original.body or '').replace(chr(10), '<br>')}</p>
        </div>
    </div>
    """

    try:
        resend.Emails.send({
            "from": f"{sender_name} <{sender_email}>",
            "to": [recipient],
            "subject": subject,
            "html": html_body,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send reply: {str(e)}")

    reply = Email(
        user_id=current_user.id,
        contact_id=original.contact_id,
        folder="sent",
        sender_name=sender_name,
        sender_email=sender_email,
        recipient_email=recipient,
        subject=subject,
        body=data.body,
        thread_id=original.id,
        is_read=True,
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return _serialize_email_detail(reply)


@router.post("/forward")
def forward_email(
    data: ForwardRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original = db.query(Email).filter(
        Email.id == data.original_email_id,
        Email.user_id == current_user.id,
    ).first()
    if not original:
        raise HTTPException(status_code=404, detail="Original email not found")

    subject = original.subject or ""
    if not subject.lower().startswith("fwd:"):
        subject = f"Fwd: {subject}"

    sender_name = current_user.full_name or "CRM User"
    sender_email = settings.RESEND_FROM_EMAIL

    fwd_body = f"""
---------- Forwarded message ----------
From: {original.sender_name} <{original.sender_email}>
Subject: {original.subject}

{original.body or ''}
"""

    full_body = f"{data.body or ''}\n\n{fwd_body}" if data.body else fwd_body

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        {(data.body or '').replace(chr(10), '<br>')}
        <br><br>
        <div style="border-top: 1px solid #eee; margin-top: 16px; padding-top: 16px; color: #666; font-size: 13px;">
            <p>---------- Forwarded message ----------</p>
            <p><strong>From:</strong> {original.sender_name} &lt;{original.sender_email}&gt;</p>
            <p><strong>Subject:</strong> {original.subject}</p>
            <br>
            {(original.body or '').replace(chr(10), '<br>')}
        </div>
    </div>
    """

    try:
        resend.Emails.send({
            "from": f"{sender_name} <{sender_email}>",
            "to": [data.recipient_email.strip()],
            "subject": subject,
            "html": html_body,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to forward email: {str(e)}")

    fwd = Email(
        user_id=current_user.id,
        folder="sent",
        sender_name=sender_name,
        sender_email=sender_email,
        recipient_email=data.recipient_email.strip(),
        subject=subject,
        body=full_body,
        thread_id=original.id,
        is_read=True,
    )
    db.add(fwd)
    db.commit()
    db.refresh(fwd)
    return _serialize_email(fwd)


@router.patch("/{email_id}/star")
def toggle_star(
    email_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    email = db.query(Email).filter(
        Email.id == email_id, Email.user_id == current_user.id
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    email.is_starred = not email.is_starred
    db.commit()
    return {"id": email.id, "is_starred": email.is_starred}


@router.patch("/{email_id}/read")
def toggle_read(
    email_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    email = db.query(Email).filter(
        Email.id == email_id, Email.user_id == current_user.id
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    email.is_read = not email.is_read
    db.commit()
    return {"id": email.id, "is_read": email.is_read}


@router.patch("/{email_id}/move")
def move_email(
    email_id: uuid.UUID,
    data: MoveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    valid_folders = {"inbox", "sent", "drafts", "trash"}
    if data.folder not in valid_folders:
        raise HTTPException(status_code=400, detail=f"Invalid folder. Must be one of: {valid_folders}")

    email = db.query(Email).filter(
        Email.id == email_id, Email.user_id == current_user.id
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    email.folder = data.folder
    db.commit()
    return {"id": email.id, "folder": email.folder}


@router.delete("/{email_id}")
def delete_email(
    email_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    email = db.query(Email).filter(
        Email.id == email_id, Email.user_id == current_user.id
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    db.delete(email)
    db.commit()
    return {"message": "Email permanently deleted"}