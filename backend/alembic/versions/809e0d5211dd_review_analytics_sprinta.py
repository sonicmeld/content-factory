"""review_analytics_sprinta

Revision ID: 809e0d5211dd
Revises: cd52fabcd1eb
Create Date: 2026-06-13 22:33:12.655767

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '809e0d5211dd'
down_revision: Union[str, None] = 'cd52fabcd1eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add analytics_type to analytics_channels
    with op.batch_alter_table('analytics_channels') as batch_op:
        batch_op.add_column(sa.Column('analytics_type', sa.String(), server_default='observed', nullable=False))
        
    # Populate analytics_type based on is_own
    op.execute("UPDATE analytics_channels SET analytics_type = 'owned' WHERE is_own = 1")
    op.execute("UPDATE analytics_channels SET analytics_type = 'observed' WHERE is_own = 0")
    
    # 2. Rename workspace_id to channel_id in analytics_workspace_links
    with op.batch_alter_table('analytics_workspace_links') as batch_op:
        batch_op.alter_column('workspace_id', new_column_name='channel_id', existing_type=sa.String(), nullable=False)


def downgrade() -> None:
    # 1. Rename channel_id back to workspace_id in analytics_workspace_links
    with op.batch_alter_table('analytics_workspace_links') as batch_op:
        batch_op.alter_column('channel_id', new_column_name='workspace_id', existing_type=sa.String(), nullable=False)
        
    # 2. Drop analytics_type from analytics_channels
    with op.batch_alter_table('analytics_channels') as batch_op:
        batch_op.drop_column('analytics_type')
