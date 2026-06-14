from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.contact import Contact
import csv
import io
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse
from app.services.contact_service import (
    get_contacts, get_contact, create_contact, update_contact, delete_contact
)
from typing import List

router = APIRouter()

@router.get("/export")
def export_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contacts = get_contacts(db, 0, 10000, str(current_user.id))
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['first_name', 'last_name', 'email', 'phone', 'company'])
    
    for c in contacts:
        writer.writerow([
            c.first_name or '',
            c.last_name or '',
            c.email or '',
            f'="{c.phone}"' if c.phone else '',
            c.company or '',
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts.csv"}
    )

@router.get("/", response_model=List[ContactResponse])
def list_contacts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_contacts(db, skip, limit, str(current_user.id))

@router.post("/", response_model=ContactResponse)
def add_contact(contact_data: ContactCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return create_contact(db, contact_data, str(current_user.id))

@router.get("/{contact_id}", response_model=ContactResponse)
def get_one_contact(contact_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contact = get_contact(db, contact_id, str(current_user.id))
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@router.put("/{contact_id}", response_model=ContactResponse)
def edit_contact(contact_id: str, contact_data: ContactUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    contact = update_contact(db, contact_id, contact_data, str(current_user.id))
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@router.delete("/{contact_id}")
def remove_contact(contact_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = delete_contact(db, contact_id, str(current_user.id))
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted successfully"}

@router.post("/import")
async def import_contacts(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    contents = await file.read()
    decoded = contents.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(decoded))

    # Validate headers
    if reader.fieldnames is None or 'first_name' not in reader.fieldnames:
        raise HTTPException(
            status_code=400,
            detail="Invalid CSV format. File must contain a 'first_name' column."
        )

    imported = 0
    skipped = 0
    errors = []

    # Track identifiers already seen within this CSV to catch intra-file duplicates.
    # SQLAlchemy won't see uncommitted rows in DB queries, so we need this in-memory set.
    seen_contacts = set()

    for i, row in enumerate(reader, start=2):
        first_name = row.get('first_name', '').strip()
        if not first_name:
            skipped += 1
            continue

        email = row.get('email', '').strip() or None
        phone = row.get('phone', '').strip() or None
        last_name = row.get('last_name', '').strip() or None
        company = row.get('company', '').strip() or None

        try:
            # --- Step 1: Deduplicate within the CSV itself ---
            # Build a precise key based on available fields.
            # A flat (email, phone) tuple fails when both are empty — all name-only
            # rows would share the same key ("", "") and collide incorrectly.
            if email and phone:
                csv_key = ("email+phone", email.lower(), phone)
            elif email:
                csv_key = ("email", email.lower())
            elif phone:
                csv_key = ("phone", phone)
            else:
                csv_key = ("name", first_name.lower(), (last_name or "").lower())

            if csv_key in seen_contacts:
                skipped += 1
                continue
            seen_contacts.add(csv_key)

            # --- Step 2: Check against existing DB records ---
            # Logic: AND when both fields exist (avoids false positives),
            # fallback to whichever single field is available,
            # last resort: match by full name.
            duplicate = None

            if email and phone:
                # Both present — require both to match (strictest, avoids false positives)
                duplicate = db.query(Contact).filter(
                    Contact.user_id == current_user.id,
                    Contact.email == email,
                    Contact.phone == phone
                ).first()
            elif email:
                duplicate = db.query(Contact).filter(
                    Contact.user_id == current_user.id,
                    Contact.email == email
                ).first()
            elif phone:
                duplicate = db.query(Contact).filter(
                    Contact.user_id == current_user.id,
                    Contact.phone == phone
                ).first()
            else:
                # No email or phone — match on full name
                duplicate = db.query(Contact).filter(
                    and_(
                        Contact.user_id == current_user.id,
                        Contact.first_name == first_name,
                        Contact.last_name == last_name
                    )
                ).first()

            if duplicate:
                skipped += 1
                continue

            db_contact = Contact(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=phone,
                company=company,
                user_id=current_user.id
            )
            db.add(db_contact)
            imported += 1

        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors
    }