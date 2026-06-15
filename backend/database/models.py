from sqlalchemy import Column, String, Integer, DateTime, Text, Index, Boolean, UniqueConstraint, JSON, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class GCPProfile(Base):
    __tablename__ = "gcp_profiles"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    client_id = Column(String, nullable=False)
    client_secret = Column(String, nullable=False)
    project_id = Column(String)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())

class Channel(Base):
    __tablename__ = "channels"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    description = Column(String)
    gcp_profile_id = Column(String)
    upload_frequency = Column(String)
    thumbnail_style = Column(String)
    metadata_style = Column(String)
    youtube_channel_id = Column(String)
    youtube_channel_title = Column(String)
    youtube_handle = Column(String)
    youtube_channel_url = Column(String)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())
    # Sprint 7A: 9Router Combo Configuration
    metadata_combo = Column(String, nullable=True, default="")
    thumbnail_combo = Column(String, nullable=True, default="")
    footage_combo = Column(String, nullable=True, default="")

class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=True) # Nullable for Identity Layer
    youtube_account_id = Column(String, nullable=True) # Identity Layer association
    access_token = Column(String)
    refresh_token = Column(String)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())

class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=True)
    asset_type = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())

# LEGACY: Prompt Factory model — superseded by Generation Studio (Sprint 7A). Do NOT use in new code.
class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
    title = Column(String)
    prompt = Column(String, nullable=False)
    category = Column(String)
    created_at = Column(DateTime, default=func.now())

# LEGACY: MetadataTemplate model — superseded by PackageGeneration (Sprint 7A). Do NOT use in new code.
class MetadataTemplate(Base):
    __tablename__ = "metadata_templates"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
    title_template = Column(String)
    description_template = Column(String)
    tags_template = Column(String)
    created_at = Column(DateTime, default=func.now())

class UploadJob(Base):
    __tablename__ = "upload_jobs"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
    package_id = Column(String)
    video_path = Column(String, nullable=False)
    title = Column(String)
    description = Column(String)
    thumbnail_path = Column(String)
    status = Column(String, nullable=False)
    retry_count = Column(Integer, default=0)
    error_message = Column(String)
    scheduled_at = Column(DateTime)
    published_at = Column(DateTime)
    youtube_video_id = Column(String)
    youtube_video_url = Column(String)
    created_at = Column(DateTime, default=func.now())

class SchedulerJob(Base):
    __tablename__ = "scheduler_jobs"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
    cron_expression = Column(String)
    is_enabled = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())

# LEGACY: ChannelProfile model — orphaned, superseded by Channel.metadata_combo/thumbnail_combo/footage_combo (Sprint 7A). Do NOT use in new code.
class ChannelProfile(Base):
    __tablename__ = "channel_profiles"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
    niche = Column(String)
    mood = Column(String)
    thumbnail_prompt = Column(String)
    metadata_prompt = Column(String)
    asset_prompt = Column(String)
    created_at = Column(DateTime, default=func.now())

class ContentPackage(Base):
    __tablename__ = "content_packages"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
    package_number = Column(String, nullable=False)
    video_path = Column(String, nullable=False)
    timestamp_path = Column(String)
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class UploadQueue(Base):
    __tablename__ = "upload_queue"

    package_id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
    queue_position = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=func.now())


# Sprint 7A: Generation Studio — tracks 9Router generation results per Content Package
class PackageGeneration(Base):
    __tablename__ = "package_generations"

    id = Column(String, primary_key=True)
    package_id = Column(String, nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    thumbnail_path = Column(String, nullable=True)
    # Status values: pending | processing | completed | failed
    metadata_status = Column(String, nullable=False, default="pending")
    thumbnail_status = Column(String, nullable=False, default="pending")
    error_message = Column(Text, nullable=True)
    
    # Sprint 7A-4.7: Audit Tracking
    metadata_combo_used = Column(String, nullable=True)
    thumbnail_combo_used = Column(String, nullable=True)
    prompt_context_used = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# Sprint 7A-3.1 / Sprint 7B-2: Prompt Context / Global Prompt Library
class PromptContext(Base):
    __tablename__ = "prompt_contexts"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False) # Legacy Compatibility Field
    prompt_type = Column(String, nullable=False, default="metadata") # metadata, thumbnail, footage
    title = Column(String, nullable=False)
    topic = Column(String, nullable=True)
    keywords = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# Sprint 7B-2: Channel Prompt Assignments
