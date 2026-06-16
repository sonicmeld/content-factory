from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime
from enum import Enum

class ChannelBase(BaseModel):
    name: str
    description: Optional[str] = None
    gcp_profile_id: Optional[str] = None
    upload_frequency: Optional[str] = None
    thumbnail_style: Optional[str] = None
    metadata_style: Optional[str] = None
    # Sprint 7A: 9Router Combo Configuration
    metadata_combo: Optional[str] = None
    thumbnail_combo: Optional[str] = None
    footage_combo: Optional[str] = None
    youtube_account_id: Optional[str] = None

class ChannelCreate(ChannelBase):
    pass

class ChannelUpdate(ChannelBase):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[int] = None

class ChannelResponse(ChannelBase):
    id: str
    slug: str
    youtube_channel_id: Optional[str] = None
    youtube_channel_title: Optional[str] = None
    youtube_handle: Optional[str] = None
    youtube_channel_url: Optional[str] = None
    is_active: int
    created_at: datetime
    oauth_status: str = "OAuth Missing"

    model_config = ConfigDict(from_attributes=True)

class GCPProfileBase(BaseModel):
    name: str
    client_id: str
    client_secret: str
    project_id: Optional[str] = None

class GCPProfileCreate(GCPProfileBase):
    pass

class GCPProfileUpdate(BaseModel):
    name: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    project_id: Optional[str] = None
    is_active: Optional[int] = None

class GCPProfileResponse(BaseModel):
    id: str
    name: str
    client_id: str
    project_id: Optional[str] = None
    is_active: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AssetResponse(BaseModel):
    id: str
    channel_id: Optional[str] = None
    asset_type: str
    filename: str
    file_path: str
    file_size: int
    mime_type: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class GenerateThumbnailRequest(BaseModel):
    channel_id: str
    prompt: str

class PromptGenerateRequest(BaseModel):
    channel_id: str
    theme: str
    mood: str

class PromptResponse(BaseModel):
    id: str
    channel_id: str
    title: Optional[str] = None
    prompt: str
    category: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UploadJobCreate(BaseModel):
    channel_id: str
    video_path: str
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_path: Optional[str] = None
    scheduled_at: Optional[datetime] = None

class UploadJobUpdateStatus(BaseModel):
    status: str

class UploadJobResponse(BaseModel):
    id: str
    channel_id: str
    video_path: str
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_path: Optional[str] = None
    status: str
    retry_count: int
    error_message: Optional[str] = None
    progress: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MetadataTemplateResponse(BaseModel):
    id: str
    channel_id: str
    title_template: Optional[str] = None
    description_template: Optional[str] = None
    tags_template: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ContentPackageBase(BaseModel):
    channel_id: str
    package_number: str
    video_path: str
    timestamp_path: Optional[str] = None
    status: Optional[str] = "draft"

class ContentPackageCreate(ContentPackageBase):
    pass

class ContentPackageUpdate(BaseModel):
    package_number: Optional[str] = None
    video_path: Optional[str] = None
    timestamp_path: Optional[str] = None
    status: Optional[str] = None

