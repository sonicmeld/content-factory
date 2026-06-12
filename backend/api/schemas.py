from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

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




