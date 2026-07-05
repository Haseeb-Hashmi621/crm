"""add ai deal scoring columns

Revision ID: w1x2y3z4a5b6
Revises: v1w2x3y4z5a6
Create Date: 2026-07-05

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision: str = 'w1x2y3z4a5b6'
down_revision: Union[str, Sequence[str], None] = 'v1w2x3y4z5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='deals' AND column_name='ai_score'"
    ))
    if not result.fetchone():
        op.add_column('deals', sa.Column('ai_score', sa.Integer(), nullable=True))

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='deals' AND column_name='ai_score_reasoning'"
    ))
    if not result.fetchone():
        op.add_column('deals', sa.Column('ai_score_reasoning', sa.Text(), nullable=True))

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='deals' AND column_name='ai_score_factors'"
    ))
    if not result.fetchone():
        op.add_column('deals', sa.Column('ai_score_factors', JSON(), nullable=True))

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='deals' AND column_name='ai_scored_at'"
    ))
    if not result.fetchone():
        op.add_column('deals', sa.Column('ai_scored_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('deals', 'ai_scored_at')
    op.drop_column('deals', 'ai_score_factors')
    op.drop_column('deals', 'ai_score_reasoning')
    op.drop_column('deals', 'ai_score')