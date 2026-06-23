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
    """Compute subtotal, discount, tax, and total from line items + quote settings."""
    subtotal = sum((item.quantity or 0) * (item.unit_price or 0) for item in quote.line_items)

    if quote.discount_type == "percent":
        discount_amount = subtotal * (quote.discount_value or 0) / 100
    else:
        discount_amount = quote.discount_value or 0
    discount_amount = min(discount_amount, subtotal)  # never negative-total

    taxable_base = subtotal - discount_amount
    tax_amount = taxable_base * (quote.tax_percent or 0) / 100

    total = taxable_base + tax_amount

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


# ── PDF generation ──────────────────────────────────────────────────────────────

def generate_quote_pdf(quote: Quote, sender_name: str, sender_email: str) -> bytes:
    """Render a Quote to a professional PDF, returned as bytes."""
    totals = compute_totals(quote)
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('QuoteTitle', parent=styles['Title'], fontSize=22, textColor=colors.HexColor('#3B2F6B'), spaceAfter=4)
    label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#888888'))
    normal_style = ParagraphStyle('NormalSmall', parent=styles['Normal'], fontSize=10, leading=14)
    right_style = ParagraphStyle('RightAlign', parent=styles['Normal'], fontSize=10, alignment=TA_RIGHT)

    story = []

    # ── Header ──
    story.append(Paragraph(quote.title or "Quote", title_style))
    story.append(Paragraph(f"Quote # {quote.quote_number}", label_style))
    story.append(Spacer(1, 4))
    status_color = {
        'draft': '#8A8A8A', 'sent': '#3B82F6', 'accepted': '#22C55E', 'declined': '#EF4444', 'expired': '#999999'
    }.get(quote.status, '#8A8A8A')
    story.append(Paragraph(f'<font color="{status_color}"><b>{quote.status.upper()}</b></font>', normal_style))
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", color=colors.HexColor('#DDDDDD'), thickness=1))
    story.append(Spacer(1, 16))

    # ── From / To columns ──
    from_lines = [f"<b>From</b>", sender_name or "", sender_email or ""]
    to_lines = [f"<b>To</b>"]
    if quote.client_name:
        to_lines.append(quote.client_name)
    if quote.client_company:
        to_lines.append(quote.client_company)
    if quote.client_email:
        to_lines.append(quote.client_email)

    from_para = Paragraph("<br/>".join([l for l in from_lines if l]), normal_style)
    to_para = Paragraph("<br/>".join([l for l in to_lines if l]), normal_style)

    meta_lines = ["<b>Date</b>", quote.created_at.strftime("%B %d, %Y") if quote.created_at else ""]
    if quote.valid_until:
        meta_lines.append(f"<b>Valid Until</b>")
        meta_lines.append(quote.valid_until.strftime("%B %d, %Y"))
    meta_para = Paragraph("<br/>".join([l for l in meta_lines if l]), normal_style)

    header_table = Table([[from_para, to_para, meta_para]], colWidths=[2.3 * inch, 2.3 * inch, 2.3 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 24))

    # ── Line items table ──
    currency = quote.currency
    table_data = [["Item", "Description", "Qty", "Unit Price", "Amount"]]
    for item in quote.line_items:
        amount = (item.quantity or 0) * (item.unit_price or 0)
        table_data.append([
            Paragraph(item.name, normal_style),
            Paragraph(item.description or "", ParagraphStyle('desc', parent=normal_style, fontSize=8, textColor=colors.HexColor('#777777'))),
            str(item.quantity).rstrip('0').rstrip('.') if '.' in str(item.quantity) else str(int(item.quantity)),
            _fmt_money(item.unit_price, currency),
            _fmt_money(amount, currency),
        ])

    items_table = Table(table_data, colWidths=[1.6 * inch, 2.0 * inch, 0.6 * inch, 1.1 * inch, 1.2 * inch], repeatRows=1)
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E2A4A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')]),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 16))

    # ── Totals ──
    totals_data = [["Subtotal", _fmt_money(totals['subtotal'], currency)]]
    if totals['discount_amount'] > 0:
        discount_label = f"Discount ({quote.discount_value:g}%)" if quote.discount_type == "percent" else "Discount"
        totals_data.append([discount_label, f"-{_fmt_money(totals['discount_amount'], currency)}"])
    if totals['tax_amount'] > 0:
        totals_data.append([f"Tax ({quote.tax_percent:g}%)", _fmt_money(totals['tax_amount'], currency)])
    totals_data.append(["Total", _fmt_money(totals['total'], currency)])

    totals_table = Table(totals_data, colWidths=[4.9 * inch, 2.0 * inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 13),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.HexColor('#2E2A4A')),
        ('TOPPADDING', (0, -1), (-1, -1), 8),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#2E2A4A')),
    ]))
    story.append(totals_table)

    # ── Notes / terms ──
    if quote.notes:
        story.append(Spacer(1, 24))
        story.append(HRFlowable(width="100%", color=colors.HexColor('#EEEEEE'), thickness=1))
        story.append(Spacer(1, 10))
        story.append(Paragraph("<b>Notes</b>", normal_style))
        story.append(Paragraph(quote.notes.replace('\n', '<br/>'), ParagraphStyle('notes', parent=normal_style, fontSize=9, textColor=colors.HexColor('#555555'))))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()