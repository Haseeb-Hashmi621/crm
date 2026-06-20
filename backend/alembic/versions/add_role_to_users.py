"""add role to users table

Revision ID: o1p2q3r4s5t6
Revises: n1o2p3q4r5s6
Create Date: 2026-06-17

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'o1p2q3r4s5t6'
down_revision: Union[str, Sequence[str], None] = 'n1o2p3q4r5s6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Check if column already exists (idempotent)
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='users' AND column_name='role'"
    ))
    if result.fetchone():
        return  # already migrated

    # Add role column — default 'employee', existing first user becomes admin
    op.add_column('users', sa.Column(
        'role', sa.String(20), nullable=True
    ))

    # Make the first registered user admin, rest employees
    conn.execute(sa.text("""
        UPDATE users
        SET role = CASE
            WHEN id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
            THEN 'admin'
            ELSE 'employee'
        END
    """))

    op.alter_column('users', 'role', nullable=False, server_default='employee')
    op.create_index('ix_users_role', 'users', ['role'])


def downgrade() -> None:
    op.drop_index('ix_users_role', table_name='users')
    op.drop_column('users', 'role')