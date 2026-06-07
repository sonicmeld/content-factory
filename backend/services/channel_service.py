import os
import uuid
import re
import json
from sqlalchemy.orm import Session
from api.schemas import ChannelCreate, ChannelUpdate
from database.models import Channel
from repositories import channel_repository, gcp_profile_repository, oauth_repository
from app.config import settings
from fastapi import HTTPException

def generate_slug(name: str) -> str:
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', name).strip('-').lower()
    return slug

def create_channel_folders(slug: str, channel_in: ChannelCreate):
    data_path = settings.DATA_PATH
    if not os.path.isabs(data_path):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_path = os.path.join(base_dir, data_path)
    
    base_channel_dir = os.path.join(data_path, "channels", slug)
    folders = [
        "assets/footage",
        "assets/thumbnails",
        "assets/prompts",
        "uploads/pending",
        "uploads/scheduled",
        "uploads/published",
        "uploads/failed",
        "config",
        "logs"
    ]
    for folder in folders:
        os.makedirs(os.path.join(base_channel_dir, folder), exist_ok=True)
    
    # Create channel.json
    config_file = os.path.join(base_channel_dir, "config", "channel.json")
    if not os.path.exists(config_file):
        config_data = {
            "channel_name": channel_in.name,
            "slug": slug,
            "gcp_profile": channel_in.gcp_profile_id or "",
            "upload_frequency": channel_in.upload_frequency or "daily",
            "timezone": "Asia/Jakarta"
        }
        with open(config_file, "w") as f:
            json.dump(config_data, f, indent=4)

def create_channel(db: Session, channel_in: ChannelCreate) -> Channel:
    if channel_in.gcp_profile_id:
        profile = gcp_profile_repository.get_profile(db, channel_in.gcp_profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Assigned GCP profile not found")

    slug = generate_slug(channel_in.name)
    existing = channel_repository.get_channel_by_slug(db, slug)
    if existing:
        raise HTTPException(status_code=400, detail="Channel with this name/slug already exists")
    
    channel_id = str(uuid.uuid4())
    db_channel = Channel(
        id=channel_id,
        slug=slug,
        **channel_in.model_dump()
    )
    
    created_channel = channel_repository.create_channel(db, db_channel)
    
    # Create folder structure
    create_channel_folders(slug, channel_in)
    
    return created_channel

from datetime import datetime

def populate_oauth_status(db: Session, channel: Channel):
    token = oauth_repository.get_token_by_channel(db, channel.id)
    if not token:
        channel.oauth_status = "OAuth Missing"
    else:
        if token.expires_at and token.expires_at < datetime.utcnow():
            channel.oauth_status = "OAuth Expired"
        else:
            channel.oauth_status = "OAuth Connected"
    return channel

def get_channels(db: Session, skip: int = 0, limit: int = 100):
    channels = channel_repository.get_channels(db, skip, limit)
    for c in channels:
        populate_oauth_status(db, c)
    return channels

def get_channel(db: Session, channel_id: str) -> Channel:
    channel = channel_repository.get_channel(db, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    populate_oauth_status(db, channel)
    return channel

def update_channel(db: Session, channel_id: str, channel_in: ChannelUpdate) -> Channel:
    if channel_in.gcp_profile_id:
        profile = gcp_profile_repository.get_profile(db, channel_in.gcp_profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Assigned GCP profile not found")

    channel = get_channel(db, channel_id)
    updates = channel_in.model_dump(exclude_unset=True)
    return channel_repository.update_channel(db, channel, updates)

def delete_channel(db: Session, channel_id: str):
    channel = get_channel(db, channel_id)
    oauth_repository.delete_token_by_channel(db, channel_id)
    channel_repository.delete_channel(db, channel)

def get_channel_storage_stats(slug: str) -> dict:
    data_path = settings.DATA_PATH
    if not os.path.isabs(data_path):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_path = os.path.join(base_dir, data_path)
    
    packages_dir = os.path.join(data_path, "channels", slug, "packages")
    
    total_packages = 0
    total_video_files = 0
    total_bytes = 0
    
    if os.path.exists(packages_dir) and os.path.isdir(packages_dir):
        for root, dirs, files in os.walk(packages_dir):
            if root == packages_dir:
                total_packages = len(dirs)
            for f in files:
                file_path = os.path.join(root, f)
                if os.path.isfile(file_path):
                    total_bytes += os.path.getsize(file_path)
                    if f.lower().endswith(".mp4"):
                        total_video_files += 1

    return {
        "package_count": total_packages,
        "video_count": total_video_files,
        "storage_bytes": total_bytes
    }