class ChannelPromptAssignment(Base):
    __tablename__ = "channel_prompt_assignments"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
    prompt_id = Column(String, nullable=False)
    assignment_order = Column(Integer, nullable=False, default=1)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_channel_prompt_assignments_channel_id", "channel_id"),
        UniqueConstraint("channel_id", "prompt_id", name="uq_channel_prompt"),
    )

# Sprint 7A-4.5: Global Combo Registry
class GenerationCombo(Base):
    __tablename__ = "generation_combos"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    category = Column(String, nullable=False) # metadata, thumbnail, footage
    endpoint_type = Column(String, nullable=False) # chat, image
    description = Column(Text, nullable=True)
    config_json = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# Sprint 7A-5: Metadata Variant Library
class MetadataVariant(Base):
    __tablename__ = "metadata_variants"

    id = Column(String, primary_key=True)
    package_generation_id = Column(String, nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    source_combo = Column(String, nullable=True)
    source_context = Column(String, nullable=True)
    is_selected = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())

    __table_args__ = (
        Index("idx_metadata_variants_package_generation", "package_generation_id"),
    )

# Sprint 7A-6: Asset Engine Foundation
class GenerationAsset(Base):
    __tablename__ = "generation_assets"

    id = Column(String, primary_key=True)
    package_generation_id = Column(String, nullable=False)
    asset_type = Column(String, nullable=False) # e.g., thumbnail, footage, image, video
    file_path = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="pending")
    source_combo = Column(String, nullable=True)
    source_context = Column(String, nullable=True)
    is_selected = Column(Integer, default=0) # Sprint 7A-7
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_generation_assets_package_generation", "package_generation_id"),
        Index("idx_generation_assets_asset_type", "asset_type"),
    )

# Sprint 7B-1: Global Metadata Library
class MetadataLibrary(Base):
    __tablename__ = "metadata_library"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=True)
    tags = Column(String, nullable=True)
    source_variant_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# Sprint 7C-1: Runtime Audit Layer
class RuntimeAudit(Base):
    __tablename__ = "runtime_audits"

    id = Column(String, primary_key=True)
    execution_id = Column(String, unique=True, index=True, nullable=False)
    package_id = Column(String, index=True, nullable=False)
    execution_type = Column(String, nullable=False)
    
    selected_prompt_id = Column(String, nullable=True)
    selected_prompt_title = Column(String, nullable=True)
    
    assigned_prompt_ids = Column(JSON, nullable=True)
    assigned_prompt_titles = Column(JSON, nullable=True)
    
    prompt_preview = Column(String(1000), nullable=True)
    combo_used = Column(String, nullable=True)
    
    status = Column(String, nullable=False) # pending | success | failed
    error_message = Column(Text, nullable=True)
    
    executed_at = Column(DateTime, default=func.now())


class ExternalAccount(Base):
    __tablename__ = "external_accounts"

    id = Column(String, primary_key=True)
    workspace_id = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    account_name = Column(String, nullable=False)
    profile_name = Column(String, nullable=True)
    is_active = Column(Integer, default=1)


class ConnectorJob(Base):
    __tablename__ = "connector_jobs"

    id = Column(String, primary_key=True)
    workspace_id = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    account_id = Column(String, nullable=True)
    asset_type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    combo_id = Column(String, nullable=True)
    prompt_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())


class AssetInbox(Base):
    __tablename__ = "asset_inbox"

    id = Column(String, primary_key=True)
    workspace_id = Column(String, nullable=False)
    source = Column(String, nullable=False)
    source_id = Column(String, nullable=True)
    asset_type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending") # pending, approved, rejected, archived
    file_path = Column(String, nullable=False)
    inbox_metadata = Column("metadata", Text, nullable=True)
    created_at = Column(DateTime, default=func.now())


