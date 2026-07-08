"""
backend/app/services/quote_service.py  — NEW FILE
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.quote import Quote, QuoteLineItem
from app.models.contact import Contact
from app.schemas.quote import QuoteCreate, QuoteUpdate
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import io

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_LEFT


CURRENCY_SYMBOLS = {
    "USD": "$", "EUR": "€", "GBP": "£", "PKR": "Rs ", "AED": "AED ",
    "SAR": "SAR ", "INR": "₹", "CAD": "C$", "AUD": "A$",
}


def _fmt_money(amount: float, currency: str) -> str:
    symbol = CURRENCY_SYMBOLS.get(currency, currency + " ")
    return f"{symbol}{amount:,.2f}"


def compute_totals(quote: Quote) -> dict:
    """Compute subtotal, discount, tax, and total from line items + quote settings.

    VAT is applied ONLY to line items with vat_applicable=True, so pass-through
    government fees can be excluded while services carry VAT."""
    subtotal = sum((item.quantity or 0) * (item.unit_price or 0) for item in quote.line_items)
    vatable_subtotal = sum(
        (item.quantity or 0) * (item.unit_price or 0)
        for item in quote.line_items
        if getattr(item, "vat_applicable", True)
    )

    if quote.discount_type == "percent":
        discount_amount = subtotal * (quote.discount_value or 0) / 100
    else:
        discount_amount = quote.discount_value or 0
    discount_amount = min(discount_amount, subtotal)  # never negative-total

    # Prorate the discount across VAT-able items so tax is charged on their net value
    discount_ratio = (discount_amount / subtotal) if subtotal > 0 else 0
    taxable_base = vatable_subtotal * (1 - discount_ratio)
    tax_amount = taxable_base * (quote.tax_percent or 0) / 100

    total = subtotal - discount_amount + tax_amount

    return {
        "subtotal": round(subtotal, 2),
        "discount_amount": round(discount_amount, 2),
        "tax_amount": round(tax_amount, 2),
        "total": round(total, 2),
    }


def serialize_quote(quote: Quote) -> dict:
    totals = compute_totals(quote)
    return {
        "id": quote.id,
        "user_id": quote.user_id,
        "contact_id": quote.contact_id,
        "deal_id": quote.deal_id,
        "quote_number": quote.quote_number,
        "title": quote.title,
        "client_name": quote.client_name,
        "client_email": quote.client_email,
        "client_company": quote.client_company,
        "notes": quote.notes,
        "currency": quote.currency,
        "discount_type": quote.discount_type,
        "discount_value": quote.discount_value,
        "tax_percent": quote.tax_percent,
        "status": quote.status,
        "valid_until": quote.valid_until,
        "created_at": quote.created_at,
        "updated_at": quote.updated_at,
        "sent_at": quote.sent_at,
        "accepted_at": quote.accepted_at,
        "line_items": quote.line_items,
        "contact": quote.contact,
        **totals,
    }


def _next_quote_number(db: Session, user_id: uuid.UUID) -> str:
    year = datetime.now(timezone.utc).year
    count = db.query(func.count(Quote.id)).filter(
        Quote.user_id == user_id,
        Quote.quote_number.like(f"Q-{year}-%"),
    ).scalar()
    return f"Q-{year}-{count + 1:04d}"


def get_quotes(db: Session, user_id: uuid.UUID, status: Optional[str] = None) -> List[Quote]:
    query = db.query(Quote).filter(Quote.user_id == user_id)
    if status:
        query = query.filter(Quote.status == status)
    return query.order_by(desc(Quote.created_at)).all()


def get_quote(db: Session, quote_id: str, user_id: uuid.UUID) -> Optional[Quote]:
    return db.query(Quote).filter(Quote.id == quote_id, Quote.user_id == user_id).first()


def create_quote(db: Session, data: QuoteCreate, user_id: uuid.UUID) -> Quote:
    client_name = data.client_name
    client_email = data.client_email
    client_company = data.client_company

    # Auto-fill client info from linked contact if not explicitly provided
    if data.contact_id and not (client_name and client_email):
        contact = db.query(Contact).filter(Contact.id == data.contact_id).first()
        if contact:
            client_name = client_name or f"{contact.first_name or ''} {contact.last_name or ''}".strip()
            client_email = client_email or contact.email
            client_company = client_company or contact.company

    quote = Quote(
        user_id=user_id,
        contact_id=data.contact_id,
        deal_id=data.deal_id,
        quote_number=_next_quote_number(db, user_id),
        title=data.title,
        client_name=client_name,
        client_email=client_email,
        client_company=client_company,
        notes=data.notes,
        currency=data.currency,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        tax_percent=data.tax_percent,
        valid_until=data.valid_until,
        status="draft",
    )
    db.add(quote)
    db.flush()

    for i, item in enumerate(data.line_items):
        db.add(QuoteLineItem(
            quote_id=quote.id,
            product_id=item.product_id,
            name=item.name,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            vat_applicable=getattr(item, "vat_applicable", True),
            sort_order=i,
        ))

    db.commit()
    db.refresh(quote)
    return quote


def update_quote(db: Session, quote_id: str, data: QuoteUpdate, user_id: uuid.UUID) -> Optional[Quote]:
    quote = get_quote(db, quote_id, user_id)
    if not quote:
        return None

    update_data = data.model_dump(exclude_unset=True, exclude={"line_items"})
    old_status = quote.status

    for key, value in update_data.items():
        setattr(quote, key, value)

    # Status transition timestamps
    if "status" in update_data:
        if update_data["status"] == "sent" and old_status != "sent":
            quote.sent_at = datetime.now(timezone.utc)
        if update_data["status"] == "accepted" and old_status != "accepted":
            quote.accepted_at = datetime.now(timezone.utc)

    if data.line_items is not None:
        # Replace all line items
        db.query(QuoteLineItem).filter(QuoteLineItem.quote_id == quote.id).delete()
        for i, item in enumerate(data.line_items):
            db.add(QuoteLineItem(
                quote_id=quote.id,
                product_id=item.product_id,
                name=item.name,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                vat_applicable=getattr(item, "vat_applicable", True),
                sort_order=i,
            ))

    db.commit()
    db.refresh(quote)
    return quote


def delete_quote(db: Session, quote_id: str, user_id: uuid.UUID) -> bool:
    quote = get_quote(db, quote_id, user_id)
    if not quote:
        return False
    db.delete(quote)
    db.commit()
    return True


# ── PDF generation (official letterhead replica) ────────────────────────────

def generate_quote_pdf(quote: Quote, sender_name: str = "", sender_email: str = "") -> bytes:
    """Render a Quote as an exact replica of the official
    BUSINESS HUB OF SPHERE CO W.L.L quotation (letterhead, boxed layout,
    signature + stamp, terms & conditions)."""
    from reportlab.pdfgen import canvas as rl_canvas
    from app.services import pdf_branding as B

    totals = compute_totals(quote)
    currency = (quote.currency or "BHD").upper()

    buffer = io.BytesIO()
    c = rl_canvas.Canvas(buffer, pagesize=(B.PAGE_W, B.PAGE_H))
    c.setTitle(f"Quotation {quote.quote_number}")

    # ── fixed geometry (measured from the official document, in pt from top) ─
    ROW_H = 10.5556
    TBL_L, TBL_R = 28.8, 570.6
    COLS = [28.8, 283.6, 379.8, 475.2, 570.6]        # Description | Qty | Price | Total
    HDR_TOP, HDR_BOT = 217.0, 239.4                  # items header band
    BODY_TOP, BODY_BOT = 239.4, 477.0                # items body band (page 1)
    MAX_ROWS = int((BODY_BOT - BODY_TOP) // ROW_H)   # 22 rows per page

    def page_frame(first: bool):
        """Letterhead + header blocks + empty items grid for a page."""
        B.draw_letterhead(c)

        # Name / Address box
        B.box(c, 28.8, 122.4, 282.6, 145.0)
        B.box(c, 28.8, 145.0, 282.6, 208.8)
        B.text(c, 31.8, 129.5, "Name / Address", 9)
        client_top = 148.1
        if quote.client_name:
            B.text(c, 31.8, client_top, quote.client_name, 10)
            client_top += 12
        if quote.client_company:
            B.text(c, 31.8, client_top, quote.client_company, 10)
            client_top += 12
        if quote.client_email:
            B.text(c, 31.8, client_top, quote.client_email, 10)

        # Title
        B.text(c, 442.7, 131.7, "Quotation", 26)

        # Date / Quote # grid
        B.box(c, 298.8, 162.0, 361.8, 184.6)
        B.box(c, 361.8, 162.0, 424.8, 184.6)
        B.box(c, 424.8, 162.0, 496.8, 184.6)
        B.box(c, 496.8, 162.0, 568.0, 184.6)
        B.text_center(c, (298.8 + 361.8) / 2, 169.1, "Date", 9)
        B.text_center(c, (361.8 + 424.8) / 2, 169.1, B.fmt_date(quote.created_at), 9)
        B.text_center(c, (424.8 + 496.8) / 2, 169.1, "Quote #", 9)
        B.text_center(c, (496.8 + 568.0) / 2, 169.1, quote.quote_number or "", 9)

        # VAT row
        B.box(c, 298.8, 184.6, 568.8, 204.4)
        B.text_center(c, (298.8 + 568.8) / 2, 189.2, f"VAT # {B.VAT_NUMBER}", 12)

        # Items table header
        B.box(c, COLS[0], HDR_TOP, COLS[1], HDR_BOT, fill=B.ROW_GREY)
        B.box(c, COLS[1], HDR_TOP, COLS[2], HDR_BOT, fill=B.ROW_GREY)
        B.box(c, COLS[2], HDR_TOP, COLS[3], HDR_BOT, fill=B.ROW_GREY)
        B.box(c, COLS[3], HDR_TOP, COLS[4], HDR_BOT, fill=B.ROW_GREY)
        B.text_center(c, (COLS[0] + COLS[1]) / 2, 224.1, "Description", 9)
        B.text_center(c, (COLS[1] + COLS[2]) / 2, 224.1, "Qty", 9)
        B.text_center(c, (COLS[2] + COLS[3]) / 2, 224.1, f"Price ({currency})", 9)
        B.text_center(c, (COLS[3] + COLS[4]) / 2, 224.1, f"Total ({currency})", 9)

        # Items body frame (grey shading + row text drawn by caller)
        B.box(c, COLS[0], BODY_TOP, COLS[1], BODY_BOT)
        B.box(c, COLS[1], BODY_TOP, COLS[2], BODY_BOT)
        B.box(c, COLS[2], BODY_TOP, COLS[3], BODY_BOT)
        B.box(c, COLS[3], BODY_TOP, COLS[4], BODY_BOT)

    def draw_row(i: int, desc: str, qty: str, price: str, total: str):
        """Draw one item row (i = 0-based row index on the current page)."""
        band_top = 241.44 + i * ROW_H
        if i % 2 == 1:  # alternating grey bands, exactly as the original
            B.box(c, 29.8, band_top, 282.6, band_top + 10.6, fill=B.ROW_GREY, stroke=None)
            B.box(c, 284.5, band_top, 378.8, band_top + 10.6, fill=B.ROW_GREY, stroke=None)
            B.box(c, 380.8, band_top, 474.2, band_top + 10.6, fill=B.ROW_GREY, stroke=None)
            B.box(c, 476.2, band_top, 569.6, band_top + 10.6, fill=B.ROW_GREY, stroke=None)
            # redraw column edges over the fill
            B.vline(c, COLS[1], band_top, band_top + 10.6)
            B.vline(c, COLS[2], band_top, band_top + 10.6)
            B.vline(c, COLS[3], band_top, band_top + 10.6)
        t = 242.4 + i * ROW_H
        if desc:
            B.text(c, 31.8, t, desc, 9)
        if qty:
            B.text_center(c, (COLS[1] + COLS[2]) / 2 - 0.9, t, qty, 9)
        if price:
            B.text_right(c, 441.0, t, price, 9)
        if total:
            B.text_right(c, 563.5, t, total, 9)

    # ── build row list: line items + optional discount + VAT ────────────────
    rows = []
    for item in quote.line_items:
        amount = (item.quantity or 0) * (item.unit_price or 0)
        rows.append((item.name or "", B.fmt_qty(item.quantity),
                     B.fmt_amount(item.unit_price), B.fmt_amount(amount)))
    if totals["discount_amount"] > 0:
        if quote.discount_type == "percent":
            rows.append(("Discount", "", f"{quote.discount_value:g}%",
                         f"-{B.fmt_amount(totals['discount_amount'])}"))
        else:
            rows.append(("Discount", "", "",
                         f"-{B.fmt_amount(totals['discount_amount'])}"))
    if (quote.tax_percent or 0) > 0:
        rows.append(("VAT", "", f"{quote.tax_percent:.2f}%",
                     B.fmt_amount(totals["tax_amount"])))

    # ── paginate rows ────────────────────────────────────────────────────────
    pages = [rows[i:i + MAX_ROWS] for i in range(0, len(rows), MAX_ROWS)] or [[]]
    for pi, page_rows in enumerate(pages):
        page_frame(first=(pi == 0))
        for ri, r in enumerate(page_rows):
            draw_row(ri, *r)
        if pi < len(pages) - 1:
            c.showPage()

    # ── bottom section (last page, fixed positions like the original) ───────
    # Payment terms box
    B.box(c, 25.2, 479.8, 302.4, 511.2)
    terms_text = (quote.notes or "").strip() or B.DEFAULT_PAYMENT_TERMS
    for li, line in enumerate(B.wrap_text(terms_text, B.FONT, 9, 272)[:3]):
        B.text(c, 28.2, 482.7 + li * ROW_H, line, 9)

    # Total box
    B.box(c, 302.4, 479.8, 573.4, 511.2)
    B.text(c, 314.4, 488.7, f"Total in {B.currency_long(currency)}", 12)
    B.text_right(c, 568.5, 491.3, B.fmt_amount(totals["total"]), 9)

    # Terms and Conditions box
    B.box(c, 25.2, 511.2, 573.4, 601.2)
    B.text(c, 28.2, 525.9, "Terms and Conditions:", 9)
    duration = getattr(quote, "job_duration", None) or B.DEFAULT_JOB_DURATION
    clause_top = 536.4
    for clause in B.QUOTE_TERMS_AND_CONDITIONS:
        if clause == "__DURATION__":
            prefix = "2-The duration to complete the above job will be"
            B.text(c, 28.2, clause_top, prefix, 9)
            B.text(c, 204.1, clause_top,
                   "________________________________", 9)
            B.text_center(c, 265.0, clause_top - 1.2, str(duration), 9, font=B.FONT_LIGHT)
            B.text(c, 329.3, clause_top, "Business Days", 9)
        else:
            B.text(c, 28.2, clause_top, clause, 9)
        clause_top += ROW_H

    # Signature + stamp, underlines and captions
    B.draw_signature_and_stamp(
        c,
        sig_x=47.8, sig_top=616.6, sig_w=145.8, sig_h=89.0,
        stamp_x=156.6, stamp_top=601.2, stamp_size=114.4,
    )
    B.hline(c, 46.8, 271.8, 707.4)
    B.text(c, 88.0, 710.6, "Signatures on behalf of Company", 9)
    B.hline(c, 328.6, 553.6, 706.6)
    B.text(c, 353.3, 709.8, "Customer Acceptance Signature & Name", 9)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()
