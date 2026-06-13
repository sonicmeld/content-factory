"""sprint_b_video_metrics

Revision ID: 7496e589c0c0
Revises: 809e0d5211dd
Create Date: 2026-06-13 23:02:37.539322

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7496e589c0c0'
down_revision: Union[str, None] = '809e0d5211dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('analytics_videos') as batch_op:
        batch_op.add_column(sa.Column('views', sa.Integer(), server_default='0', nullable=False))
        batch_op.add_column(sa.Column('likes', sa.Integer(), server_default='0', nullable=False))
        batch_op.add_column(sa.Column('comments', sa.Integer(), server_default='0', nullable=False))
        
    op.execute("""
    UPDATE analytics_videos
    SET
      views = COALESCE((SELECT views FROM analytics_snapshots WHERE target_id = analytics_videos.id AND target_type = 'video' ORDER BY snapshot_date DESC LIMIT 1), 0),
      likes = COALESCE((SELECT likes FROM analytics_snapshots WHERE target_id = analytics_videos.id AND target_type = 'video' ORDER BY snapshot_date DESC LIMIT 1), 0),
      comments = COALESCE((SELECT comments FROM analytics_snapshots WHERE target_id = analytics_videos.id AND target_type = 'video' ORDER BY snapshot_date DESC LIMIT 1), 0);
    """)


def downgrade() -> None:
    with op.batch_alter_table('analytics_videos') as batch_op:
        batch_op.drop_column('views')
        batch_op.drop_column('likes')
        batch_op.drop_column('comments')