class PromptExpertDraft(Base):
    __tablename__ = "prompt_expert_drafts"

    id = Column(String, primary_key=True)
    workspace_id = Column(String, nullable=False)
    expert_type = Column(String, nullable=False)
    combo_id = Column(String, nullable=False)
    input_text = Column(String, nullable=False)
    topic = Column(Text, nullable=False)
    keywords = Column(Text, nullable=False)
    notes = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="draft") # draft, approved, discarded
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())



class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)


class GenerationModel(Base):
    __tablename__ = "generation_models"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())


# YouTube Identity Layer — Single Source of Truth untuk identitas akun YouTube.
# Setiap YoutubeAccount merepresentasikan satu YouTube Channel yang telah melalui OAuth.
# Multi-GCP: setiap account dapat menggunakan GCP profile berbeda.
# oauth_tokens tetap tabel terpisah, di-link via channel_id dari Channel Domain.
class YoutubeAccount(Base):
    __tablename__ = "youtube_accounts"

    id = Column(String, primary_key=True)
    workspace_id = Column(String, nullable=False, index=True)

    # GCP Project yang digunakan untuk OAuth channel ini (multi-GCP support)
    gcp_profile_id = Column(String, nullable=True)

    # Relasi ke Channel Domain (nullable — account bisa exist tanpa channel binding)
    channel_binding_id = Column(String, nullable=True)

    # Identitas YouTube (diisi dari YouTube Data API saat OAuth callback)
    google_account_email = Column(String, nullable=True)
    youtube_channel_id = Column(String, unique=True, nullable=False)
    youtube_channel_title = Column(String, nullable=False)
    youtube_handle = Column(String, nullable=True)
    youtube_channel_url = Column(String, nullable=True)

    # Binding control per domain
    analytics_enabled = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_youtube_accounts_workspace_id", "workspace_id"),
        Index("idx_youtube_accounts_youtube_channel_id", "youtube_channel_id"),
    )


class AnalyticsChannel(Base):
    __tablename__ = "analytics_channels"

    id = Column(String, primary_key=True)
    external_channel_id = Column(String, unique=True, nullable=False)
    channel_name = Column(String, nullable=False)
    channel_handle = Column(String, nullable=True)
    is_own = Column(Boolean, default=True)
    analytics_type = Column(String, default="observed", nullable=False)
    sync_status = Column(String, default="pending")
    last_error = Column(String, nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False)
    last_sync_duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=func.now())
    last_sync_at = Column(DateTime, nullable=True)


class AnalyticsChannelIdentity(Base):
    __tablename__ = "analytics_channel_identities"

    id = Column(String, primary_key=True)
    analytics_channel_id = Column(String, nullable=False)
    identity_reference_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())


class AnalyticsWorkspaceLink(Base):
    __tablename__ = "analytics_workspace_links"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
    analytics_channel_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())


class AnalyticsVideo(Base):
    __tablename__ = "analytics_videos"

    id = Column(String, primary_key=True)
    external_video_id = Column(String, nullable=False)
    analytics_channel_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    published_at = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    category = Column(String, nullable=True)
    views = Column(Integer, default=0, nullable=False)
    likes = Column(Integer, default=0, nullable=False)
    comments = Column(Integer, default=0, nullable=False)


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id = Column(String, primary_key=True)
    target_id = Column(String, nullable=False)
    target_type = Column(String, nullable=False)  # 'channel' or 'video'
    metric_source = Column(String, nullable=False)  # 'youtube_analytics' or 'youtube_data_api'
    snapshot_date = Column(DateTime, nullable=False)
    views = Column(Integer, default=0)
    watch_time = Column(Float, default=0.0)
    subscribers = Column(Integer, default=0)
    impressions = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    retention_json = Column(Text, nullable=True)


class GoogleTrendsSnapshot(Base):
    __tablename__ = "google_trends_snapshots"

    id = Column(String, primary_key=True)
    query_term = Column(String, nullable=False)
    geo = Column(String, nullable=False)
    category = Column(String, nullable=True)
    source = Column(String, nullable=False)  # 'google_trends' or 'youtube_search'
    snapshot_date = Column(DateTime, nullable=False)
    interest_value = Column(Integer, default=0)
    related_queries_json = Column(Text, nullable=True)
    related_topics_json = Column(Text, nullable=True)


