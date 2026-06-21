"""add deal stage history table

Revision ID: p1q2r3s4t5u6
Revises: o1p2q3r4s5t6
Create Date: 2026-06-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'p1q2r3s4t5u6'
down_revision: Union[str, Sequence[str], None] = 'o1p2q3r4s5t6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'deal_stage_history',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('deal_id', UUID(as_uuid=True), sa.ForeignKey('deals.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('from_stage', sa.String(), nullable=True),
        sa.Column('to_stage', sa.String(), nullable=False),
        sa.Column('entered_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_deal_stage_history_deal_id', 'deal_stage_history', ['deal_id'])
    op.create_index('ix_deal_stage_history_user_id', 'deal_stage_history', ['user_id'])

    # Backfill: give every existing deal an initial history row at its current stage,
    # using the deal's created_at as the entered_at timestamp. This means velocity
    # for stages BEFORE this migration won't be accurate, but going forward it will be.
    conn = op.get_bind()
    conn.execute(sa.text("""
        INSERT INTO deal_stage_history (id, deal_id, user_id, from_stage, to_stage, entered_at)
        SELECT gen_random_uuid(), id, user_id, NULL, stage, created_at
        FROM deals
    """))


def downgrade() -> None:
    op.drop_index('ix_deal_stage_history_user_id', table_name='deal_stage_history')
    op.drop_index('ix_deal_stage_history_deal_id', table_name='deal_stage_history')
    op.drop_table('deal_stage_history')