"""
backend/app/api/v1/quotes.py  — NEW FILE
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.quote import QuoteCreate, QuoteUpdate, QuoteResponse
from app.services.quote_service import (
    get_quotes, get_quote, create_quote, update_quote, delete_quote,
    serialize_quote, generate_quote_pdf,
)
from typing import List, Optional
import uuid

router = APIRouter()

VALID_STATUSES = {"draft", "sent", "accepted", "declined", "expired"}


@router.get("/", response_model=List[QuoteResponse])
def list_quotes(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quotes = get_quotes(db, current_user.id, status)
    return [serialize_quote(q) for q in quotes]


@router.post("/", response_model=QuoteResponse, status_code=201)
def add_quote(
    data: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = create_quote(db, data, current_user.id)
    return serialize_quote(quote)


@router.get("/{quote_id}", response_model=QuoteResponse)
def get_one_quote(
    quote_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = get_quote(db, str(quote_id), current_user.id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return serialize_quote(quote)


@router.patch("/{quote_id}", response_model=QuoteResponse)
def edit_quote(
    quote_id: uuid.UUID,
    data: QuoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.status and data.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")

    quote = update_quote(db, str(quote_id), data, current_user.id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return serialize_quote(quote)


@router.delete("/{quote_id}", status_code=204)
def remove_quote(
    quote_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = delete_quote(db, str(quote_id), current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Quote not found")


@router.get("/{quote_id}/pdf")
def download_quote_pdf(
    quote_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = get_quote(db, str(quote_id), current_user.id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    pdf_bytes = generate_quote_pdf(
        quote,
        sender_name=current_user.full_name or "",
        sender_email=current_user.email or "",
    )

    filename = f"{quote.quote_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )