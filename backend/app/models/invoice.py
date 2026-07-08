import uuid
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id", ondelete="SET NULL"), nullable=True)
    quote_id = Column(UUID(as_uuid=True), ForeignKey("quotes.id", ondelete="SET NULL"), nullable=True)

    invoice_number = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default="unpaid")
    # unpaid | partially_paid | paid | overdue | cancelled | void

    # Party info
    client_name = Column(String(255), nullable=True)
    client_email = Column(String(255), nullable=True)
    client_address = Column(Text, nullable=True)
    client_company = Column(String(255), nullable=True)

    # Financials
    subtotal = Column(Float, nullable=False, default=0.0)
    discount_pct = Column(Float, nullable=False, default=0.0)
    discount_amount = Column(Float, nullable=False, default=0.0)
    tax_pct = Column(Float, nullable=False, default=0.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    total = Column(Float, nullable=False, default=0.0)
    amount_paid = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), nullable=False, default="USD")

    # Dates
    issue_date = Column(DateTime(timezone=True), server_default=func.now())
    due_date = Column(DateTime(timezone=True), nullable=True)
    paid_date = Column(DateTime(timezone=True), nullable=True)

    notes = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    contact = relationship("Contact", lazy="select")
    line_items = relationship("InvoiceLineItem", back_populates="invoice",
                              cascade="all, delete-orphan", lazy="select")


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    description = Column(String(500), nullable=False)
    quantity = Column(Float, nullable=False, default=1.0)
    unit_price = Column(Float, nullable=False, default=0.0)
    discount_pct = Column(Float, nullable=False, default=0.0)
    vat_applicable = Column(Boolean, nullable=False, default=True)
    total = Column(Float, nullable=False, default=0.0)
    sort_order = Column(Integer, nullable=False, default=0)

    invoice = relationship("Invoice", back_populates="line_items")