"""add_9router_safeguard_settings

Revision ID: ed2a02c8af7e
Revises: 0f3a8bc5ff58
Create Date: 2026-06-12 21:10:51.286838

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed2a02c8af7e'
down_revision: Union[str, None] = '0f3a8bc5ff58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    system_settings_table = sa.table(
        'system_settings',
        sa.column('key', sa.String),
        sa.column('value', sa.String)
    )
    op.bulk_insert(system_settings_table, [
        {"key": "nine_router_timeout", "value": "60"},
        {"key": "nine_router_max_tokens", "value": "4000"},
        {"key": "nine_router_strip_json_mode", "value": "1"},
        {"key": "nine_router_strip_penalties", "value": "1"},
        {"key": "nine_router_convert_system_to_user", "value": "0"}
    ])


def downgrade() -> None:
    op.execute("DELETE FROM system_settings WHERE key IN ('nine_router_timeout', 'nine_router_max_tokens', 'nine_router_strip_json_mode', 'nine_router_strip_penalties', 'nine_router_convert_system_to_user')")
