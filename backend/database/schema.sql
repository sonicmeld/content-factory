CREATE TABLE IF NOT EXISTS gcp_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    project_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    gcp_profile_id TEXT,
    upload_frequency TEXT,
    thumbnail_style TEXT,
    metadata_style TEXT,
    youtube_channel_id TEXT,
    youtube_channel_title TEXT,
    youtube_handle TEXT,
    youtube_channel_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Sprint 7A: 9Router Combo Configuration
    metadata_combo TEXT DEFAULT '',
    thumbnail_combo TEXT DEFAULT '',
    footage_combo TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    channel_id TEXT,
    asset_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LEGACY: Prompt Factory table — superseded by Generation Studio (Sprint 7A). Do NOT use in new queries.
CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    title TEXT,
    prompt TEXT NOT NULL,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LEGACY: metadata_templates — superseded by package_generations (Sprint 7A). Do NOT use in new queries.
CREATE TABLE IF NOT EXISTS metadata_templates (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    title_template TEXT,
    description_template TEXT,
    tags_template TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS upload_jobs (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    package_id TEXT,
    video_path TEXT NOT NULL,
    title TEXT,
    description TEXT,
    thumbnail_path TEXT,
    status TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    scheduled_at DATETIME,
    published_at DATETIME,
    youtube_video_id TEXT,
    youtube_video_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduler_jobs (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    cron_expression TEXT,
    is_enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LEGACY: channel_profiles — orphaned, superseded by channels.metadata_combo/thumbnail_combo/footage_combo (Sprint 7A). Do NOT use in new queries.
CREATE TABLE IF NOT EXISTS channel_profiles (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    niche TEXT,
    mood TEXT,
    thumbnail_prompt TEXT,
    metadata_prompt TEXT,
    asset_prompt TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_packages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    package_number TEXT NOT NULL,
    video_path TEXT NOT NULL,
    timestamp_path TEXT,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS upload_queue (
    package_id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    queue_position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sprint 7A: Generation Studio — tracks 9Router generation results per Content Package
CREATE TABLE IF NOT EXISTS package_generations (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL,
    title TEXT,
    description TEXT,
    thumbnail_path TEXT,
    metadata_status TEXT NOT NULL DEFAULT 'pending',
    thumbnail_status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sprint 7A-3.1: Metadata Context Layer
CREATE TABLE IF NOT EXISTS prompt_contexts (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    topic TEXT,
    keywords TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Flow Connector & Asset Inbox Tables
CREATE TABLE IF NOT EXISTS external_accounts (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    account_name TEXT NOT NULL,
    profile_name TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS connector_jobs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    account_id TEXT,
    asset_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, opened, completed, failed, expired
    combo_id TEXT,
    prompt_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_inbox (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    source TEXT NOT NULL,
    source_id TEXT, -- e.g., connector_job_id or null
    asset_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, archived
    file_path TEXT NOT NULL,
    metadata TEXT, -- JSON string containing extensible metadata details
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prompt_expert_drafts (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    expert_type TEXT NOT NULL,
    combo_id TEXT NOT NULL,
    input_text TEXT NOT NULL,
    topic TEXT NOT NULL,
    keywords TEXT NOT NULL,
    notes TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_channels (
    id TEXT PRIMARY KEY,
    external_channel_id TEXT UNIQUE NOT NULL,
    channel_name TEXT NOT NULL,
    channel_handle TEXT,
    is_own INTEGER DEFAULT 1,
    analytics_type TEXT DEFAULT 'observed' NOT NULL,
    sync_status TEXT DEFAULT 'pending',
    last_error TEXT,
    is_archived INTEGER DEFAULT 0 NOT NULL,
    last_sync_duration_seconds INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_sync_at DATETIME
);

CREATE TABLE IF NOT EXISTS analytics_channel_identities (
    id TEXT PRIMARY KEY,
    analytics_channel_id TEXT NOT NULL,
    identity_reference_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_workspace_links (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    analytics_channel_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_videos (
    id TEXT PRIMARY KEY,
    external_video_id TEXT NOT NULL,
    analytics_channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    published_at DATETIME NOT NULL,
    duration_seconds INTEGER,
    thumbnail_url TEXT,
    category TEXT,
    views INTEGER DEFAULT 0 NOT NULL,
    likes INTEGER DEFAULT 0 NOT NULL,
    comments INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id TEXT PRIMARY KEY,
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    metric_source TEXT NOT NULL,
    snapshot_date DATETIME NOT NULL,
    views INTEGER DEFAULT 0,
    watch_time REAL DEFAULT 0.0,
    subscribers INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    ctr REAL DEFAULT 0.0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    retention_json TEXT
);

CREATE TABLE IF NOT EXISTS google_trends_snapshots (
    id TEXT PRIMARY KEY,
    query_term TEXT NOT NULL,
    geo TEXT NOT NULL,
    category TEXT,
    source TEXT NOT NULL,
    snapshot_date DATETIME NOT NULL,
    interest_value INTEGER DEFAULT 0,
    related_queries_json TEXT,
    related_topics_json TEXT
);

CREATE TABLE IF NOT EXISTS analytics_insights (
    id TEXT PRIMARY KEY,
    channel_id TEXT,
    insight_source TEXT NOT NULL,
    insight_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    entity_type TEXT,
    entity_id TEXT,
    engine_version TEXT NOT NULL DEFAULT '1.0',
    fingerprint TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    evidence_json TEXT,
    first_detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_fingerprint ON analytics_insights (fingerprint);

CREATE TABLE IF NOT EXISTS companion_runtimes (
    id TEXT PRIMARY KEY,
    runtime_name TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL UNIQUE,
    api_key_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'offline',
    is_revoked INTEGER NOT NULL DEFAULT 0,
    last_seen_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_sync_logs (
    id TEXT PRIMARY KEY,
    channel_name TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finished_at DATETIME,
    duration_seconds INTEGER,
    status TEXT NOT NULL
);

-- Market Intelligence & Opportunity Mapping Tables (Sprint D)
CREATE TABLE IF NOT EXISTS analytics_topics (
    id TEXT PRIMARY KEY,
    topic_name TEXT NOT NULL,
    topic_slug TEXT UNIQUE NOT NULL,
    fingerprint TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    trend_score REAL DEFAULT 0,
    demand_score REAL DEFAULT 0,
    competition_score REAL DEFAULT 0,
    forecast_score REAL DEFAULT 0,
    opportunity_score REAL DEFAULT 0,
    last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_keywords (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    trend_score REAL DEFAULT 0,
    search_volume REAL DEFAULT 0,
    competition_score REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(topic_id) REFERENCES analytics_topics(id)
);

CREATE TABLE IF NOT EXISTS analytics_market_trends (
    id TEXT PRIMARY KEY,
    keyword_id TEXT,
    topic_id TEXT,
    source TEXT NOT NULL,
    trend_score REAL DEFAULT 0,
    growth_rate REAL DEFAULT 0,
    region TEXT,
    collected_at DATETIME NOT NULL,
    FOREIGN KEY(keyword_id) REFERENCES analytics_keywords(id),
    FOREIGN KEY(topic_id) REFERENCES analytics_topics(id)
);

CREATE TABLE IF NOT EXISTS analytics_opportunity_exports (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL,
    market_score REAL,
    competition_score REAL,
    forecast_score REAL,
    opportunity_score REAL,
    exported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(topic_id) REFERENCES analytics_topics(id)
);

CREATE TABLE IF NOT EXISTS analytics_context_exports (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_reference_id TEXT NOT NULL,
    context_type TEXT NOT NULL,
    context_version TEXT NOT NULL DEFAULT '1.0',
    status TEXT NOT NULL DEFAULT 'new',
    workspace_id TEXT,
    exported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_context_records (
    id TEXT PRIMARY KEY,
    export_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_reference_id TEXT NOT NULL,
    workspace_id TEXT,
    channel_id TEXT,
    youtube_account_id TEXT,
    topic TEXT,
    trend_score REAL DEFAULT 0.0,
    keyword_count INTEGER DEFAULT 0,
    competitor_count INTEGER DEFAULT 0,
    signal_count INTEGER DEFAULT 0,
    keywords_json TEXT NOT NULL DEFAULT '{}',
    audience_json TEXT NOT NULL DEFAULT '{}',
    competitors_json TEXT NOT NULL DEFAULT '{}',
    opportunities_json TEXT NOT NULL DEFAULT '[]',
    signals_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(export_id) REFERENCES analytics_context_exports(id)
);

CREATE INDEX IF NOT EXISTS idx_research_context_source ON research_context_records (source_type, source_reference_id);
CREATE INDEX IF NOT EXISTS idx_research_context_workspace ON research_context_records (workspace_id);

CREATE TABLE IF NOT EXISTS analytics_generated_drafts (
    id TEXT PRIMARY KEY,
    source_export_id TEXT NOT NULL,
    source_enriched_context_id TEXT NOT NULL,
    workspace_id TEXT,
    channel_id TEXT,
    title TEXT,
    draft_type TEXT NOT NULL DEFAULT 'youtube_longform',
    content_markdown TEXT NOT NULL,
    context_version TEXT NOT NULL DEFAULT '2.0',
    draft_version TEXT NOT NULL DEFAULT '1.0',
    generated_by TEXT NOT NULL DEFAULT '9router',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(source_enriched_context_id) REFERENCES research_context_records(id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_generated_drafts_enriched ON analytics_generated_drafts (source_enriched_context_id);
CREATE INDEX IF NOT EXISTS idx_analytics_generated_drafts_workspace ON analytics_generated_drafts (workspace_id);

-- YouTube Identity Layer (SSOT) — Single Source of Truth untuk identitas akun YouTube.
-- Multi-GCP: setiap account dapat menggunakan GCP profile berbeda.
-- oauth_tokens tetap tabel terpisah, di-link via channel_id dari Channel Domain.
CREATE TABLE IF NOT EXISTS youtube_accounts (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    gcp_profile_id TEXT,                -- FK ke gcp_profiles (nullable, multi-GCP support)
    channel_binding_id TEXT,            -- FK ke channels (nullable — bisa exist tanpa channel binding)
    google_account_email TEXT,
    youtube_channel_id TEXT UNIQUE NOT NULL,
    youtube_channel_title TEXT NOT NULL,
    youtube_handle TEXT,
    youtube_channel_url TEXT,
    analytics_enabled INTEGER NOT NULL DEFAULT 1,   -- 1 = enabled, 0 = disabled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_youtube_accounts_workspace_id ON youtube_accounts (workspace_id);
CREATE INDEX IF NOT EXISTS idx_youtube_accounts_youtube_channel_id ON youtube_accounts (youtube_channel_id);

-- Note: Column youtube_account_id di analytics_context_exports, research_context_records,
-- dan analytics_generated_drafts ditambahkan melalui Alembic migration:
-- a1b2c3d4e5f6_youtube_identity_layer_consolidation.py
-- Schema.sql hanya berisi CREATE TABLE (idempotent), bukan ALTER TABLE.
