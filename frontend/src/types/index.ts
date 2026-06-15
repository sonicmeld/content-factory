export interface Channel {
    id: string;
    name: string;
    slug: string;
    description?: string;
    gcp_profile_id?: string;
    upload_frequency?: string;
    thumbnail_style?: string;
    metadata_style?: string;
    oauth_status?: string;
    youtube_channel_id?: string;
    youtube_channel_title?: string;
    youtube_handle?: string;
    youtube_channel_url?: string;
    is_active: number;
    created_at: string;
    // Sprint 7A: 9Router Combo Configuration
    metadata_combo?: string;
    thumbnail_combo?: string;
    footage_combo?: string;
    youtube_account_id?: string;
}

export interface GCPProfile {
    id: string;
    name: string;
    client_id: string;
    client_secret: string;
    project_id?: string;
    is_active: number;
    created_at: string;
}

export interface UploadJob {
    id: string;
    channel_id: string;
    video_path: string;
    title?: string;
    description?: string;
    thumbnail_path?: string;
    status: string;
    retry_count: number;
    error_message?: string;
    progress?: number;
    scheduled_at?: string;
    published_at?: string;
    created_at: string;
}

export interface Asset {
    id: string;
    channel_id?: string;
    asset_type: string;
    filename: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    created_at: string;
}

export interface Prompt {
    id: string;
    channel_id: string;
    title?: string;
    prompt: string;
    category?: string;
    created_at: string;
}

export interface MetadataTemplate {
    id: string;
    channel_id: string;
    title_template?: string;
    description_template?: string;
    tags_template?: string;
    created_at: string;
}

export interface ContentPackage {
    id: string;
    channel_id: string;
    package_number: string;
    video_path: string;
    timestamp_path?: string;
    status: 'draft' | 'ready' | 'queued' | 'published' | 'failed';
    created_at: string;
    updated_at: string;
}

export interface ChannelStorageStats {
    package_count: number;
    video_count: number;
    storage_bytes: number;
}

export interface QueueItem {
    package_id: string;
    channel_id: string;
    queue_position: number;
    created_at: string;
    package_number: string;
    status: string;
    video_path: string;
}

// Sprint 7A: Generation Studio
export interface PackageGeneration {
    id: string;
    package_id: string;
    title?: string;
    description?: string;
    thumbnail_path?: string;
    metadata_status: 'pending' | 'processing' | 'completed' | 'failed';
    thumbnail_status: 'pending' | 'processing' | 'completed' | 'failed';
    error_message?: string;
    is_ready: boolean;
    metadata_combo_used?: string;
    thumbnail_combo_used?: string;
    prompt_context_used?: string;
    created_at: string;
    updated_at: string;
}

export interface GenerationReadiness {
    metadata_ready: boolean;
    thumbnail_ready: boolean;
    footage_ready: boolean;
    active_prompt_contexts: number;
    active_combos: number;
}

