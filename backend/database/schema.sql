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
