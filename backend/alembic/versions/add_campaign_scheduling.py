"""add scheduled_at to campaigns, sms_campaigns, whatsapp_campaigns

Revision ID: y1z2a3b4c5d6
Revises: ef7a33058603
Create Date: 2026-07-08

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'y1z2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'ef7a33058603'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── campaigns ────────────────────────────────────────────────────────────
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='campaigns' AND column_name='scheduled_at'"
    ))
    if not result.fetchone():
        op.add_column('campaigns', sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True))

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='campaigns' AND column_name='schedule_failed_reason'"
    ))
    if not result.fetchone():
        op.add_column('campaigns', sa.Column('schedule_failed_reason', sa.Text(), nullable=True))

    # ── sms_campaigns ────────────────────────────────────────────────────────
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='sms_campaigns' AND column_name='scheduled_at'"
    ))
    if not result.fetchone():
        op.add_column('sms_campaigns', sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True))

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='sms_campaigns' AND column_name='schedule_failed_reason'"
    ))
    if not result.fetchone():
        op.add_column('sms_campaigns', sa.Column('schedule_failed_reason', sa.Text(), nullable=True))

    # ── whatsapp_campaigns ───────────────────────────────────────────────────
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='whatsapp_campaigns' AND column_name='scheduled_at'"
    ))
    if not result.fetchone():
        op.add_column('whatsapp_campaigns', sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True))

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='whatsapp_campaigns' AND column_name='schedule_failed_reason'"
    ))
    if not result.fetchone():
        op.add_column('whatsapp_campaigns', sa.Column('schedule_failed_reason', sa.Text(), nullable=True))

    # Indexes to make the scheduler's "find due campaigns" query fast
    op.create_index('ix_campaigns_scheduled_at', 'campaigns', ['scheduled_at'])
    op.create_index('ix_sms_campaigns_scheduled_at', 'sms_campaigns', ['scheduled_at'])
    op.create_index('ix_whatsapp_campaigns_scheduled_at', 'whatsapp_campaigns', ['scheduled_at'])


def downgrade() -> None:
    op.drop_index('ix_whatsapp_campaigns_scheduled_at', table_name='whatsapp_campaigns')
    op.drop_index('ix_sms_campaigns_scheduled_at', table_name='sms_campaigns')
    op.drop_index('ix_campaigns_scheduled_at', table_name='campaigns')

    op.drop_column('whatsapp_campaigns', 'schedule_failed_reason')
    op.drop_column('whatsapp_campaigns', 'scheduled_at')

    op.drop_column('sms_campaigns', 'schedule_failed_reason')
    op.drop_column('sms_campaigns', 'scheduled_at')

    op.drop_column('campaigns', 'schedule_failed_reason')
    op.drop_column('campaigns', 'scheduled_at')
