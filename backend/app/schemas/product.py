from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    price: float = 0.0
    cost: Optional[float] = None
    currency: str = "USD"
    is_active: bool = True
    stock_qty: Optional[int] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None
    stock_qty: Optional[int] = None


class ProductResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    price: float
    cost: Optional[float] = None
    currency: str
    is_active: bool
    stock_qty: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True