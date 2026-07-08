from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class InvoiceLineItemCreate(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    discount_pct: float = 0.0
    vat_applicable: bool = True
    product_id: Optional[UUID] = None
    sort_order: int = 0


class InvoiceLineItemResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    product_id: Optional[UUID] = None
    description: str
    quantity: float
    unit_price: float
    discount_pct: float
    vat_applicable: bool = True
    total: float
    sort_order: int

    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    quote_id: Optional[UUID] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_address: Optional[str] = None
    client_company: Optional[str] = None
    discount_pct: float = 0.0
    tax_pct: float = 0.0
    currency: str = "USD"
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    line_items: List[InvoiceLineItemCreate] = []


class InvoiceUpdate(BaseModel):
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_address: Optional[str] = None
    client_company: Optional[str] = None
    status: Optional[str] = None
    discount_pct: Optional[float] = None
    tax_pct: Optional[float] = None
    currency: Optional[str] = None
    due_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    amount_paid: Optional[float] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    line_items: Optional[List[InvoiceLineItemCreate]] = None


class ContactMini(BaseModel):
    id: UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: UUID
    user_id: UUID
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    quote_id: Optional[UUID] = None
    invoice_number: str
    status: str
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_address: Optional[str] = None
    client_company: Optional[str] = None
    subtotal: float
    discount_pct: float
    discount_amount: float
    tax_pct: float
    tax_amount: float
    total: float
    amount_paid: float
    currency: str
    issue_date: datetime
    due_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    contact: Optional[ContactMini] = None
    line_items: List[InvoiceLineItemResponse] = []

    class Config:
        from_attributes = True