export interface PromptContext {
    id: string;
    channel_id: string;
    prompt_type: string;
    title: string;
    topic?: string;
    keywords?: string;
    notes?: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ChannelPromptAssignment {
    id: string;
    channel_id: string;
    prompt_id: string;
    assignment_order: number;
    is_active: number;
    created_at: string;
    updated_at: string;
}

export interface GenerationCombo {
    id: string;
    name: string;
    category: string;
    endpoint_type: string;
    description?: string;
    config_json?: string;
    is_active: number;
    created_at: string;
    updated_at: string;
}

// Sprint 7A-5: Metadata Variant Library
export interface MetadataVariant {
    id: string;
    package_generation_id: string;
    title?: string;
    description?: string;
    source_combo?: string;
    source_context?: string;
    is_selected: number;
    created_at: string;
}

// Sprint 7A-6: Asset Engine Foundation
export interface GenerationAsset {
    id: string;
    package_generation_id: string;
    asset_type: string;
    file_path: string;
    filename: string;
    mime_type: string;
    file_size: number;
    status: string;
    source_combo?: string;
    source_context?: string;
    is_selected: number;
    created_at: string;
}

// Sprint 7B-1: Global Metadata Library
export interface MetadataLibraryItem {
    id: string;
    title: string;
    description: string;
    category?: string;
    tags?: string;
    source_variant_id?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Sprint 7C-1: Runtime Audit Layer
export interface RuntimeAudit {
    id: string;
    execution_id: string;
    package_id: string;
    execution_type: string;
    selected_prompt_id?: string;
    selected_prompt_title?: string;
    assigned_prompt_ids?: string;
    assigned_prompt_titles?: string;
    combo_used?: string;
    status: string;
    error_message?: string;
    executed_at: string;
    channel_name?: string;
    channel_slug?: string;
    package_number?: string;
}

export interface ExecutionTask {
    package_generation_id: string;
    package_id: string;
    channel_name: string;
    channel_slug: string;
    package_number: string;
    execution_type: string;
    status: string;
    source_type: string;
}

export interface WorkboxPackage {
    package_generation_id: string;
    package_id: string;
    channel_id: string;
    channel_name: string;
    channel_slug: string;
    package_number: string;
    package_status: string;
    assembly_readiness: 'READY' | 'PARTIAL' | 'BLOCKED';
    production_gaps: string[];
    asset_statuses: Record<string, string>;
    production_sources: Record<string, string>;
}

// Flow Connector & Asset Inbox Types
export interface ExternalAccount {
    id: string;
    workspace_id: string;
    provider: string;
    account_name: string;
    profile_name?: string;
    is_active: number;
}

export interface ConnectorJob {
    id: string;
    workspace_id: string;
    provider: string;
    account_id?: string;
    asset_type: string;
    status: 'pending' | 'opened' | 'completed' | 'failed' | 'expired';
    combo_id?: string;
    prompt_id?: string;
    prompt?: string;
    channel_id?: string;
    project_id?: string;
    created_at: string;
}

export interface AssetInbox {
    id: string;
    workspace_id: string;
    source: string;
    source_id?: string;
    asset_type: string;
    status: 'pending' | 'approved' | 'rejected' | 'archived';
    file_path: string;
    metadata?: string;
    created_at: string;
}

export interface CompanionRuntime {
    id: string;
    runtime_name: string;
    client_id: string;
    status: 'online' | 'offline' | 'revoked';
    is_revoked: number;
    last_seen_at?: string;
    created_at: string;
}

export type AnalyticsSyncStatus = 'PENDING' | 'SYNCING' | 'SUCCESS' | 'FAILED' | 'DISABLED';

export interface AnalyticsChannel {
    id: string;
    external_channel_id: string;
    channel_name: string;
    channel_handle?: string;
    is_own: boolean;
    analytics_type: 'owned' | 'competitor' | 'observed';
    sync_status: AnalyticsSyncStatus | string;
    last_error?: string;
    is_archived: boolean;
    last_sync_duration_seconds?: number;
    created_at: string;
    last_sync_at?: string;
    subscribers?: number;
}

export interface AnalyticsOverview {
    channel_id: string;
    views: number;
    watch_time: number;
    subscribers: number;
    impressions: number;
    ctr: number;
    likes: number;
    comments: number;
    last_sync_at?: string;
}

export interface SyncActivityLog {
    id: string;
    channel_name: string;
    started_at: string;
    finished_at?: string;
    duration_seconds?: number;
    status: AnalyticsSyncStatus | string;
}

export interface AnalyticsChannelIdentity {
    id: string;
    analytics_channel_id: string;
    identity_reference_id: string;
    created_at: string;
}

export interface AnalyticsWorkspaceLink {
    id: string;
    channel_id: string;
    analytics_channel_id: string;
    created_at: string;
}

export interface AnalyticsVideo {
    id: string;
    external_video_id: string;
    analytics_channel_id: string;
    title: string;
    published_at: string;
    duration_seconds?: number;
    thumbnail_url?: string;
    category?: string;
    views: number;
    likes: number;
    comments: number;
}

export interface ExplorerSummaryResponse {
    channel: AnalyticsChannel;
    overview: AnalyticsOverview;
    publishing_pattern: {
        upload_frequency: string;
        average_interval_days: number;
        interval_stddev: number;
        most_active_day: string;
        most_active_hour: number;
        consistency_score: number;
        posting_habit: string;
    };
    diagnostics: {
        sync_status: string;
        last_error?: string;
        last_sync_duration_seconds?: number;
        last_sync_at?: string;
        collector_health_score: number;
        last_successful_sync_at?: string;
        last_failed_sync_at?: string;
    };
    insights?: {
        active_count: number;
    };
    meta: {
        collector_version: string;
        generated_at: string;
    };
}

export interface TimelineDataPoint {
    date: string;
    views: number;
    subscribers: number;
    watch_time: number;
    impressions: number;
    ctr: number;
}

export interface TimelineResponse {
    timeline: TimelineDataPoint[];
    subscriber_delta: number;
    subscriber_growth_rate: number;
    view_delta: number;
    view_growth_rate: number;
}

export interface ComparisonChannelMeta {
    id: string;
    channel_name: string;
    channel_handle?: string;
    analytics_type: 'owned' | 'competitor' | 'observed';
    subscribers: number;
    views: number;
    video_count: number;
    active_insights_count: number;
}

export interface ComparisonResponse {
    subscribers_timeline: any[];
    views_timeline: any[];
    channels: ComparisonChannelMeta[];
}

export interface AnalyticsInsight {
    id: string;
    channel_id?: string;
    insight_source: string;
    insight_type: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    status: 'active' | 'resolved' | 'dismissed' | 'archived';
    entity_type?: 'channel' | 'video' | 'market';
    entity_id?: string;
    engine_version: string;
    fingerprint: string;
    title: string;
    description: string;
    score: number;
    evidence_json?: string;
    first_detected_at: string;
    last_detected_at: string;
    created_at: string;
}

export interface InsightRefreshResponse {
    generated: number;
    removed: number;
    duration_ms: number;
}

// Sprint D: Market Intelligence types
export interface MarketTopic {
    id: string;
    topic_name: string;
    topic_slug: string;
    fingerprint: string;
    status: 'active' | 'emerging' | 'declining' | 'archived';
    trend_score: number;
    demand_score: number;
    competition_score: number;
    forecast_score: number;
    opportunity_score: number;
    last_calculated_at: string;
    created_at: string;
    updated_at: string;
    // Channel-aware relevance (present when account_id filter is active)
    relevance_score?: number;
    relevance_label?: 'High' | 'Medium' | 'Low' | 'None';
}

export interface MarketKeyword {
    id: string;
    topic_id: string;
    keyword: string;
    trend_score: number;
    search_volume: number;
    competition_score: number;
    created_at: string;
}

export interface MarketTrend {
    id: string;
    keyword_id?: string;
    topic_id?: string;
    source: string;
    trend_score: number;
    growth_rate: number;
    region?: string;
    collected_at: string;
    keyword?: string;
    // Channel-aware relevance (present when account_id filter is active)
    relevance_score?: number;
    relevance_label?: 'High' | 'Medium' | 'Low' | 'None';
}

export interface MarketOpportunity {
    id: string;
    topic_name: string;
    topic_slug: string;
    status: string;
    demand_score: number;
    competition_score: number;
    forecast_score: number;
    opportunity_score: number;
}

export interface MarketForecast {
    topic_id: string;
    topic_name: string;
    forecast_7: number;
    forecast_30: number;
    forecast_90: number;
    forecast_score: number;
}

export interface OpportunityExport {
    id: string;
    topic_id: string;
    market_score: number;
    competition_score: number;
    forecast_score: number;
    opportunity_score: number;
    exported_at: string;
}

export interface TopicOpportunitiesDetail {
    topic_id: string;
    topic_name: string;
    opportunity_score: number;
    demand_score: number;
    competition_score: number;
    forecast_score: number;
    status: string;
    forecast_history: {
        forecast_7: number;
        forecast_30: number;
        forecast_90: number;
    };
    exports: OpportunityExport[];
}

export interface AnalyticsContextExport {
    id: string;
    source_type: 'topic' | 'opportunity' | 'insight';
    source_reference_id: string;
    context_type: 'topic' | 'opportunity' | 'insight' | 'aggregated';
    context_version: string;
    status: 'new' | 'loaded' | 'archived';
    workspace_id?: string;
    exported_at: string;
}

export interface AIContextPayload {
    context_type: string;
    context_version: string;
    topic: string;
    market_data: {
        trend_score?: number;
        demand_score?: number;
        competition_score?: number;
        forecast_score?: number;
        opportunity_score?: number;
    };
    competitor_data: {
        competition_score?: number;
        video_count?: number;
    };
    signals: Array<{
        keyword: string;
        trend_score: number;
        competition_score: number;
    }>;
    opportunities: Array<{
        topic: string;
        opportunity_score: number;
        market_demand: number;
        forecast: number;
        competition: number;
    }>;
    insights: Array<{
        insight_type: string;
        severity: string;
        finding: string;
        recommendation: string;
    }>;
    aggregated_sources: Array<{
        type: string;
        id: string;
    }>;
}

export interface AnalyticsEnrichedContext {
    id: string;
    export_id: string;
    source_type: string;
    source_reference_id: string;
    workspace_id?: string;
    channel_id?: string;
    topic_name?: string;
    context_version: string;
    enrichment_version: string;
    status: 'draft' | 'ready' | 'archived' | 'failed';
    generated_by: string;
    source_snapshot_json: string;
    payload_json: string;
    markdown_content: string;
    generated_at: string;
}

export interface EnrichedContextPayload {
    context_version: string;
    enrichment_version: string;
    topic_name: string;
    generated_by: string;
    markdown_content: string;
    analytics_context: AIContextPayload;
    research_context: {
        research_notes: string;
        research_sources: string[];
    };
    audience_context: {
        audience_level: 'Beginner' | 'Intermediate' | 'Advanced';
        pain_points: string[];
        goals: string[];
        common_questions: string[];
    };
    competitor_context: {
        oversaturated_topics: string[];
        undercovered_topics: string[];
        content_gaps: string[];
    };
    angle_candidates: string[];
    hook_candidates: string[];
    outline_candidates: Array<{
        segment: string;
        duration: string;
        description: string;
    }>;
    recommendations: {
        best_angle: string;
        best_hook: string;
        recommended_video_length: string;
        recommended_audience: string;
        confidence_score: number;
    };
}

export interface AnalyticsGeneratedDraft {
    id: string;
    source_export_id: string;
    source_enriched_context_id: string;
    workspace_id?: string;
    channel_id?: string;
    title?: string;
    draft_type: string;
    content_markdown: string;
    context_version: string;
    draft_version: string;
    generated_by: string;
    status: 'draft' | 'reviewed' | 'approved' | 'loaded_to_prompt' | 'archived' | 'deleted';
    created_at: string;
    updated_at: string;
}

export interface PipelineStats {
    new_contexts: number;
    ready_enrichments: number;
    draft_queue: number;
    archived_items: number;
    failed_enrichments: number;
    loaded_to_prompt_count: number;
    total_contexts: number;
    total_enrichments: number;
    total_drafts: number;
    timeline: Array<{
        id: string;
        event_type: string;
        title: string;
        timestamp: string;
    }>;
}

// ─────────────────────────────────────────────────────────────
// YouTube Identity Layer Types
// ─────────────────────────────────────────────────────────────

export interface YoutubeAccount {
    id: string;
    workspace_id: string;
    gcp_profile_id?: string;
    channel_binding_id?: string;
    google_account_email?: string;
    youtube_channel_id: string;
    youtube_channel_title: string;
    youtube_handle?: string;
    youtube_channel_url?: string;
    analytics_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface YoutubeSyncResult {
    synced: number;
    created: number;
    updated: number;
    message: string;
}
