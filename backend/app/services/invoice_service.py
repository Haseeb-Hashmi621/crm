from sqlalchemy.orm import Session
from app.models.invoice import Invoice, InvoiceLineItem
from app.models.contact import Contact
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import io

# PDF generation
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER


# ── Helpers ───────────────────────────────────────────────────────────────────

def _next_invoice_number(db: Session, user_id: uuid.UUID) -> str:
    count = db.query(Invoice).filter(Invoice.user_id == user_id).count()
    return f"INV-{(count + 1):04d}"


def _calc_line_total(qty: float, unit_price: float, discount_pct: float) -> float:
    base = qty * unit_price
    return round(base * (1 - discount_pct / 100), 2)


def _calc_totals(line_items, discount_pct: float, tax_pct: float):
    """VAT is applied ONLY to line items with vat_applicable=True, so
    pass-through government fees can be excluded while services carry VAT."""
    subtotal = sum(_calc_line_total(li.quantity, li.unit_price, li.discount_pct)
                   for li in line_items)
    vatable_subtotal = sum(
        _calc_line_total(li.quantity, li.unit_price, li.discount_pct)
        for li in line_items
        if getattr(li, "vat_applicable", True)
    )
    discount_amount = round(subtotal * discount_pct / 100, 2)
    # Prorate the invoice-level discount across VAT-able items
    taxable = vatable_subtotal * (1 - discount_pct / 100)
    tax_amount = round(taxable * tax_pct / 100, 2)
    total = round(subtotal - discount_amount + tax_amount, 2)
    return subtotal, discount_amount, tax_amount, total


def _status_color(status: str):
    return {
        "unpaid": colors.HexColor("#EAB308"),
        "partially_paid": colors.HexColor("#F97316"),
        "paid": colors.HexColor("#22C55E"),
        "overdue": colors.HexColor("#EF4444"),
        "cancelled": colors.HexColor("#6B7280"),
        "void": colors.HexColor("#6B7280"),
    }.get(status, colors.HexColor("#6B7280"))


def _fmt(amount: float, currency: str = "USD") -> str:
    symbol = {"USD": "$", "EUR": "€", "GBP": "£",
               "PKR": "PKR ", "AED": "AED "}.get(currency, f"{currency} ")
    return f"{symbol}{amount:,.2f}"


# ── CRUD ─────────────────────────────────────────────────────────────────────

def get_invoices(db: Session, user_id: uuid.UUID,
                 status: Optional[str] = None) -> List[Invoice]:
    q = db.query(Invoice).filter(Invoice.user_id == user_id)
    if status:
        q = q.filter(Invoice.status == status)
    return q.order_by(Invoice.created_at.desc()).all()


def get_invoice(db: Session, invoice_id: str,
                user_id: uuid.UUID) -> Optional[Invoice]:
    return db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == user_id
    ).first()


def create_invoice(db: Session, data: InvoiceCreate,
                   user_id: uuid.UUID) -> Invoice:
    invoice_number = _next_invoice_number(db, user_id)

    # Pre-calc line items
    line_objs = []
    for i, li in enumerate(data.line_items):
        total = _calc_line_total(li.quantity, li.unit_price, li.discount_pct)
        line_objs.append(InvoiceLineItem(
            product_id=li.product_id,
            description=li.description,
            quantity=li.quantity,
            unit_price=li.unit_price,
            discount_pct=li.discount_pct,
            vat_applicable=getattr(li, "vat_applicable", True),
            total=total,
            sort_order=li.sort_order or i,
        ))

    subtotal, discount_amount, tax_amount, total = _calc_totals(
        line_objs, data.discount_pct, data.tax_pct
    )

    # Auto-fill client info from contact
    client_name = data.client_name
    client_email = data.client_email
    client_company = data.client_company
    if data.contact_id and not client_name:
        contact = db.query(Contact).filter(Contact.id == data.contact_id).first()
        if contact:
            client_name = f"{contact.first_name or ''} {contact.last_name or ''}".strip()
            client_email = client_email or contact.email
            client_company = client_company or contact.company

    invoice = Invoice(
        user_id=user_id,
        contact_id=data.contact_id,
        deal_id=data.deal_id,
        quote_id=data.quote_id,
        invoice_number=invoice_number,
        status="unpaid",
        client_name=client_name,
        client_email=client_email,
        client_address=data.client_address,
        client_company=client_company,
        subtotal=subtotal,
        discount_pct=data.discount_pct,
        discount_amount=discount_amount,
        tax_pct=data.tax_pct,
        tax_amount=tax_amount,
        total=total,
        amount_paid=0.0,
        currency=data.currency,
        due_date=data.due_date,
        notes=data.notes,
        terms=data.terms,
    )
    db.add(invoice)
    db.flush()

    for li in line_objs:
        li.invoice_id = invoice.id
        db.add(li)

    db.commit()
    db.refresh(invoice)
    return invoice


