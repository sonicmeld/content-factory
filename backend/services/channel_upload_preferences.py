import uuid
import json
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException
from database.models import ChannelUploadPreference

def get_preferences(db: Session, channel_id: str) -> ChannelUploadPreference:
    """
    Retrieves the upload preferences for a channel.
    If no record exists, returns a transient default instance without persisting.
    """
    pref = db.query(ChannelUploadPreference).filter(ChannelUploadPreference.channel_id == channel_id).first()
    if not pref:
        pref = ChannelUploadPreference(
            id="",
            channel_id=channel_id,
            privacy_status="private",
            category_id="22",
            default_language="en",
            default_tags_json="[]"
        )
    return pref

def validate_preferences(privacy_status: str, category_id: Optional[str], default_language: Optional[str], default_tags: List[str]):
    """
    Validates upload preferences constraints.
    - Privacy status must be private, unlisted, or public.
    - Combined tag character length <= 500.
    """
    if privacy_status not in ("private", "unlisted", "public"):
        raise HTTPException(status_code=400, detail="Invalid privacy status. Must be private, unlisted, or public.")
    
    combined_tags_len = sum(len(tag) for tag in default_tags) + max(0, len(default_tags) - 1)
    if combined_tags_len > 500:
        raise HTTPException(status_code=400, detail="Combined default tags cannot exceed 500 characters.")

def update_preferences(db: Session, channel_id: str, updates: dict) -> ChannelUploadPreference:
    """
    Updates or creates preferences for the channel.
    """
    privacy_status = updates.get("privacy_status", "private")
    category_id = updates.get("category_id")
    default_language = updates.get("default_language")
    default_tags = updates.get("default_tags", [])
    
    validate_preferences(privacy_status, category_id, default_language, default_tags)
    
    pref = db.query(ChannelUploadPreference).filter(ChannelUploadPreference.channel_id == channel_id).first()
    if not pref:
        pref = ChannelUploadPreference(
            id=str(uuid.uuid4()),
            channel_id=channel_id,
            privacy_status=privacy_status,
            category_id=category_id,
            default_language=default_language,
            default_tags_json=json.dumps(default_tags)
        )
        db.add(pref)
    else:
        pref.privacy_status = privacy_status
        pref.category_id = category_id
        pref.default_language = default_language
        pref.default_tags_json = json.dumps(default_tags)
        
    db.commit()
    db.refresh(pref)
    return pref
