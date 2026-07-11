"""add scheduled_contact_ids to campaigns, sms_campaigns, whatsapp_campaigns

Revision ID: z1a2b3c4d5e6
Revises: y1z2a3b4c5d6
Create Date: 2026-07-11

Stores the specific contact_ids chosen at schedule-time (when the user picks
"Select specific contacts" instead of "All contacts") so the background
scheduler can honor that selection instead of always sending to everyone.
NULL means "all contacts" — same semantics as the existing send_* functions'
contact_ids=None behavior.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision: str = 'z1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'y1z2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    for table in ('campaigns', 'sms_campaigns', 'whatsapp_campaigns'):
        result = conn.execute(sa.text(
            "SELECT column_name FROM information_schema.columns "
            f"WHERE table_name='{table}' AND column_name='scheduled_contact_ids'"
        ))
        if not result.fetchone():
            op.add_column(table, sa.Column('scheduled_contact_ids', JSON(), nullable=True))


def downgrade() -> None:
    for table in ('campaigns', 'sms_campaigns', 'whatsapp_campaigns'):
        op.drop_column(table, 'scheduled_contact_ids')
