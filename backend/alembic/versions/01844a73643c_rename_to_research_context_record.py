"""rename_to_research_context_record

Revision ID: 01844a73643c
Revises: b8d3e1f9a2c5
Create Date: 2026-06-15 19:32:19.265664

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '01844a73643c'
down_revision: Union[str, None] = 'b8d3e1f9a2c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Rename table
    op.rename_table('analytics_enriched_contexts', 'research_context_records')

    # 2. Drop old indexes
    op.drop_index('idx_analytics_enriched_source', table_name='research_context_records')
    op.drop_index('idx_analytics_enriched_workspace', table_name='research_context_records')

    # 3. Alter columns using batch alter (SQLite safe)
    with op.batch_alter_table('research_context_records') as batch_op:
        # Drop columns
        batch_op.drop_column('topic_name')
        batch_op.drop_column('context_version')
        batch_op.drop_column('enrichment_version')
        batch_op.drop_column('generated_by')
        batch_op.drop_column('source_snapshot_json')
        batch_op.drop_column('payload_json')
        batch_op.drop_column('markdown_content')
        batch_op.drop_column('generated_at')

        # Add columns
        batch_op.add_column(sa.Column('topic', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('trend_score', sa.Float(), server_default='0.0', nullable=True))
        batch_op.add_column(sa.Column('keyword_count', sa.Integer(), server_default='0', nullable=True))
        batch_op.add_column(sa.Column('competitor_count', sa.Integer(), server_default='0', nullable=True))
        batch_op.add_column(sa.Column('signal_count', sa.Integer(), server_default='0', nullable=True))
        batch_op.add_column(sa.Column('keywords_json', sa.Text(), server_default='{}', nullable=False))
        batch_op.add_column(sa.Column('audience_json', sa.Text(), server_default='{}', nullable=False))
        batch_op.add_column(sa.Column('competitors_json', sa.Text(), server_default='{}', nullable=False))
        batch_op.add_column(sa.Column('opportunities_json', sa.Text(), server_default='[]', nullable=False))
        batch_op.add_column(sa.Column('signals_json', sa.Text(), server_default='{}', nullable=False))
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True))

    # 4. Create new indexes
    op.create_index(
        'idx_research_context_source',
        'research_context_records',
        ['source_type', 'source_reference_id'],
        unique=False
    )
    op.create_index(
        'idx_research_context_workspace',
        'research_context_records',
        ['workspace_id'],
        unique=False
    )


def downgrade() -> None:
    # 1. Drop new indexes
    op.drop_index('idx_research_context_source', table_name='research_context_records')
    op.drop_index('idx_research_context_workspace', table_name='research_context_records')

    # 2. Revert columns using batch alter
    with op.batch_alter_table('research_context_records') as batch_op:
        batch_op.drop_column('topic')
        batch_op.drop_column('trend_score')
        batch_op.drop_column('keyword_count')
        batch_op.drop_column('competitor_count')
        batch_op.drop_column('signal_count')
        batch_op.drop_column('keywords_json')
        batch_op.drop_column('audience_json')
        batch_op.drop_column('competitors_json')
        batch_op.drop_column('opportunities_json')
        batch_op.drop_column('signals_json')
        batch_op.drop_column('created_at')
        batch_op.drop_column('updated_at')

        batch_op.add_column(sa.Column('topic_name', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('context_version', sa.String(), server_default='2.0', nullable=False))
        batch_op.add_column(sa.Column('enrichment_version', sa.String(), server_default='1.0', nullable=False))
        batch_op.add_column(sa.Column('generated_by', sa.String(), server_default='heuristic', nullable=False))
        batch_op.add_column(sa.Column('source_snapshot_json', sa.Text(), server_default='{}', nullable=False))
        batch_op.add_column(sa.Column('payload_json', sa.Text(), server_default='{}', nullable=False))
        batch_op.add_column(sa.Column('markdown_content', sa.Text(), server_default='', nullable=False))
        batch_op.add_column(sa.Column('generated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True))

    # 3. Create old indexes
    op.create_index(
        'idx_analytics_enriched_source',
        'research_context_records',
        ['source_type', 'source_reference_id'],
        unique=False
    )
    op.create_index(
        'idx_analytics_enriched_workspace',
        'research_context_records',
        ['workspace_id'],
        unique=False
    )

    # 4. Rename table back
    op.rename_table('research_context_records', 'analytics_enriched_contexts')
