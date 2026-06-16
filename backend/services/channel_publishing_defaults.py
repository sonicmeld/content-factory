import re
import uuid
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from database.models import ChannelPublishingDefault
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

def get_defaults(db: Session, channel_id: str) -> ChannelPublishingDefault:
    """
    Retrieves the publishing defaults for a channel.
    If no record exists, returns a transient default instance without persisting.
    """
    record = db.query(ChannelPublishingDefault).filter(ChannelPublishingDefault.channel_id == channel_id).first()
    if not record:
        record = ChannelPublishingDefault(
            id="",
            channel_id=channel_id,
            preferred_publish_time="19:00",
            timezone=None,  # Nullable: fallback to UTC in service logic
            default_playlist_id=None,
            auto_schedule_enabled=False
        )
    return record

def validate_defaults(
    preferred_publish_time: str,
    timezone_str: Optional[str],
    default_playlist_id: Optional[str],
    auto_schedule_enabled: bool
):
    """
    Validates publishing defaults constraints.
    - If auto_schedule_enabled is True, preferred_publish_time is required and must be in HH:MM format.
    - timezone must be a valid IANA timezone name (if provided).
    """
    # Timezone validation
    if timezone_str:
        try:
            ZoneInfo(timezone_str)
        except (ZoneInfoNotFoundError, ValueError, Exception):
            raise HTTPException(status_code=400, detail=f"Invalid timezone name: '{timezone_str}'. Must be a valid IANA timezone.")

    # Publish time format validation: HH:MM
    if auto_schedule_enabled:
        if not preferred_publish_time:
            raise HTTPException(status_code=400, detail="Preferred publish time is required when auto scheduling is enabled.")
        
        if not re.match(r"^\d{2}:\d{2}$", preferred_publish_time):
            raise HTTPException(status_code=400, detail="Preferred publish time must be in 'HH:MM' format.")
        
        try:
            hour, minute = map(int, preferred_publish_time.split(":"))
            if not (0 <= hour < 24 and 0 <= minute < 60):
                raise ValueError()
        except ValueError:
            raise HTTPException(status_code=400, detail="Preferred publish time hour must be 00-23 and minute must be 00-59.")

def update_defaults(db: Session, channel_id: str, updates: dict) -> ChannelPublishingDefault:
    """
    Updates or creates publishing defaults for a channel.
    """
    preferred_publish_time = updates.get("preferred_publish_time", "19:00")
    timezone_str = updates.get("timezone")
    default_playlist_id = updates.get("default_playlist_id")
    auto_schedule_enabled = updates.get("auto_schedule_enabled", False)

    validate_defaults(
        preferred_publish_time=preferred_publish_time,
        timezone_str=timezone_str,
        default_playlist_id=default_playlist_id,
        auto_schedule_enabled=auto_schedule_enabled
    )

    record = db.query(ChannelPublishingDefault).filter(ChannelPublishingDefault.channel_id == channel_id).first()
    if not record:
        record = ChannelPublishingDefault(
            id=str(uuid.uuid4()),
            channel_id=channel_id,
            preferred_publish_time=preferred_publish_time,
            timezone=timezone_str,
            default_playlist_id=default_playlist_id,
            auto_schedule_enabled=auto_schedule_enabled
        )
        db.add(record)
    else:
        record.preferred_publish_time = preferred_publish_time
        record.timezone = timezone_str
        record.default_playlist_id = default_playlist_id
        record.auto_schedule_enabled = auto_schedule_enabled

    db.commit()
    db.refresh(record)
    return record
