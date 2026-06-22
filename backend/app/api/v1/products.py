from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from typing import List, Optional
import uuid

router = APIRouter()


@router.get("/", response_model=List[ProductResponse])
def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Product).filter(Product.user_id == current_user.id)

    if active_only:
        query = query.filter(Product.is_active == True)

    if category:
        query = query.filter(Product.category == category)

    if search and search.strip():
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Product.name).like(s),
                func.lower(Product.description).like(s),
                func.lower(Product.sku).like(s),
                func.lower(Product.category).like(s),
            )
        )

    return query.order_by(Product.created_at.desc()).all()


@router.post("/", response_model=ProductResponse, status_code=201)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = Product(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        sku=data.sku,
        category=data.category,
        unit=data.unit,
        price=data.price,
        cost=data.cost,
        currency=data.currency,
        is_active=data.is_active,
        stock_qty=data.stock_qty,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/categories")
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return distinct category values for this user's products."""
    rows = (
        db.query(Product.category)
        .filter(Product.user_id == current_user.id, Product.category.isnot(None))
        .distinct()
        .all()
    )
    return [r[0] for r in rows if r[0]]


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.user_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.user_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.user_id == current_user.id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()