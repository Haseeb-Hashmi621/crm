from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse
from app.services.invoice_service import (
    get_invoices, get_invoice, create_invoice,
    update_invoice, delete_invoice, generate_invoice_pdf
)
from typing import List, Optional
import uuid
import io

router = APIRouter()

VALID_STATUSES = {"unpaid", "partially_paid", "paid", "overdue", "cancelled", "void"}


@router.get("/", response_model=List[InvoiceResponse])
def list_invoices(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_invoices(db, current_user.id, status)


@router.post("/", response_model=InvoiceResponse, status_code=201)
def create_invoice_route(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_invoice(db, data, current_user.id)


@router.get("/stats")
def invoice_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate totals for the dashboard."""
    from app.models.invoice import Invoice
    invoices = db.query(Invoice).filter(Invoice.user_id == current_user.id).all()

    total_outstanding = sum(
        i.total - i.amount_paid for i in invoices
        if i.status in ("unpaid", "partially_paid", "overdue")
    )
    total_paid = sum(i.amount_paid for i in invoices)
    overdue_count = sum(1 for i in invoices if i.status == "overdue")
    total_invoiced = sum(i.total for i in invoices)

    return {
        "total_invoices": len(invoices),
        "total_invoiced": round(total_invoiced, 2),
        "total_paid": round(total_paid, 2),
        "total_outstanding": round(total_outstanding, 2),
        "overdue_count": overdue_count,
    }


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice_route(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = get_invoice(db, str(invoice_id), current_user.id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice_route(
    invoice_id: uuid.UUID,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = update_invoice(db, str(invoice_id), data, current_user.id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.patch("/{invoice_id}/status")
def set_status(
    invoice_id: uuid.UUID,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")
    invoice = update_invoice(db, str(invoice_id), InvoiceUpdate(status=status), current_user.id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"id": invoice.id, "status": invoice.status}


@router.patch("/{invoice_id}/record-payment")
def record_payment(
    invoice_id: uuid.UUID,
    amount: float = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a payment amount to the invoice."""
    invoice = get_invoice(db, str(invoice_id), current_user.id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    new_paid = round(invoice.amount_paid + amount, 2)
    if new_paid > invoice.total:
        new_paid = invoice.total
    updated = update_invoice(
        db, str(invoice_id),
        InvoiceUpdate(amount_paid=new_paid),
        current_user.id
    )
    return {"id": updated.id, "amount_paid": updated.amount_paid,
            "status": updated.status, "balance": round(updated.total - updated.amount_paid, 2)}


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice_route(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = delete_invoice(db, str(invoice_id), current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Invoice not found")


@router.get("/{invoice_id}/pdf")
def download_pdf(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = get_invoice(db, str(invoice_id), current_user.id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    try:
        pdf_bytes = generate_invoice_pdf(invoice)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    filename = f"{invoice.invoice_number}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )