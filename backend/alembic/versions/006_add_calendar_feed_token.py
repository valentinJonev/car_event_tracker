"""add calendar_feed_token column to users table

Revision ID: 006
Revises: 005
Create Date: 2024-01-06 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("calendar_feed_token", sa.String(64), nullable=True),
    )
    op.create_index(
        "ix_users_calendar_feed_token",
        "users",
        ["calendar_feed_token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_users_calendar_feed_token", table_name="users")
    op.drop_column("users", "calendar_feed_token")