def update_invoice(db: Session, invoice_id: str,
                   data: InvoiceUpdate, user_id: uuid.UUID) -> Optional[Invoice]:
    invoice = get_invoice(db, invoice_id, user_id)
    if not invoice:
        return None

    simple_fields = [
        'contact_id', 'deal_id', 'client_name', 'client_email',
        'client_address', 'client_company', 'status', 'currency',
        'due_date', 'paid_date', 'amount_paid', 'notes', 'terms',
    ]
    for field in simple_fields:
        val = getattr(data, field, None)
        if val is not None:
            setattr(invoice, field, val)

    # Auto-set paid_date and status when fully paid
    if data.amount_paid is not None:
        if data.amount_paid >= invoice.total and invoice.status == "unpaid":
            invoice.status = "paid"
            invoice.paid_date = datetime.now(timezone.utc)
        elif data.amount_paid > 0 and data.amount_paid < invoice.total:
            invoice.status = "partially_paid"

    # Recalc if line items updated
    if data.line_items is not None:
        # Delete old line items
        db.query(InvoiceLineItem).filter(
            InvoiceLineItem.invoice_id == invoice.id
        ).delete()

        disc = data.discount_pct if data.discount_pct is not None else invoice.discount_pct
        tax = data.tax_pct if data.tax_pct is not None else invoice.tax_pct

        line_objs = []
        for i, li in enumerate(data.line_items):
            total = _calc_line_total(li.quantity, li.unit_price, li.discount_pct)
            obj = InvoiceLineItem(
                invoice_id=invoice.id,
                product_id=li.product_id,
                description=li.description,
                quantity=li.quantity,
                unit_price=li.unit_price,
                discount_pct=li.discount_pct,
                vat_applicable=getattr(li, "vat_applicable", True),
                total=total,
                sort_order=li.sort_order or i,
            )
            db.add(obj)
            line_objs.append(obj)

        subtotal, discount_amount, tax_amount, total = _calc_totals(
            line_objs, disc, tax
        )
        invoice.subtotal = subtotal
        invoice.discount_pct = disc
        invoice.discount_amount = discount_amount
        invoice.tax_pct = tax
        invoice.tax_amount = tax_amount
        invoice.total = total

    db.commit()
    db.refresh(invoice)
    return invoice


def delete_invoice(db: Session, invoice_id: str,
                   user_id: uuid.UUID) -> bool:
    invoice = get_invoice(db, invoice_id, user_id)
    if not invoice:
        return False
    db.delete(invoice)
    db.commit()
    return True


# ── PDF Generation (official letterhead replica) ────────────────────────────

