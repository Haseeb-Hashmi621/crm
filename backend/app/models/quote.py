"""
backend/app/models/quote.py  — NEW FILE
"""
import uuid
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Quote(Base):
    __tablename__ = "quotes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Optional links — a quote can stand alone, or be tied to a contact/deal
    contact_id = Column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id", ondelete="SET NULL"), nullable=True)

    quote_number = Column(String(50), nullable=False)   # e.g. Q-2026-0001
    title = Column(String(255), nullable=False)
    client_name = Column(String(255), nullable=True)
    client_email = Column(String(255), nullable=True)
    client_company = Column(String(255), nullable=True)

    notes = Column(Text, nullable=True)            # terms, notes shown on the quote
    currency = Column(String(10), nullable=False, default="USD")

    discount_type = Column(String(10), nullable=False, default="percent")  # 'percent' | 'fixed'
    discount_value = Column(Float, nullable=False, default=0.0)
    tax_percent = Column(Float, nullable=False, default=0.0)

    status = Column(String(20), nullable=False, default="draft")  # draft | sent | accepted | declined | expired
    valid_until = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)

    line_items = relationship(
        "QuoteLineItem", back_populates="quote",
        cascade="all, delete-orphan", order_by="QuoteLineItem.sort_order",
        lazy="selectin",
    )
    contact = relationship("Contact", lazy="select")


class QuoteLineItem(Base):
    __tablename__ = "quote_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quote_id = Column(UUID(as_uuid=True), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Float, nullable=False, default=1.0)
    unit_price = Column(Float, nullable=False, default=0.0)
    vat_applicable = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)

    quote = relationship("Quote", back_populates="line_items")