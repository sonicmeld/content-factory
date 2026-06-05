from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ChannelBase(BaseModel):
    name: str
    description: Optional[str] = None
    gcp_profile_id: Optional[str] = None
    upload_frequency: Optional[str] = None
    thumbnail_style: Optional[str] = None
    metadata_style: Optional[str] = None

class ChannelCreate(ChannelBase):
    pass

class ChannelUpdate(ChannelBase):
    name: Optional[str] = None
    is_active: Optional[int] = None

class ChannelResponse(ChannelBase):
    id: str
    slug: str
    is_active: int
    created_at: datetime
    oauth_status: bool = False

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
    channel_id: str
    type: str
    filename: str
    filepath: str
    tags: Optional[str] = None
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
