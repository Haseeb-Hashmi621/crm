from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.models.segment import Segment
from app.models.contact import Contact
from app.schemas.segment import SegmentCreate, SegmentUpdate
from typing import List, Optional
import uuid


# ── Filter evaluation ───────────────────────────────────────────────────────

def _match_filter(contact: Contact, rule: dict) -> bool:
    """Evaluate a single filter rule against a contact."""
    field = rule.get("field", "")
    operator = rule.get("operator", "")
    value = rule.get("value", "")

    # Get the field value from contact
    if field == "first_name":
        field_val = (contact.first_name or "").lower()
    elif field == "last_name":
        field_val = (contact.last_name or "").lower()
    elif field == "email":
        field_val = (contact.email or "").lower()
    elif field == "phone":
        field_val = (contact.phone or "").lower()
    elif field == "company":
        field_val = (contact.company or "").lower()
    elif field == "tag":
        # Special case: check if contact has a tag with this name
        tag_names = [t.name.lower() for t in (contact.tags or [])]
        if operator == "has_tag":
            return str(value).lower() in tag_names
        elif operator == "not_has_tag":
            return str(value).lower() not in tag_names
        return False
    elif field == "has_email":
        return bool(contact.email) if operator == "is_true" else not bool(contact.email)
    elif field == "has_phone":
        return bool(contact.phone) if operator == "is_true" else not bool(contact.phone)
    else:
        field_val = ""

    # Apply operator
    str_value = str(value).lower() if value is not None else ""

    if operator == "contains":
        return str_value in field_val
    elif operator == "not_contains":
        return str_value not in field_val
    elif operator == "equals":
        return field_val == str_value
    elif operator == "not_equals":
        return field_val != str_value
    elif operator == "is_empty":
        return field_val == ""
    elif operator == "is_not_empty":
        return field_val != ""
    elif operator == "starts_with":
        return field_val.startswith(str_value)
    elif operator == "ends_with":
        return field_val.endswith(str_value)

    return False


def apply_filters_to_contacts(contacts: List[Contact], filters: List[dict]) -> List[Contact]:
    """Filter contacts list using segment filter rules (AND logic)."""
    if not filters:
        return contacts
    result = []
    for contact in contacts:
        if all(_match_filter(contact, rule) for rule in filters):
            result.append(contact)
    return result


# ── CRUD ─────────────────────────────────────────────────────────────────────

def get_segments(db: Session, user_id: uuid.UUID) -> List[Segment]:
    return db.query(Segment).filter(
        Segment.user_id == user_id
    ).order_by(Segment.created_at.desc()).all()


def get_segment(db: Session, segment_id: str, user_id: uuid.UUID) -> Optional[Segment]:
    return db.query(Segment).filter(
        Segment.id == segment_id,
        Segment.user_id == user_id
    ).first()


def create_segment(db: Session, data: SegmentCreate, user_id: uuid.UUID) -> Segment:
    segment = Segment(
        user_id=user_id,
        name=data.name,
        description=data.description,
        filters=[f.model_dump() for f in data.filters],
        color=data.color or "violet"
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)
    return segment


def update_segment(
    db: Session, segment_id: str, data: SegmentUpdate, user_id: uuid.UUID
) -> Optional[Segment]:
    segment = get_segment(db, segment_id, user_id)
    if not segment:
        return None
    if data.name is not None:
        segment.name = data.name
    if data.description is not None:
        segment.description = data.description
    if data.filters is not None:
        segment.filters = [f.model_dump() for f in data.filters]
    if data.color is not None:
        segment.color = data.color
    db.commit()
    db.refresh(segment)
    return segment


def delete_segment(db: Session, segment_id: str, user_id: uuid.UUID) -> bool:
    segment = get_segment(db, segment_id, user_id)
    if not segment:
        return False
    db.delete(segment)
    db.commit()
    return True


def get_segment_contacts(
    db: Session, segment_id: str, user_id: uuid.UUID
) -> Optional[dict]:
    """Return segment + matched contacts."""
    segment = get_segment(db, segment_id, user_id)
    if not segment:
        return None

    all_contacts = (
        db.query(Contact)
        .options(joinedload(Contact.tags))
        .filter(Contact.user_id == user_id)
        .all()
    )

    matched = apply_filters_to_contacts(all_contacts, segment.filters or [])

    return {
        "segment": segment,
        "contact_count": len(matched),
        "contacts": [
            {
                "id": str(c.id),
                "first_name": c.first_name,
                "last_name": c.last_name,
                "email": c.email,
                "phone": c.phone,
                "company": c.company,
                "tags": [{"id": str(t.id), "name": t.name} for t in (c.tags or [])],
            }
            for c in matched
        ],
    }


def preview_filters(
    db: Session, filters: List[dict], user_id: uuid.UUID
) -> List[Contact]:
    """Preview which contacts match a set of filters without saving."""
    all_contacts = (
        db.query(Contact)
        .options(joinedload(Contact.tags))
        .filter(Contact.user_id == user_id)
        .all()
    )
    return apply_filters_to_contacts(all_contacts, filters)