"""add deal_id to activities

Revision ID: g1h2i3j4k5l6
Revises: f1a2b3c4d5e6
Create Date: 2026-06-09

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='activities' AND column_name='deal_id'"
    ))
    if not result.fetchone():
        op.add_column('activities', sa.Column(
            'deal_id',
            UUID(as_uuid=True),
            sa.ForeignKey('deals.id', ondelete='CASCADE'),
            nullable=True
        ))


def downgrade() -> None:
    op.drop_column('activities', 'deal_id')