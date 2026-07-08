"""
backend/app/schemas/quote.py  — NEW FILE
"""
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class LineItemCreate(BaseModel):
    product_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    quantity: float = 1.0
    unit_price: float = 0.0
    vat_applicable: bool = True


class LineItemResponse(BaseModel):
    id: UUID
    product_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    quantity: float
    unit_price: float
    vat_applicable: bool = True
    sort_order: int

    class Config:
        from_attributes = True


class QuoteCreate(BaseModel):
    title: str
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_company: Optional[str] = None
    notes: Optional[str] = None
    currency: str = "USD"
    discount_type: str = "percent"   # 'percent' | 'fixed'
    discount_value: float = 0.0
    tax_percent: float = 0.0
    valid_until: Optional[datetime] = None
    line_items: List[LineItemCreate] = []


class QuoteUpdate(BaseModel):
    title: Optional[str] = None
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_company: Optional[str] = None
    notes: Optional[str] = None
    currency: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    tax_percent: Optional[float] = None
    status: Optional[str] = None
    valid_until: Optional[datetime] = None
    line_items: Optional[List[LineItemCreate]] = None   # if provided, replaces all line items


class ContactMini(BaseModel):
    id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None

    class Config:
        from_attributes = True


class QuoteResponse(BaseModel):
    id: UUID
    user_id: UUID
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    quote_number: str
    title: str
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_company: Optional[str] = None
    notes: Optional[str] = None
    currency: str
    discount_type: str
    discount_value: float
    tax_percent: float
    status: str
    valid_until: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    line_items: List[LineItemResponse] = []
    contact: Optional[ContactMini] = None

    # Computed totals — filled in by the service layer, not stored columns
    subtotal: float = 0.0
    discount_amount: float = 0.0
    tax_amount: float = 0.0
    total: float = 0.0

    class Config:
        from_attributes = True