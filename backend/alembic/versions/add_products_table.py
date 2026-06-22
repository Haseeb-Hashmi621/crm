"""add products table

Revision ID: q1r2s3t4u5v6
Revises: p1q2r3s4t5u6
Create Date: 2026-06-21

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'q1r2s3t4u5v6'
down_revision: Union[str, Sequence[str], None] = 'p1q2r3s4t5u6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'products',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sku', sa.String(100), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('unit', sa.String(50), nullable=True),
        sa.Column('price', sa.Float(), nullable=False, server_default='0'),
        sa.Column('cost', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(10), nullable=False, server_default='USD'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('stock_qty', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_products_user_id', 'products', ['user_id'])
    op.create_index('ix_products_category', 'products', ['category'])
    op.create_index('ix_products_is_active', 'products', ['is_active'])


def downgrade() -> None:
    op.drop_index('ix_products_is_active', table_name='products')
    op.drop_index('ix_products_category', table_name='products')
    op.drop_index('ix_products_user_id', table_name='products')
    op.drop_table('products')