def generate_invoice_pdf(invoice: Invoice) -> bytes:
    """Render an Invoice as an exact replica of the official
    BUSINESS HUB OF SPHERE CO W.L.L invoice (letterhead, boxed layout,
    bank account boxes, signature + stamp)."""
    from reportlab.pdfgen import canvas as rl_canvas
    from app.services import pdf_branding as B

    currency = (invoice.currency or "BHD").upper()

    buffer = io.BytesIO()
    c = rl_canvas.Canvas(buffer, pagesize=(B.PAGE_W, B.PAGE_H))
    c.setTitle(f"Invoice {invoice.invoice_number}")

    # ── fixed geometry (measured from the official document, in pt from top) ─
    ROW_H = 10.5556
    COLS = [28.0, 281.8, 377.2, 472.6, 568.0]        # Description | Quantity | Price Each | Amount
    HDR_TOP, HDR_BOT = 206.2, 224.2
    BODY_TOP, BODY_BOT = 224.2, 451.8
    MAX_ROWS = int((BODY_BOT - BODY_TOP) // ROW_H)   # 21 rows per page

    def page_frame():
        B.draw_letterhead(c)

        # Bill To box
        B.box(c, 28.0, 111.6, 280.8, 134.2)
        B.box(c, 28.0, 134.2, 280.8, 201.6)
        B.text(c, 40.0, 118.8, "Bill To", 9)
        client_top = 137.3
        if invoice.client_name:
            B.text(c, 31.0, client_top, invoice.client_name, 10)
            client_top += 12
        if invoice.client_company:
            B.text(c, 31.0, client_top, invoice.client_company, 10)
            client_top += 12
        for li, line in enumerate(B.wrap_text(invoice.client_address or "", B.FONT, 10, 240)[:3]):
            B.text(c, 31.0, client_top, line, 10)
            client_top += 12

        # Title
        B.text(c, 478.6, 116.6, "INVOICE", 21)

        # Date / Invoice # grid
        B.box(c, 320.4, 155.8, 356.4, 178.2)
        B.box(c, 356.4, 155.8, 429.4, 178.2)
        B.box(c, 429.4, 155.8, 495.0, 178.2)
        B.box(c, 495.0, 155.8, 567.0, 178.2)
        B.text_center(c, (320.4 + 356.4) / 2, 162.9, "Date", 9)
        date_val = invoice.issue_date or invoice.created_at
        B.text_center(c, (356.4 + 429.4) / 2, 162.9, B.fmt_date(date_val), 9)
        B.text_center(c, (429.4 + 495.0) / 2, 162.9, "Invoice #", 9)
        B.text_center(c, (495.0 + 567.0) / 2, 162.9, invoice.invoice_number or "", 9)

        # VAT row
        B.box(c, 320.3, 178.6, 567.0, 201.7)
        B.text_center(c, (320.3 + 567.0) / 2, 184.9, f"VAT # {B.VAT_NUMBER}", 12)

        # Items table header
        B.box(c, COLS[0], HDR_TOP, COLS[1], HDR_BOT, fill=B.ROW_GREY)
        B.box(c, COLS[1], HDR_TOP, COLS[2], HDR_BOT, fill=B.ROW_GREY)
        B.box(c, COLS[2], HDR_TOP, COLS[3], HDR_BOT, fill=B.ROW_GREY)
        B.box(c, COLS[3], HDR_TOP, COLS[4], HDR_BOT, fill=B.ROW_GREY)
        B.text_center(c, (COLS[0] + COLS[1]) / 2, 211.1, "Description", 9)
        B.text_center(c, (COLS[1] + COLS[2]) / 2, 211.1, "Quantity", 9)
        B.text_center(c, (COLS[2] + COLS[3]) / 2, 211.1, "Price Each", 9)
        B.text_center(c, (COLS[3] + COLS[4]) / 2, 211.1, "Amount", 9)

        # Items body frame
        B.box(c, COLS[0], BODY_TOP, COLS[1], BODY_BOT)
        B.box(c, COLS[1], BODY_TOP, COLS[2], BODY_BOT)
        B.box(c, COLS[2], BODY_TOP, COLS[3], BODY_BOT)
        B.box(c, COLS[3], BODY_TOP, COLS[4], BODY_BOT)

    def draw_row(i: int, desc: str, qty: str, price: str, amount: str):
        band_top = 226.06 + i * ROW_H
        if i % 2 == 1:  # alternating grey bands, exactly as the original
            B.box(c, 28.9, band_top, 280.8, band_top + 10.6, fill=B.ROW_GREY, stroke=None)
            B.box(c, 282.7, band_top, 376.2, band_top + 10.6, fill=B.ROW_GREY, stroke=None)
            B.box(c, 378.1, band_top, 471.6, band_top + 10.6, fill=B.ROW_GREY, stroke=None)
            B.box(c, 473.5, band_top, 567.0, band_top + 10.6, fill=B.ROW_GREY, stroke=None)
            B.vline(c, COLS[1], band_top, band_top + 10.6)
            B.vline(c, COLS[2], band_top, band_top + 10.6)
            B.vline(c, COLS[3], band_top, band_top + 10.6)
        t = 227.1 + i * ROW_H
        if desc:
            B.text(c, 31.0, t, desc, 9)
        if qty:
            B.text_center(c, (COLS[1] + COLS[2]) / 2, t, qty, 9)
        if price:
            B.text_right(c, 470.5, t, price, 9)
        if amount:
            B.text_right(c, 560.5, t, amount, 9)

    # ── build row list: line items + optional discount + VAT ────────────────
    line_items = sorted(invoice.line_items, key=lambda x: x.sort_order)
    rows = []
    for li in line_items:
        rows.append((li.description or "", B.fmt_qty(li.quantity),
                     B.fmt_amount(li.unit_price), B.fmt_amount(li.total)))
    if (invoice.discount_amount or 0) > 0:
        rows.append(("Discount", "", f"{invoice.discount_pct:g}%",
                     f"-{B.fmt_amount(invoice.discount_amount)}"))
    if (invoice.tax_amount or 0) > 0:
        rows.append(("VAT", "", f"{invoice.tax_pct:.2f}%",
                     B.fmt_amount(invoice.tax_amount)))

    # ── paginate rows ────────────────────────────────────────────────────────
    pages = [rows[i:i + MAX_ROWS] for i in range(0, len(rows), MAX_ROWS)] or [[]]
    for pi, page_rows in enumerate(pages):
        page_frame()
        for ri, r in enumerate(page_rows):
            draw_row(ri, *r)
        if pi < len(pages) - 1:
            c.showPage()

    # ── bottom section (last page, fixed positions like the original) ───────
    balance = round((invoice.total or 0) - (invoice.amount_paid or 0), 2)

    # "Looking forward..." box
    B.box(c, 28.0, 454.6, 319.6, 534.6)
    B.text(c, 31.0, 458.0, "Looking forward to serve you!", 11)

    # Totals boxes
    B.box(c, 319.6, 454.6, 567.0, 481.6)
    B.text(c, 331.6, 461.8, f"Total in {currency}", 14)
    B.text_right(c, 564.0, 464.5, B.fmt_amount(invoice.total), 9)

    B.box(c, 319.6, 481.6, 567.0, 508.6)
    B.text(c, 331.6, 489.9, f"Payments/Credits ({currency})", 12)
    B.text_right(c, 559.8, 490.9, B.fmt_amount(invoice.amount_paid), 9)

    B.box(c, 319.6, 508.6, 567.0, 534.6)
    B.text(c, 331.6, 516.4, f"Balance Due ({currency})", 12)
    B.text_right(c, 562.5, 517.2, B.fmt_amount(balance), 9)

    # Bank account boxes (BHD | EUR | USD)
    bank_boxes = [(23.4, 203.4, 26.4), (203.4, 388.8, 206.4), (388.8, 572.4, 391.8)]
    for acct, (bx0, bx1, tx) in zip(B.BANK_ACCOUNTS, bank_boxes):
        B.box(c, bx0, 536.4, bx1, 657.0)
        B.text(c, tx, 540.1, f"CURRENCY: {acct['currency']}", 10)
        name_lines = B.wrap_text(acct["name"], B.FONT, 10, bx1 - tx - 6)
        line_top = 566.0
        for nl in name_lines[:2]:
            B.text(c, tx, line_top, nl, 10)
            line_top += 12.95
        B.text(c, tx, 591.9, f"AC NO:{acct['ac_no']}", 10)
        B.text(c, tx, 604.9, f"IBAN:{acct['iban']}", 10)
        B.text(c, tx, 617.9, f"SWIFT CODE:{acct['swift']}", 10)
        B.text(c, tx, 630.8, f"BANK:{acct['bank']}", 10)
        B.text(c, tx, 643.8, f"BRANCH:{acct['branch']}", 10)

    # Signature + stamp, underline and caption
    B.draw_signature_and_stamp(
        c,
        sig_x=85.6, sig_top=666.0, sig_w=128.6, sig_h=79.2,
        stamp_x=185.4, stamp_top=652.6, stamp_size=99.0,
    )
    B.hline(c, 79.2, 293.4, 739.8)
    B.text(c, 107.9, 743.3, "Signature On behalf of Company", 10)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()
