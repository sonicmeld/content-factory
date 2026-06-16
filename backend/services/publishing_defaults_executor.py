import logging
from datetime import datetime, time, timedelta
from typing import Optional, Any
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo

from services.channel_publishing_defaults import get_defaults

logger = logging.getLogger("publishing_executor")

def calculate_next_publish_time(preferred_time: str, timezone_str: Optional[str]) -> str:
    """
    Calculates the next target publish datetime in ISO 8601 UTC format.
    Falls back to 'UTC' if no timezone is configured.
    """
    tz_name = timezone_str if timezone_str else "UTC"
    tz = ZoneInfo(tz_name)
    
    now_local = datetime.now(tz)
    
    try:
        hour, minute = map(int, preferred_time.split(":"))
    except Exception:
        # Fallback to 19:00 if invalid
        hour, minute = 19, 0
        
    publish_time = time(hour, minute)
    
    target_today = datetime.combine(now_local.date(), publish_time, tzinfo=tz)
    
    if now_local < target_today:
        next_publish = target_today
    else:
        next_publish = target_today + timedelta(days=1)
        
    next_publish_utc = next_publish.astimezone(ZoneInfo("UTC"))
    return next_publish_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

def apply_scheduling_defaults(db: Session, channel_id: str, body: dict) -> Optional[str]:
    """
    Retrieves scheduling preferences and mutates the upload request body.
    Returns the publishAt ISO 8601 string if scheduled, else None.
    """
    pref = get_defaults(db, channel_id)
    if not pref or not pref.auto_schedule_enabled:
        return None
        
    publish_at_str = calculate_next_publish_time(pref.preferred_publish_time, pref.timezone)
    
    # Scheduled videos must be private at upload time
    if "status" not in body:
        body["status"] = {}
    body["status"]["privacyStatus"] = "private"
    body["status"]["publishAt"] = publish_at_str
    
    return publish_at_str

def assign_playlist_defaults(db: Session, channel_id: str, youtube_client: Any, video_id: str) -> bool:
    """
    Post-upload playlist assignment step.
    This action is entirely non-blocking: any errors during playlist items addition
    will be logged as a warning, and the flow will succeed.
    """
    pref = get_defaults(db, channel_id)
    if not pref or not pref.default_playlist_id:
        return False
        
    playlist_id = pref.default_playlist_id.strip()
    if not playlist_id:
        return False
        
    logger.info(f"Attempting to add video {video_id} to playlist {playlist_id} for channel {channel_id}...")
    try:
        youtube_client.playlistItems().insert(
            part="snippet",
            body={
                "snippet": {
                    "playlistId": playlist_id,
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
        ).execute()
        logger.info(f"Successfully added video {video_id} to playlist {playlist_id}!")
        return True
    except Exception as e:
        logger.warning(
            f"Non-blocking Playlist Assignment Failed: Failed to add video {video_id} to playlist {playlist_id}. "
            f"Error details: {str(e)}"
        )
        # We explicitly return False, but do NOT raise.
        return False
