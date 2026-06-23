"""add invoices table

Revision ID: s1t2u3v4w5x6
Revises: r1s2t3u4v5w6
Create Date: 2026-06-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 's1t2u3v4w5x6'
down_revision: Union[str, Sequence[str], None] = 'r1s2t3u4v5w6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'invoices',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('contact_id', UUID(as_uuid=True),
                  sa.ForeignKey('contacts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('deal_id', UUID(as_uuid=True),
                  sa.ForeignKey('deals.id', ondelete='SET NULL'), nullable=True),
        sa.Column('quote_id', UUID(as_uuid=True),
                  sa.ForeignKey('quotes.id', ondelete='SET NULL'), nullable=True),
        sa.Column('invoice_number', sa.String(50), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='unpaid'),
        sa.Column('client_name', sa.String(255), nullable=True),
        sa.Column('client_email', sa.String(255), nullable=True),
        sa.Column('client_address', sa.Text(), nullable=True),
        sa.Column('client_company', sa.String(255), nullable=True),
        sa.Column('subtotal', sa.Float(), nullable=False, server_default='0'),
        sa.Column('discount_pct', sa.Float(), nullable=False, server_default='0'),
        sa.Column('discount_amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('tax_pct', sa.Float(), nullable=False, server_default='0'),
        sa.Column('tax_amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total', sa.Float(), nullable=False, server_default='0'),
        sa.Column('amount_paid', sa.Float(), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(10), nullable=False, server_default='USD'),
        sa.Column('issue_date', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paid_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('terms', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    op.create_table(
        'invoice_line_items',
        sa.Column('id', UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('invoice_id', UUID(as_uuid=True),
                  sa.ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', UUID(as_uuid=True),
                  sa.ForeignKey('products.id', ondelete='SET NULL'), nullable=True),
        sa.Column('description', sa.String(500), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Float(), nullable=False, server_default='0'),
        sa.Column('discount_pct', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total', sa.Float(), nullable=False, server_default='0'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
    )

    op.create_index('ix_invoices_user_id', 'invoices', ['user_id'])
    op.create_index('ix_invoices_status', 'invoices', ['status'])
    op.create_index('ix_invoices_contact_id', 'invoices', ['contact_id'])
    op.create_index('ix_invoices_due_date', 'invoices', ['due_date'])
    op.create_index('ix_invoice_line_items_invoice_id', 'invoice_line_items', ['invoice_id'])


def downgrade() -> None:
    op.drop_index('ix_invoice_line_items_invoice_id', table_name='invoice_line_items')
    op.drop_index('ix_invoices_due_date', table_name='invoices')
    op.drop_index('ix_invoices_contact_id', table_name='invoices')
    op.drop_index('ix_invoices_status', table_name='invoices')
    op.drop_index('ix_invoices_user_id', table_name='invoices')
    op.drop_table('invoice_line_items')
    op.drop_table('invoices')