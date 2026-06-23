"""add quotes and quote line items tables

Revision ID: r1s2t3u4v5w6
Revises: q1r2s3t4u5v6
Create Date: 2026-06-21

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'r1s2t3u4v5w6'
down_revision: Union[str, Sequence[str], None] = 'q1r2s3t4u5v6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'quotes',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('contact_id', UUID(as_uuid=True), sa.ForeignKey('contacts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('deal_id', UUID(as_uuid=True), sa.ForeignKey('deals.id', ondelete='SET NULL'), nullable=True),
        sa.Column('quote_number', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('client_name', sa.String(255), nullable=True),
        sa.Column('client_email', sa.String(255), nullable=True),
        sa.Column('client_company', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('currency', sa.String(10), nullable=False, server_default='USD'),
        sa.Column('discount_type', sa.String(10), nullable=False, server_default='percent'),
        sa.Column('discount_value', sa.Float(), nullable=False, server_default='0'),
        sa.Column('tax_percent', sa.Float(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_quotes_user_id', 'quotes', ['user_id'])
    op.create_index('ix_quotes_contact_id', 'quotes', ['contact_id'])
    op.create_index('ix_quotes_deal_id', 'quotes', ['deal_id'])
    op.create_index('ix_quotes_status', 'quotes', ['status'])

    op.create_table(
        'quote_line_items',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('quote_id', UUID(as_uuid=True), sa.ForeignKey('quotes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('product_id', UUID(as_uuid=True), sa.ForeignKey('products.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('quantity', sa.Float(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Float(), nullable=False, server_default='0'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
    )
    op.create_index('ix_quote_line_items_quote_id', 'quote_line_items', ['quote_id'])


def downgrade() -> None:
    op.drop_index('ix_quote_line_items_quote_id', table_name='quote_line_items')
    op.drop_table('quote_line_items')
    op.drop_index('ix_quotes_status', table_name='quotes')
    op.drop_index('ix_quotes_deal_id', table_name='quotes')
    op.drop_index('ix_quotes_contact_id', table_name='quotes')
    op.drop_index('ix_quotes_user_id', table_name='quotes')
    op.drop_table('quotes')