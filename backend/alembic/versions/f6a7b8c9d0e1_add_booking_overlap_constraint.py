"""add exclusion constraint to prevent overlapping confirmed bookings

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-07-27

Adds a Postgres EXCLUDE constraint (via btree_gist) so the database itself
guarantees no two 'confirmed' bookings for the same host can overlap in
time, regardless of application-level race conditions. The app-level
conflict check in create_public_booking() stays as a fast-path for a
friendly error message; this constraint is the real guarantee, surfaced
to the app as an IntegrityError on commit.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Required for GiST indexes/exclusion constraints over scalar types
    # (user_id) combined with range types (tstzrange).
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    op.execute("""
        ALTER TABLE meeting_bookings
        ADD CONSTRAINT no_overlapping_confirmed_bookings
        EXCLUDE USING gist (
            user_id WITH =,
            tstzrange(start_time, end_time) WITH &&
        )
        WHERE (status = 'confirmed')
    """)


def downgrade() -> None:
    op.execute(
        "ALTER TABLE meeting_bookings "
        "DROP CONSTRAINT IF EXISTS no_overlapping_confirmed_bookings"
    )
    # Not dropping the btree_gist extension on downgrade — other objects in
    # the database may depend on it, and dropping it is rarely desired.