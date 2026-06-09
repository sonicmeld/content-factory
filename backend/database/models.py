from sqlalchemy import Column, String, Integer, DateTime, Text, Index
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


# Sprint 7A-3.1: Metadata Context Layer
class PromptContext(Base):
    __tablename__ = "prompt_contexts"

    id = Column(String, primary_key=True)
    channel_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    topic = Column(String, nullable=True)
    keywords = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

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
