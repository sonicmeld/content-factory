"""youtube_identity_layer_consolidation

Revision ID: a1b2c3d4e5f6
Revises: ff36ca058386
Create Date: 2026-06-14 14:50:00.000000

Non-destructive migration:
1. Creates youtube_accounts table (SSOT for YouTube identity, multi-GCP)
2. Adds youtube_account_id column to:
   - analytics_context_exports
   - analytics_enriched_contexts
   - analytics_generated_drafts
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'ff36ca058386'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create youtube_accounts table (SSOT)
    op.create_table(
        'youtube_accounts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('workspace_id', sa.String(), nullable=False),
        sa.Column('gcp_profile_id', sa.String(), nullable=True),
        sa.Column('channel_binding_id', sa.String(), nullable=True),
        sa.Column('google_account_email', sa.String(), nullable=True),
        sa.Column('youtube_channel_id', sa.String(), nullable=False),
        sa.Column('youtube_channel_title', sa.String(), nullable=False),
        sa.Column('youtube_handle', sa.String(), nullable=True),
        sa.Column('youtube_channel_url', sa.String(), nullable=True),
        sa.Column('analytics_enabled', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('youtube_channel_id', name='uq_youtube_accounts_channel_id'),
    )
    op.create_index(
        'idx_youtube_accounts_workspace_id',
        'youtube_accounts',
        ['workspace_id']
    )
    op.create_index(
        'idx_youtube_accounts_youtube_channel_id',
        'youtube_accounts',
        ['youtube_channel_id']
    )

    # 2. Add youtube_account_id to analytics_context_exports
    with op.batch_alter_table('analytics_context_exports') as batch_op:
        batch_op.add_column(
            sa.Column('youtube_account_id', sa.String(), nullable=True)
        )

    # 3. Add youtube_account_id to analytics_enriched_contexts
    with op.batch_alter_table('analytics_enriched_contexts') as batch_op:
        batch_op.add_column(
            sa.Column('youtube_account_id', sa.String(), nullable=True)
        )

    # 4. Add youtube_account_id to analytics_generated_drafts
    with op.batch_alter_table('analytics_generated_drafts') as batch_op:
        batch_op.add_column(
            sa.Column('youtube_account_id', sa.String(), nullable=True)
        )


def downgrade() -> None:
    # Remove youtube_account_id columns (non-destructive rollback)
    with op.batch_alter_table('analytics_generated_drafts') as batch_op:
        batch_op.drop_column('youtube_account_id')

    with op.batch_alter_table('analytics_enriched_contexts') as batch_op:
        batch_op.drop_column('youtube_account_id')

    with op.batch_alter_table('analytics_context_exports') as batch_op:
        batch_op.drop_column('youtube_account_id')

    # Drop youtube_accounts table
    op.drop_index('idx_youtube_accounts_youtube_channel_id', table_name='youtube_accounts')
    op.drop_index('idx_youtube_accounts_workspace_id', table_name='youtube_accounts')
    op.drop_table('youtube_accounts')
