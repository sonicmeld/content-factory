from sqlalchemy import Column, String, Integer, DateTime
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
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())

class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
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

class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
    title = Column(String)
    prompt = Column(String, nullable=False)
    category = Column(String)
    created_at = Column(DateTime, default=func.now())

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
    video_path = Column(String, nullable=False)
    title = Column(String)
    description = Column(String)
    thumbnail_path = Column(String)
    status = Column(String, nullable=False)
    retry_count = Column(Integer, default=0)
    error_message = Column(String)
    scheduled_at = Column(DateTime)
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())

class SchedulerJob(Base):
    __tablename__ = "scheduler_jobs"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
    cron_expression = Column(String)
    is_enabled = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())

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
