"""add vat_applicable to line items

Revision ID: ef7a33058603
Revises: x1y2z3a4b5c6
Create Date: 2026-07-06 16:41:37.848286

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ef7a33058603'
down_revision: Union[str, Sequence[str], None] = 'x1y2z3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add per-line-item VAT applicability flag to quotes and invoices.

    server_default=sa.true() backfills existing rows as VAT-applicable,
    which preserves the current totals of all existing quotes/invoices.
    """
    op.add_column(
        'quote_line_items',
        sa.Column('vat_applicable', sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        'invoice_line_items',
        sa.Column('vat_applicable', sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    """Remove the VAT applicability flag."""
    op.drop_column('invoice_line_items', 'vat_applicable')
    op.drop_column('quote_line_items', 'vat_applicable')