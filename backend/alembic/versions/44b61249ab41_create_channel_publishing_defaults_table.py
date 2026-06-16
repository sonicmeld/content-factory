"""create channel_publishing_defaults table

Revision ID: 44b61249ab41
Revises: c7a78f2d5b19
Create Date: 2026-06-16 10:57:26.100860

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '44b61249ab41'
down_revision: Union[str, None] = 'c7a78f2d5b19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'channel_publishing_defaults',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('channel_id', sa.String(), nullable=False),
        sa.Column('preferred_publish_time', sa.String(), nullable=False, server_default='19:00'),
        sa.Column('timezone', sa.String(), nullable=True),
        sa.Column('default_playlist_id', sa.String(), nullable=True),
        sa.Column('auto_schedule_enabled', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('channel_id')
    )
    op.create_index('idx_channel_publishing_defaults_channel', 'channel_publishing_defaults', ['channel_id'])


def downgrade() -> None:
    op.drop_index('idx_channel_publishing_defaults_channel', table_name='channel_publishing_defaults')
    op.drop_table('channel_publishing_defaults')

