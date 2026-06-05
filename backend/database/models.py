from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Channel(Base):
    __tablename__ = "channels"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    gcp_profile_id = Column(String)
    upload_frequency = Column(String)
    thumbnail_style = Column(String)
    metadata_style = Column(String)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())

class GCPProfile(Base):
    __tablename__ = "gcp_profiles"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    client_id = Column(String, nullable=False)
    client_secret = Column(String, nullable=False)
    project_id = Column(String)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())

class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    id = Column(String, primary_key=True, index=True)
    channel_id = Column(String, nullable=False, index=True)
    access_token = Column(String)
    refresh_token = Column(String)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())

class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, index=True)
    channel_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    tags = Column(String)
    created_at = Column(DateTime, default=func.now())

class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(String, primary_key=True, index=True)
    channel_id = Column(String, nullable=False, index=True)
    title = Column(String)
    prompt = Column(String, nullable=False)
    category = Column(String)
    created_at = Column(DateTime, default=func.now())
