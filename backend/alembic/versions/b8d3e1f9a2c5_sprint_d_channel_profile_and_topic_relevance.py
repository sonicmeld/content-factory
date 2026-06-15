"""sprint_d_channel_profile_and_topic_relevance

Revision ID: b8d3e1f9a2c5
Revises: 0c7bd3507b14
Create Date: 2026-06-15 08:15:00.000000

Non-breaking additive migration for Sprint D Market Intelligence refactor.
Adds:
  - analytics_channel_profiles  (Identity Projection Layer)
  - analytics_topic_relevance   (Topic Relevance Bridge Layer)

DOES NOT modify:
  - analytics_topics
  - analytics_keywords
  - analytics_market_trends
  - analytics_opportunity_exports
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8d3e1f9a2c5'
down_revision: Union[str, None] = '0c7bd3507b14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- analytics_channel_profiles ----
    op.create_table(
        'analytics_channel_profiles',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('youtube_account_id', sa.String(), nullable=False),
        sa.Column('channel_title', sa.String(), nullable=True),
        sa.Column('channel_description', sa.Text(), nullable=True),
        sa.Column('channel_keywords_raw', sa.Text(), nullable=True),
        sa.Column('seed_keywords_json', sa.Text(), nullable=True),
        sa.Column('video_titles_sample_json', sa.Text(), nullable=True),
        sa.Column('extracted_at', sa.DateTime(), nullable=True),
        sa.Column('version', sa.Integer(), server_default='1', nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('youtube_account_id', name='uq_channel_profiles_account_id'),
    )
    op.create_index(
        'idx_analytics_channel_profiles_account_id',
        'analytics_channel_profiles',
        ['youtube_account_id'],
        unique=True
    )

    # ---- analytics_topic_relevance ----
    op.create_table(
        'analytics_topic_relevance',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('topic_id', sa.String(), nullable=False),
        sa.Column('youtube_account_id', sa.String(), nullable=False),
        sa.Column('relevance_score', sa.Float(), server_default='0.0', nullable=True),
        sa.Column('seed_overlap_count', sa.Integer(), server_default='0', nullable=True),
        sa.Column('calculated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('topic_id', 'youtube_account_id', name='uq_topic_relevance'),
    )
    op.create_index(
        'idx_analytics_topic_relevance_account',
        'analytics_topic_relevance',
        ['youtube_account_id'],
        unique=False
    )
    op.create_index(
        'idx_analytics_topic_relevance_topic',
        'analytics_topic_relevance',
        ['topic_id'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('idx_analytics_topic_relevance_topic', table_name='analytics_topic_relevance')
    op.drop_index('idx_analytics_topic_relevance_account', table_name='analytics_topic_relevance')
    op.drop_table('analytics_topic_relevance')

    op.drop_index('idx_analytics_channel_profiles_account_id', table_name='analytics_channel_profiles')
    op.drop_table('analytics_channel_profiles')
