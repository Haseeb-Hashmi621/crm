"""add meeting scheduler tables (meeting types, availability, overrides, bookings)

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-23
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'meeting_types',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('buffer_before_minutes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('buffer_after_minutes', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('color', sa.String(20), nullable=True, server_default='violet'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('location', sa.String(255), nullable=True, server_default='Phone / WhatsApp call'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_meeting_types_user_id', 'meeting_types', ['user_id'])

    op.create_table(
        'availability_schedules',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_availability_schedules_user_id', 'availability_schedules', ['user_id'])

    op.create_table(
        'availability_overrides',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('is_blocked', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('start_time', sa.Time(), nullable=True),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('reason', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_availability_overrides_user_id', 'availability_overrides', ['user_id'])
    op.create_index('ix_availability_overrides_date', 'availability_overrides', ['date'])

    op.create_table(
        'meeting_bookings',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('meeting_type_id', UUID(as_uuid=True), sa.ForeignKey('meeting_types.id', ondelete='SET NULL'), nullable=True),
        sa.Column('contact_id', UUID(as_uuid=True), sa.ForeignKey('contacts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('calendar_event_id', UUID(as_uuid=True), sa.ForeignKey('calendar_events.id', ondelete='SET NULL'), nullable=True),
        sa.Column('task_id', UUID(as_uuid=True), sa.ForeignKey('tasks.id', ondelete='SET NULL'), nullable=True),
        sa.Column('guest_name', sa.String(255), nullable=False),
        sa.Column('guest_email', sa.String(255), nullable=False),
        sa.Column('guest_phone', sa.String(50), nullable=True),
        sa.Column('guest_notes', sa.Text(), nullable=True),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('timezone', sa.String(50), nullable=False, server_default='Asia/Karachi'),
        sa.Column('status', sa.String(20), nullable=False, server_default='confirmed'),
        sa.Column('cancel_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_meeting_bookings_user_id', 'meeting_bookings', ['user_id'])
    op.create_index('ix_meeting_bookings_start_time', 'meeting_bookings', ['start_time'])
    op.create_index('ix_meeting_bookings_status', 'meeting_bookings', ['status'])

    # Seed a default weekly schedule (Sat-Thu 08:00-20:00, Friday off) plus one
    # starter meeting type for every existing user, so the feature works
    # immediately without manual setup.
    conn = op.get_bind()
    user_ids = [row[0] for row in conn.execute(sa.text("SELECT id FROM users")).fetchall()]
    # Python weekday(): Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    working_days = [5, 6, 0, 1, 2, 3]  # Sat, Sun, Mon, Tue, Wed, Thu
    for uid in user_ids:
        for day in working_days:
            conn.execute(sa.text("""
                INSERT INTO availability_schedules (id, user_id, day_of_week, start_time, end_time, is_active, created_at)
                VALUES (gen_random_uuid(), :uid, :day, '08:00', '20:00', true, now())
            """), {"uid": uid, "day": day})
        conn.execute(sa.text("""
            INSERT INTO meeting_types (id, user_id, name, slug, description, duration_minutes, buffer_after_minutes, is_active, location, created_at, updated_at)
            VALUES (gen_random_uuid(), :uid, '30-Minute Consultation', 'consultation-30', 'A general discovery call to discuss your requirements.', 30, 10, true, 'Phone / WhatsApp call', now(), now())
        """), {"uid": uid})


def downgrade() -> None:
    op.drop_index('ix_meeting_bookings_status', table_name='meeting_bookings')
    op.drop_index('ix_meeting_bookings_start_time', table_name='meeting_bookings')
    op.drop_index('ix_meeting_bookings_user_id', table_name='meeting_bookings')
    op.drop_table('meeting_bookings')

    op.drop_index('ix_availability_overrides_date', table_name='availability_overrides')
    op.drop_index('ix_availability_overrides_user_id', table_name='availability_overrides')
    op.drop_table('availability_overrides')

    op.drop_index('ix_availability_schedules_user_id', table_name='availability_schedules')
    op.drop_table('availability_schedules')

    op.drop_index('ix_meeting_types_user_id', table_name='meeting_types')
    op.drop_table('meeting_types')