class AnalyticsInsight(Base):
    __tablename__ = "analytics_insights"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=True)
    insight_source = Column(String, nullable=False, default="channel_engine")  # e.g., 'growth_engine', 'thumbnail_engine', etc.
    insight_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # 'Critical' | 'High' | 'Medium' | 'Low'
    status = Column(String, nullable=False, default="active")  # 'active' | 'resolved' | 'dismissed' | 'archived'
    entity_type = Column(String, nullable=True)  # 'channel' | 'video' | 'market'
    entity_id = Column(String, nullable=True)
    engine_version = Column(String, nullable=False, default="1.0")
    fingerprint = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    score = Column(Integer, default=0, nullable=False)
    evidence_json = Column(Text, nullable=True)
    first_detected_at = Column(DateTime, default=func.now())
    last_detected_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())



class CompanionRuntime(Base):
    __tablename__ = "companion_runtimes"

    id = Column(String, primary_key=True)
    runtime_name = Column(String, unique=True, nullable=False)
    client_id = Column(String, unique=True, nullable=False)
    api_key_hash = Column(String, nullable=False)
    status = Column(String, nullable=False, default="offline")
    is_revoked = Column(Integer, default=0, nullable=False)   # 1 = revoked, 0 = active
    last_seen_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)


class AnalyticsSyncLog(Base):
    __tablename__ = "analytics_sync_logs"

    id = Column(String, primary_key=True)
    channel_name = Column(String, nullable=False)
    started_at = Column(DateTime, default=func.now(), nullable=False)
    finished_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    status = Column(String, nullable=False)  # 'PENDING', 'SYNCING', 'SUCCESS', 'FAILED'


class AnalyticsTopic(Base):
    __tablename__ = "analytics_topics"

    id = Column(String, primary_key=True)
    topic_name = Column(String, nullable=False)
    topic_slug = Column(String, unique=True, nullable=False)
    fingerprint = Column(String, unique=True, nullable=False)
    status = Column(String, default="active")  # active, emerging, declining, archived
    trend_score = Column(Float, default=0.0)
    demand_score = Column(Float, default=0.0)
    competition_score = Column(Float, default=0.0)
    forecast_score = Column(Float, default=0.0)
    opportunity_score = Column(Float, default=0.0)
    last_calculated_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class AnalyticsKeyword(Base):
    __tablename__ = "analytics_keywords"

    id = Column(String, primary_key=True)
    topic_id = Column(String, nullable=False)
    keyword = Column(String, nullable=False)
    trend_score = Column(Float, default=0.0)
    search_volume = Column(Float, default=0.0)
    competition_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=func.now())


class AnalyticsMarketTrend(Base):
    __tablename__ = "analytics_market_trends"

    id = Column(String, primary_key=True)
    keyword_id = Column(String, nullable=True)
    topic_id = Column(String, nullable=True)
    source = Column(String, nullable=False)  # e.g. 'google_trends', 'youtube_suggest'
    trend_score = Column(Float, default=0.0)
    growth_rate = Column(Float, default=0.0)
    region = Column(String, nullable=True)
    collected_at = Column(DateTime, nullable=False)


class AnalyticsOpportunityExport(Base):
    __tablename__ = "analytics_opportunity_exports"

    id = Column(String, primary_key=True)
    topic_id = Column(String, nullable=False)
    market_score = Column(Float)
    competition_score = Column(Float)
    forecast_score = Column(Float)
    opportunity_score = Column(Float)
    exported_at = Column(DateTime, default=func.now())


class AnalyticsContextExport(Base):
    __tablename__ = "analytics_context_exports"

    id = Column(String, primary_key=True)
    source_type = Column(String, nullable=False)          # 'topic', 'opportunity', 'insight'
    source_reference_id = Column(String, nullable=False)   # ID referensi asal
    context_type = Column(String, nullable=False)          # 'topic', 'opportunity', 'insight', 'aggregated'
    context_version = Column(String, nullable=False, default="1.0")
    status = Column(String, nullable=False, default="new")  # 'new', 'loaded', 'archived'
    workspace_id = Column(String, nullable=True)           # channel/workspace ID
    youtube_account_id = Column(String, nullable=True)     # FK ke youtube_accounts (SSOT identity)
    exported_at = Column(DateTime, default=func.now())

    @property
    def payload(self):
        # Fallback helper, dynamic creation is preferred but can be useful
        return {}


