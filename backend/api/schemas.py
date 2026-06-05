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

    model_config = ConfigDict(from_attributes=True)
