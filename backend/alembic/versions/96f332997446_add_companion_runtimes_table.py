"""add companion runtimes table

Revision ID: 96f332997446
Revises: 53245d76fea0
Create Date: 2026-06-13 19:05:41.415817

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '96f332997446'
down_revision: Union[str, None] = '53245d76fea0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'companion_runtimes',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('runtime_name', sa.String(), nullable=False),
        sa.Column('client_id', sa.String(), nullable=False),
        sa.Column('api_key_hash', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='offline'),
        sa.Column('is_revoked', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_seen_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('runtime_name'),
        sa.UniqueConstraint('client_id')
    )

    # Seed system setting for allow_runtime_registration
    system_settings_table = sa.table(
        'system_settings',
        sa.column('key', sa.String),
        sa.column('value', sa.String)
    )
    op.bulk_insert(system_settings_table, [
        {"key": "allow_runtime_registration", "value": "1"}
    ])


def downgrade() -> None:
    op.execute("DELETE FROM system_settings WHERE key = 'allow_runtime_registration'")
    op.drop_table('companion_runtimes')