class AnalyticsEnrichedContext(Base):
    __tablename__ = "analytics_enriched_contexts"

    id = Column(String, primary_key=True)
    export_id = Column(String, nullable=False)
    source_type = Column(String, nullable=False)
    source_reference_id = Column(String, nullable=False)
    workspace_id = Column(String, nullable=True)
    channel_id = Column(String, nullable=True)
    youtube_account_id = Column(String, nullable=True)     # FK ke youtube_accounts (SSOT identity)
    topic_name = Column(String, nullable=True)
    context_version = Column(String, nullable=False, default="2.0")
    enrichment_version = Column(String, nullable=False, default="1.0")
    status = Column(String, nullable=False, default="draft") # draft | ready | archived | failed
    generated_by = Column(String, nullable=False, default="heuristic") # heuristic | 9router | openai | claude | gemini
    source_snapshot_json = Column(Text, nullable=False)
    payload_json = Column(Text, nullable=False)
    markdown_content = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=func.now())


class AnalyticsGeneratedDraft(Base):
    __tablename__ = "analytics_generated_drafts"

    id = Column(String, primary_key=True)
    source_export_id = Column(String, nullable=False)
    source_enriched_context_id = Column(String, nullable=False)
    workspace_id = Column(String, nullable=True)
    channel_id = Column(String, nullable=True)
    youtube_account_id = Column(String, nullable=True)     # FK ke youtube_accounts (SSOT identity)
    title = Column(String, nullable=True)
    draft_type = Column(String, nullable=False, default="youtube_longform")
    content_markdown = Column(Text, nullable=False)
    context_version = Column(String, nullable=False, default="2.0")
    draft_version = Column(String, nullable=False, default="1.0")
    generated_by = Column(String, nullable=False, default="9router")
    status = Column(String, nullable=False, default="draft") # draft | reviewed | approved | loaded_to_prompt | archived | deleted
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class AnalyticsChannelProfile(Base):
    """
    Analytics Projection Layer — bukan sumber data utama.
    Data berasal dari YouTube Identity Layer (YoutubeAccount).
    Menyimpan 'sidik jari niche' channel untuk digunakan sebagai seed
    Market Intelligence dan relevance scoring.
    """
    __tablename__ = "analytics_channel_profiles"

    id = Column(String, primary_key=True)
    youtube_account_id = Column(String, nullable=False, unique=True)  # FK ke youtube_accounts
    channel_title = Column(String, nullable=True)
    channel_description = Column(Text, nullable=True)
    channel_keywords_raw = Column(Text, nullable=True)         # raw string dari YouTube API brandingSettings
    seed_keywords_json = Column(Text, nullable=True)           # JSON array: ["ai automation", "n8n", ...]
    video_titles_sample_json = Column(Text, nullable=True)     # JSON array: sample 30 video titles
    extracted_at = Column(DateTime, nullable=True)
    version = Column(Integer, default=1)

    __table_args__ = (
        Index("idx_analytics_channel_profiles_account_id", "youtube_account_id"),
    )


class AnalyticsTopicRelevance(Base):
    """
    Bridge table antara AnalyticsTopic (global) dan YoutubeAccount.
    Menyimpan relevance_score per (topic x account) tanpa menduplikasi
    data topic itu sendiri.
    """
    __tablename__ = "analytics_topic_relevance"

    id = Column(String, primary_key=True)
    topic_id = Column(String, nullable=False)               # FK ke analytics_topics
    youtube_account_id = Column(String, nullable=False)     # FK ke youtube_accounts
    relevance_score = Column(Float, default=0.0)            # 0.0 - 1.0
    seed_overlap_count = Column(Integer, default=0)         # jumlah seed keyword yang overlap
    calculated_at = Column(DateTime, default=func.now())

    __table_args__ = (
        UniqueConstraint("topic_id", "youtube_account_id", name="uq_topic_relevance"),
        Index("idx_analytics_topic_relevance_account", "youtube_account_id"),
        Index("idx_analytics_topic_relevance_topic", "topic_id"),
    )

