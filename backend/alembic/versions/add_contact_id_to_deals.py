"""add contact_id to deals

Revision ID: i1j2k3l4m5n6
Revises: h1i2j3k4l5m6
Create Date: 2026-06-09

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'i1j2k3l4m5n6'
down_revision: Union[str, Sequence[str], None] = 'h1i2j3k4l5m6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='deals' AND column_name='contact_id'"
    ))
    if not result.fetchone():
        op.add_column('deals', sa.Column(
            'contact_id',
            UUID(as_uuid=True),
            sa.ForeignKey('contacts.id', ondelete='SET NULL'),
            nullable=True
        ))


def downgrade() -> None:
    op.drop_column('deals', 'contact_id')