class ContentPackageResponse(ContentPackageBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Sprint 7A: Generation Studio schemas
class PackageGenerationResponse(BaseModel):
    id: str
    package_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_path: Optional[str] = None
    metadata_status: str
    thumbnail_status: str
    error_message: Optional[str] = None
    is_ready: bool = False
    metadata_combo_used: Optional[str] = None
    thumbnail_combo_used: Optional[str] = None
    prompt_context_used: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Sprint 7A-3.1: Metadata Context schemas
class PromptContextBase(BaseModel):
    prompt_type: str = "metadata"
    title: str
    topic: Optional[str] = None
    keywords: Optional[str] = None
    notes: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True

class PromptContextCreate(PromptContextBase):
    pass


class PromptContextUpdate(BaseModel):
    prompt_type: Optional[str] = None
    title: Optional[str] = None
    topic: Optional[str] = None
    keywords: Optional[str] = None
    notes: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PromptContextResponse(PromptContextBase):
    id: str
    channel_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerateMetadataRequest(BaseModel):
    context_id: Optional[str] = None

# Sprint 7B-2: Channel Prompt Assignments schemas
class ChannelPromptAssignmentBase(BaseModel):
    prompt_id: str
    assignment_order: int = 1
    is_active: int = 1

class ChannelPromptAssignmentCreate(ChannelPromptAssignmentBase):
    pass

class ChannelPromptAssignmentUpdate(BaseModel):
    assignment_order: Optional[int] = None
    is_active: Optional[int] = None

class ChannelPromptAssignmentResponse(ChannelPromptAssignmentBase):
    id: str
    channel_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Sprint 7A-4.5: Global Combo Registry schemas
class GenerationComboBase(BaseModel):
    name: str
    category: str
    endpoint_type: str
    description: Optional[str] = None
    config_json: Optional[str] = None

class GenerationComboCreate(GenerationComboBase):
    pass

class GenerationComboUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    endpoint_type: Optional[str] = None
    description: Optional[str] = None
    config_json: Optional[str] = None
    is_active: Optional[int] = None

class GenerationComboResponse(GenerationComboBase):
    id: str
    is_active: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Sprint 7A-5: Metadata Variant Library schemas
class MetadataVariantResponse(BaseModel):
    id: str
    package_generation_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    source_combo: Optional[str] = None
    source_context: Optional[str] = None
    is_selected: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Sprint 7A-6: Asset Engine Foundation
class GenerationAssetResponse(BaseModel):
    id: str
    package_generation_id: str
    asset_type: str
    file_path: str
    filename: str
    mime_type: str
    file_size: int
    status: str
    source_combo: Optional[str] = None
    source_context: Optional[str] = None
    is_selected: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Sprint 7B-1: Global Metadata Library
class MetadataLibraryCreate(BaseModel):
    title: str
    description: str
    category: Optional[str] = None
    tags: Optional[str] = None
    source_variant_id: Optional[str] = None

class MetadataLibraryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    is_active: Optional[bool] = None

class MetadataLibraryResponse(BaseModel):
    id: str
    title: str
    description: str
    category: Optional[str] = None
    tags: Optional[str] = None
    source_variant_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Sprint 7C-1: Runtime Audit Layer
class RuntimeAuditResponse(BaseModel):
    id: str
    execution_id: str
    package_id: str
    execution_type: str
    selected_prompt_id: Optional[str] = None
    selected_prompt_title: Optional[str] = None
    assigned_prompt_ids: Optional[str] = None
    assigned_prompt_titles: Optional[str] = None
    combo_used: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    executed_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Flow Connector & Asset Inbox schemas
class ExternalAccountCreate(BaseModel):
    workspace_id: str
    provider: str
    account_name: str
    profile_name: Optional[str] = None

class ExternalAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    profile_name: Optional[str] = None
    is_active: Optional[int] = None

class ExternalAccountResponse(BaseModel):
    id: str
    workspace_id: str
    provider: str
    account_name: str
    profile_name: Optional[str] = None
    is_active: int

    model_config = ConfigDict(from_attributes=True)

class ConnectorJobCreate(BaseModel):
    workspace_id: str
    provider: str
    account_id: Optional[str] = None
    asset_type: str
    combo_id: Optional[str] = None
    prompt_id: Optional[str] = None

class ConnectorJobResponse(BaseModel):
    id: str
    workspace_id: str
    provider: str
    account_id: Optional[str] = None
    asset_type: str
    status: str
    combo_id: Optional[str] = None
    prompt_id: Optional[str] = None
    created_at: datetime
    # Dynamically resolved context
    channel_id: Optional[str] = None
    prompt: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AssetInboxResponse(BaseModel):
    id: str
    workspace_id: str
    source: str
    source_id: Optional[str] = None
    asset_type: str
    status: str
    file_path: str
    metadata: Optional[str] = None
    created_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ApproveInboxAssetRequest(BaseModel):
    channel_id: Optional[str] = None

class SingleModelGenerationRequest(BaseModel):
    workspace_id: str
    asset_type: str
    model: str
    prompt: str
    size: Optional[str] = "1280x720"
    output_format: str
    output_count: int = 1

class SystemSettingsResponse(BaseModel):
    single_model_endpoint: str
    single_model_api_key: str
    nine_router_timeout: int
    nine_router_max_tokens: int
    nine_router_strip_json_mode: bool
    nine_router_strip_penalties: bool
    nine_router_convert_system_to_user: bool

class SystemSettingsUpdate(BaseModel):
    single_model_endpoint: str
    single_model_api_key: str
    nine_router_timeout: int = 60
    nine_router_max_tokens: int = 4000
    nine_router_strip_json_mode: bool = True
    nine_router_strip_penalties: bool = True
    nine_router_convert_system_to_user: bool = False

class GenerationModelResponse(BaseModel):
    id: str
    name: str
    is_active: int

    class Config:
        from_attributes = True

class GenerationModelCreate(BaseModel):
    name: str

class DraftGenerateRequest(BaseModel):
    workspace_id: Optional[str] = "default"
    expert_type: str
    combo_id: str
    input_text: str

class DraftResponse(BaseModel):
    id: str
    workspace_id: str
    expert_type: str
    combo_id: str
    input_text: str
    topic: str
    keywords: List[str]
    notes: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DraftApproveRequest(BaseModel):
    channel_id: str
    title: str
    prompt_type: str
    topic: str
    keywords: str
    notes: str


# Sprint A: Analytics schemas
class AnalyticsSyncStatus(str, Enum):
    PENDING = "PENDING"
    SYNCING = "SYNCING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    DISABLED = "DISABLED"


class ObserveChannelRequest(BaseModel):
    external_channel_id: str
    analytics_type: Literal["owned", "competitor", "observed"]
    channel_id: Optional[str] = None


class LinkChannelIdentityRequest(BaseModel):
    identity_reference_id: str


class AnalyticsChannelResponse(BaseModel):
    id: str
    external_channel_id: str
    channel_name: str
    channel_handle: Optional[str] = None
    is_own: bool
    analytics_type: str
    sync_status: str
    last_error: Optional[str] = None
    is_archived: bool
    last_sync_duration_seconds: Optional[int] = None
    created_at: datetime
    last_sync_at: Optional[datetime] = None
    subscribers: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class AnalyticsOverviewResponse(BaseModel):
    channel_id: str
    views: int
    watch_time: float
    subscribers: int
    impressions: int
    ctr: float
    likes: int
    comments: int
    last_sync_at: Optional[datetime] = None


class AnalyticsVideoResponse(BaseModel):
    id: str
    external_video_id: str
    analytics_channel_id: str
    title: str
    published_at: datetime
    duration_seconds: Optional[int] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    views: int = 0
    likes: int = 0
    comments: int = 0

    model_config = ConfigDict(from_attributes=True)


class AnalyticsInsightResponse(BaseModel):
    id: str
    analytics_channel_id: Optional[str] = None
    scope: str
    insight_type: str
    insight_version: int
    payload_version: int
    confidence_score: float
    title: str
    summary: str
    payload_json: str
    created_at: datetime
    generated_at: datetime
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GoogleTrendsSnapshotResponse(BaseModel):
    id: str
    query_term: str
    geo: str
    category: Optional[str] = None
    source: str
    snapshot_date: datetime
    interest_value: int
    related_queries_json: Optional[str] = None
    related_topics_json: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CompanionRegisterRequest(BaseModel):
    runtime_name: str
    client_id: str


class CompanionRegisterResponse(BaseModel):
    runtime_id: str
    api_key: str


class CompanionMeResponse(BaseModel):
    runtime_name: str
    status: str
    last_seen_at: Optional[datetime] = None
    client_id: str
    is_revoked: int

    model_config = ConfigDict(from_attributes=True)


class CompanionRuntimeResponse(BaseModel):
    id: str
    runtime_name: str
    client_id: str
    status: str
    is_revoked: int
    last_seen_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SyncActivityLog(BaseModel):
    id: str
    channel_name: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class AnalyticsInsightResponse(BaseModel):
    id: str
    channel_id: Optional[str] = None
    insight_source: str
    insight_type: str
    severity: str
    status: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    engine_version: str
    fingerprint: str
    title: str
    description: str
    score: int
    evidence_json: Optional[str] = None
    first_detected_at: datetime
    last_detected_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InsightRefreshResponse(BaseModel):
    generated: int
    removed: int
    duration_ms: int


class InsightStatusUpdateRequest(BaseModel):
    status: str


class MarketTopicResponse(BaseModel):
    id: str
    topic_name: str
    topic_slug: str
    fingerprint: str
    status: str
    trend_score: float
    demand_score: float
    competition_score: float
    forecast_score: float
    opportunity_score: float
    last_calculated_at: datetime
    created_at: datetime
    updated_at: datetime
    # Channel-aware relevance fields (None when in global mode)
    relevance_score: Optional[float] = None
    relevance_label: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MarketKeywordResponse(BaseModel):
    id: str
    topic_id: str
    keyword: str
    trend_score: float
    search_volume: float
    competition_score: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MarketTrendResponse(BaseModel):
    id: str
    keyword_id: Optional[str] = None
    topic_id: Optional[str] = None
    source: str
    trend_score: float
    growth_rate: float
    region: Optional[str] = None
    collected_at: datetime
    keyword: Optional[str] = None
    # Channel-aware relevance fields (None when in global mode)
    relevance_score: Optional[float] = None
    relevance_label: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MarketOpportunityResponse(BaseModel):
    id: str
    topic_name: str
    topic_slug: str
    status: str
    demand_score: float
    competition_score: float
    forecast_score: float
    opportunity_score: float

    model_config = ConfigDict(from_attributes=True)


class MarketForecastResponse(BaseModel):
    topic_id: str
    topic_name: str
    forecast_7: float
    forecast_30: float
    forecast_90: float
    forecast_score: float


class OpportunityExportResponse(BaseModel):
    id: str
    topic_id: str
    market_score: float
    competition_score: float
    forecast_score: float
    opportunity_score: float
    exported_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OpportunityExportRequest(BaseModel):
    topic_id: str


class ExportContextRequest(BaseModel):
    id: str
    workspace_id: Optional[str] = None


class AnalyticsContextExportResponse(BaseModel):
    id: str
    source_type: str
    source_reference_id: str
    context_type: str
    context_version: str
    status: str
    workspace_id: Optional[str] = None
    exported_at: datetime
    
    # Preview fields
    topic_name: Optional[str] = None
    opportunity_score: Optional[float] = None
    forecast_score: Optional[float] = None
    severity: Optional[str] = None
    insight_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AIContextPayloadResponse(BaseModel):
    context_type: str
    context_version: str
    topic: str
    market_data: Dict[str, Any]
    competitor_data: Dict[str, Any]
    signals: List[Dict[str, Any]]
    opportunities: List[Dict[str, Any]]
    insights: List[Dict[str, Any]]
    aggregated_sources: List[Dict[str, str]]


class EnrichContextRequest(BaseModel):
    export_id: str


class ResearchContextResponse(BaseModel):
    id: str
    export_id: str
    source_type: str
    source_reference_id: str
    workspace_id: Optional[str] = None
    channel_id: Optional[str] = None
    youtube_account_id: Optional[str] = None
    
    topic: Optional[str] = None
    trend_score: float = 0.0
    keyword_count: int = 0
    competitor_count: int = 0
    signal_count: int = 0
    
    keywords: Dict[str, Any]
    audience: Dict[str, Any]
    competitors: Dict[str, Any]
    opportunities: List[Any]
    signals: Dict[str, Any]
    
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResearchContextHistoryResponse(BaseModel):
    id: str
    export_id: str
    source_type: str
    source_reference_id: str
    workspace_id: Optional[str] = None
    channel_id: Optional[str] = None
    youtube_account_id: Optional[str] = None
    topic: Optional[str] = None
    trend_score: float = 0.0
    keyword_count: int = 0
    competitor_count: int = 0
    signal_count: int = 0
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerateDraftRequest(BaseModel):
    enriched_context_id: str


class AnalyticsDraftResponse(BaseModel):
    id: str
    source_export_id: str
    source_enriched_context_id: str
    workspace_id: Optional[str] = None
    channel_id: Optional[str] = None
    title: Optional[str] = None
    draft_type: str
    content_markdown: str
    context_version: str
    draft_version: str
    generated_by: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DraftStatusUpdateRequest(BaseModel):
    status: str


class BulkActionRequest(BaseModel):
    ids: List[str]
    stage: str  # 'inbox' | 'enriched' | 'drafts'


class PipelineStatsResponse(BaseModel):
    new_contexts: int
    ready_enrichments: int
    draft_queue: int
    archived_items: int
    failed_enrichments: int
    loaded_to_prompt_count: int
    total_contexts: int
    total_enrichments: int
    total_drafts: int


class ActivityTimelineItem(BaseModel):
    id: str
    event_type: str  # e.g., 'Context Exported', 'Context Enriched', etc.
    title: str
    timestamp: datetime


# ─────────────────────────────────────────────────────────────
# YouTube Identity Layer Schemas
# ─────────────────────────────────────────────────────────────

class YoutubeAccountResponse(BaseModel):
    """Representasi lengkap satu YouTube Account dari tabel youtube_accounts (SSOT)."""
    id: str
    workspace_id: str
    gcp_profile_id: Optional[str] = None
    channel_binding_id: Optional[str] = None
    google_account_email: Optional[str] = None
    youtube_channel_id: str
    youtube_channel_title: str
    youtube_handle: Optional[str] = None
    youtube_channel_url: Optional[str] = None
    analytics_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class YoutubeAnalyticsToggleRequest(BaseModel):
    """Request body untuk toggle analytics_enabled pada satu YouTube account."""
    enabled: bool


class YoutubeSyncResponse(BaseModel):
    """Response dari endpoint POST /youtube-identity/sync."""
    synced: int
    created: int
    updated: int
    message: str


class ChannelUploadPreferenceUpdate(BaseModel):
    privacy_status: str
    category_id: Optional[str] = None
    default_language: Optional[str] = None
    default_tags: List[str] = []


class ChannelUploadPreferenceResponse(BaseModel):
    channel_id: str
    privacy_status: str
    category_id: Optional[str] = None
    default_language: Optional[str] = None
    default_tags: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ChannelPublishingDefaultUpdate(BaseModel):
    preferred_publish_time: str
    timezone: Optional[str] = None
    default_playlist_id: Optional[str] = None
    auto_schedule_enabled: bool


class ChannelPublishingDefaultResponse(BaseModel):
    channel_id: str
    preferred_publish_time: str
    timezone: Optional[str] = None
    default_playlist_id: Optional[str] = None
    auto_schedule_enabled: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class YoutubePlaylistResponse(BaseModel):
    id: str
    title: str


