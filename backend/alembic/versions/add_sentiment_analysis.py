"""add sentiment analysis columns to activities

Revision ID: x1y2z3a4b5c6
Revises: w1x2y3z4a5b6
Create Date: 2026-07-06

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'x1y2z3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'w1x2y3z4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='activities' AND column_name='sentiment'"
    ))
    if not result.fetchone():
        op.add_column('activities', sa.Column('sentiment', sa.String(20), nullable=True))
        # positive | neutral | negative

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='activities' AND column_name='sentiment_score'"
    ))
    if not result.fetchone():
        op.add_column('activities', sa.Column('sentiment_score', sa.Float(), nullable=True))
        # -1.0 (very negative) to 1.0 (very positive)

    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='activities' AND column_name='sentiment_analyzed_at'"
    ))
    if not result.fetchone():
        op.add_column('activities', sa.Column('sentiment_analyzed_at', sa.DateTime(timezone=True), nullable=True))

    op.create_index('ix_activities_sentiment', 'activities', ['sentiment'])


def downgrade() -> None:
    op.drop_index('ix_activities_sentiment', table_name='activities')
    op.drop_column('activities', 'sentiment_analyzed_at')
    op.drop_column('activities', 'sentiment_score')
    op.drop_column('activities', 'sentiment')