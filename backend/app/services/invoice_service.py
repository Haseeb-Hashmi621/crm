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
    subtotal = sum(_calc_line_total(li.quantity, li.unit_price, li.discount_pct)
                   for li in line_items)
    discount_amount = round(subtotal * discount_pct / 100, 2)
    taxable = subtotal - discount_amount
    tax_amount = round(taxable * tax_pct / 100, 2)
    total = round(taxable + tax_amount, 2)
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


# ── PDF Generation ─────────────────────────────────────────────────────────────

def generate_invoice_pdf(invoice: Invoice) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    W = A4[0] - 40 * mm   # usable width = 170 mm

    VIOLET = colors.HexColor("#7C3AED")
    DARK = colors.HexColor("#111827")
    MID = colors.HexColor("#6B7280")
    LIGHT = colors.HexColor("#F3F4F6")
    STATUS_COL = _status_color(invoice.status)

    def style(name, **kw):
        s = ParagraphStyle(name, parent=styles["Normal"], **kw)
        return s

    header_title = style("HT", fontSize=26, textColor=VIOLET,
                          fontName="Helvetica-Bold")
    header_sub = style("HS", fontSize=9, textColor=MID)
    label_s = style("LB", fontSize=8, textColor=MID, fontName="Helvetica-Bold",
                    spaceAfter=1)
    value_s = style("VL", fontSize=10, textColor=DARK)
    right_s = style("RT", fontSize=9, textColor=MID, alignment=TA_RIGHT)
    right_bold = style("RB", fontSize=10, textColor=DARK,
                        fontName="Helvetica-Bold", alignment=TA_RIGHT)
    total_s = style("TS", fontSize=14, textColor=VIOLET,
                    fontName="Helvetica-Bold", alignment=TA_RIGHT)
    note_s = style("NS", fontSize=8, textColor=MID, leading=12)
    status_s = style("ST", fontSize=9, textColor=colors.white,
                      fontName="Helvetica-Bold", alignment=TA_CENTER)

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    status_label = invoice.status.replace("_", " ").upper()
    status_pill = Table(
        [[Paragraph(status_label, status_s)]],
        colWidths=[28 * mm],
    )
    status_pill.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), STATUS_COL),
        ("ROUNDEDCORNERS", [4]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))

    # Header: title takes remaining width, badge is 35 mm — sum = W ✓
    header_table = Table(
        [[Paragraph("INVOICE", header_title), status_pill]],
        colWidths=[W - 35 * mm, 35 * mm],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(invoice.invoice_number, style(
        "IN", fontSize=13, textColor=DARK, fontName="Helvetica-Bold")))
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=1,
                              color=colors.HexColor("#E5E7EB")))
    story.append(Spacer(1, 6 * mm))

    # ── Bill To / Invoice Details ─────────────────────────────────────────────
    # Two equal columns: W/2 each, with a small gap via right padding — sum = W ✓
    col_w = W / 2 - 5 * mm

    def info_block(items):
        parts = []
        for label, val in items:
            if val:
                parts.append(Paragraph(label, label_s))
                parts.append(Paragraph(str(val), value_s))
                parts.append(Spacer(1, 2 * mm))
        return parts

    bill_to = info_block([
        ("BILL TO", ""),
        ("Name", invoice.client_name or "—"),
        ("Company", invoice.client_company),
        ("Email", invoice.client_email),
        ("Address", invoice.client_address),
    ])

    issue_str = invoice.issue_date.strftime("%B %d, %Y") if invoice.issue_date else "—"
    due_str = invoice.due_date.strftime("%B %d, %Y") if invoice.due_date else "—"
    paid_str = invoice.paid_date.strftime("%B %d, %Y") if invoice.paid_date else None

    invoice_info = info_block([
        ("INVOICE DETAILS", ""),
        ("Invoice #", invoice.invoice_number),
        ("Issue Date", issue_str),
        ("Due Date", due_str),
        ("Paid Date", paid_str),
        ("Currency", invoice.currency),
    ])

    max_rows = max(len(bill_to), len(invoice_info))
    while len(bill_to) < max_rows:
        bill_to.append(Spacer(1, 1))
    while len(invoice_info) < max_rows:
        invoice_info.append(Spacer(1, 1))

    two_col = Table(
        [[bill_to, invoice_info]],
        colWidths=[col_w, col_w + 10 * mm],
    )
    two_col.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(two_col)
    story.append(Spacer(1, 8 * mm))

    # ── Line Items ────────────────────────────────────────────────────────────
    line_items = sorted(invoice.line_items, key=lambda x: x.sort_order)

    li_header = ["Description", "Qty", "Unit Price", "Disc %", "Total"]
    li_data = [li_header]
    for li in line_items:
        li_data.append([
            li.description,
            f"{li.quantity:g}",
            _fmt(li.unit_price, invoice.currency),
            f"{li.discount_pct:g}%" if li.discount_pct else "—",
            _fmt(li.total, invoice.currency),
        ])

    # Proportional widths — must sum to W (170 mm) ✓
    col_widths = [W * 0.42, W * 0.08, W * 0.18, W * 0.12, W * 0.20]
    li_table = Table(li_data, colWidths=col_widths)
    li_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), VIOLET),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), DARK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (0, -1), 6),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 6),
    ]))
    story.append(li_table)
    story.append(Spacer(1, 6 * mm))

    # ── Totals ────────────────────────────────────────────────────────────────
    #
    # FIX: The original code had:
    #   totals_table  colWidths = [W - 55mm, 55mm]  → 170 mm total (full page width)
    #   totals_wrapper colWidths = [W*0.45, W*0.55] → right cell is only 93.5 mm
    #
    # A 170 mm table crammed into a 93.5 mm cell = 76.5 mm of content clipped.
    #
    # Fix: the inner totals table must fit inside the right wrapper cell (W * 0.55).
    #   TOTALS_RIGHT = W * 0.55  (93.5 mm)
    #   label col    = TOTALS_RIGHT * 0.60  (56.1 mm)
    #   value col    = TOTALS_RIGHT * 0.40  (37.4 mm)
    #   sum          = 93.5 mm  ✓  fits perfectly in its wrapper cell
    #
    TOTALS_RIGHT = W * 0.55                    # 93.5 mm — right wrapper cell width
    label_col    = TOTALS_RIGHT * 0.60         # 56.1 mm
    value_col    = TOTALS_RIGHT * 0.40         # 37.4 mm

    totals_data = []
    totals_data.append([Paragraph("Subtotal", right_s),
                         Paragraph(_fmt(invoice.subtotal, invoice.currency), right_bold)])
    if invoice.discount_amount > 0:
        totals_data.append([
            Paragraph(f"Discount ({invoice.discount_pct:g}%)", right_s),
            Paragraph(f"− {_fmt(invoice.discount_amount, invoice.currency)}", right_bold),
        ])
    if invoice.tax_amount > 0:
        totals_data.append([
            Paragraph(f"Tax ({invoice.tax_pct:g}%)", right_s),
            Paragraph(_fmt(invoice.tax_amount, invoice.currency), right_bold),
        ])

    totals_data.append([
        Paragraph("TOTAL DUE", style("TLBL", fontSize=11, textColor=VIOLET,
                                      fontName="Helvetica-Bold", alignment=TA_RIGHT)),
        Paragraph(_fmt(invoice.total, invoice.currency), total_s),
    ])

    if invoice.amount_paid > 0:
        totals_data.append([
            Paragraph("Amount Paid", right_s),
            Paragraph(_fmt(invoice.amount_paid, invoice.currency), right_bold),
        ])
        balance = invoice.total - invoice.amount_paid
        totals_data.append([
            Paragraph("Balance Due", style("BL", fontSize=10,
                                            textColor=colors.HexColor("#EF4444"),
                                            fontName="Helvetica-Bold", alignment=TA_RIGHT)),
            Paragraph(_fmt(balance, invoice.currency),
                       style("BLV", fontSize=12,
                              textColor=colors.HexColor("#EF4444"),
                              fontName="Helvetica-Bold", alignment=TA_RIGHT)),
        ])

    # Inner totals table: label_col + value_col = TOTALS_RIGHT ✓
    totals_table = Table(totals_data, colWidths=[label_col, value_col])
    totals_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEABOVE", (0, -1 if invoice.amount_paid == 0 else -3),
         (-1, -1 if invoice.amount_paid == 0 else -3), 1, VIOLET),
    ]))

    # Outer wrapper: spacer(W*0.45) + totals(W*0.55) = W ✓
    totals_wrapper = Table(
        [[None, totals_table]],
        colWidths=[W * 0.45, TOTALS_RIGHT],
    )
    totals_wrapper.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(totals_wrapper)

    # ── Notes & Terms ─────────────────────────────────────────────────────────
    if invoice.notes or invoice.terms:
        story.append(Spacer(1, 8 * mm))
        story.append(HRFlowable(width="100%", thickness=0.5,
                                  color=colors.HexColor("#E5E7EB")))
        story.append(Spacer(1, 4 * mm))
        foot_data = []
        if invoice.notes:
            foot_data.append([
                [Paragraph("Notes", label_s),
                 Paragraph(invoice.notes, note_s)],
                None,
            ])
        if invoice.terms:
            foot_data.append([
                [Paragraph("Payment Terms", label_s),
                 Paragraph(invoice.terms, note_s)],
                None,
            ])
        for row in foot_data:
            story.append(row[0][0])
            story.append(row[0][1])
            story.append(Spacer(1, 4 * mm))

    doc.build(story)
    return buffer.getvalue()