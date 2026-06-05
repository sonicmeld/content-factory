import os
import uuid
import re
import json
from sqlalchemy.orm import Session
from api.schemas import ChannelCreate, ChannelUpdate
from database.models import Channel
from repositories import channel_repository
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

def get_channels(db: Session, skip: int = 0, limit: int = 100):
    return channel_repository.get_channels(db, skip, limit)

def get_channel(db: Session, channel_id: str) -> Channel:
    channel = channel_repository.get_channel(db, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel

def update_channel(db: Session, channel_id: str, channel_in: ChannelUpdate) -> Channel:
    channel = get_channel(db, channel_id)
    updates = channel_in.model_dump(exclude_unset=True)
    return channel_repository.update_channel(db, channel, updates)

def delete_channel(db: Session, channel_id: str):
    channel = get_channel(db, channel_id)
    channel_repository.delete_channel(db, channel)
