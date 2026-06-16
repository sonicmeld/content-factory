from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from googleapiclient.discovery import build

from database.database import get_db
from api.schemas import (
    ChannelCreate,
    ChannelUpdate,
    ChannelResponse,
    ChannelUploadPreferenceResponse,
    ChannelUploadPreferenceUpdate,
    ChannelPublishingDefaultResponse,
    ChannelPublishingDefaultUpdate,
    YoutubePlaylistResponse
)
from services import channel_service, channel_upload_preferences, channel_publishing_defaults, oauth_service


router = APIRouter(prefix="/api/channels", tags=["channels"])

@router.post("", response_model=ChannelResponse)
def create_channel(channel_in: ChannelCreate, db: Session = Depends(get_db)):
    return channel_service.create_channel(db, channel_in)

@router.get("", response_model=List[ChannelResponse])
def get_channels(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return channel_service.get_channels(db, skip=skip, limit=limit)

@router.get("/{channel_id}", response_model=ChannelResponse)
def get_channel(channel_id: str, db: Session = Depends(get_db)):
    return channel_service.get_channel(db, channel_id)

@router.put("/{channel_id}", response_model=ChannelResponse)
def update_channel(channel_id: str, channel_in: ChannelUpdate, db: Session = Depends(get_db)):
    return channel_service.update_channel(db, channel_id, channel_in)

@router.delete("/{channel_id}")
def delete_channel(channel_id: str, db: Session = Depends(get_db)):
    channel_service.delete_channel(db, channel_id)
    return {"message": "Channel deleted successfully"}

@router.get("/{channel_id}/storage")
def get_channel_storage(channel_id: str, db: Session = Depends(get_db)):
    channel = channel_service.get_channel(db, channel_id)
    return channel_service.get_channel_storage_stats(channel.slug)

@router.get("/{channel_id}/upload-preferences", response_model=ChannelUploadPreferenceResponse)
def get_upload_preferences(channel_id: str, db: Session = Depends(get_db)):
    channel_service.get_channel(db, channel_id)
    return channel_upload_preferences.get_preferences(db, channel_id)

@router.put("/{channel_id}/upload-preferences", response_model=ChannelUploadPreferenceResponse)
def update_upload_preferences(channel_id: str, updates: ChannelUploadPreferenceUpdate, db: Session = Depends(get_db)):
    channel_service.get_channel(db, channel_id)
    return channel_upload_preferences.update_preferences(db, channel_id, updates.model_dump())

@router.get("/{channel_id}/publishing-defaults", response_model=ChannelPublishingDefaultResponse)
def get_publishing_defaults(channel_id: str, db: Session = Depends(get_db)):
    channel_service.get_channel(db, channel_id)
    return channel_publishing_defaults.get_defaults(db, channel_id)

@router.put("/{channel_id}/publishing-defaults", response_model=ChannelPublishingDefaultResponse)
def update_publishing_defaults(channel_id: str, updates: ChannelPublishingDefaultUpdate, db: Session = Depends(get_db)):
    channel_service.get_channel(db, channel_id)
    return channel_publishing_defaults.update_defaults(db, channel_id, updates.model_dump())

@router.get("/{channel_id}/playlists", response_model=List[YoutubePlaylistResponse])
def get_channel_playlists(channel_id: str, db: Session = Depends(get_db)):
    channel_service.get_channel(db, channel_id)
    try:
        credentials = oauth_service.get_valid_credentials(db, channel_id)
        youtube = build("youtube", "v3", credentials=credentials)
        
        playlists = []
        request = youtube.playlists().list(part="id,snippet", mine=True, maxResults=50)
        response = request.execute()
        
        for item in response.get("items", []):
            playlists.append({
                "id": item["id"],
                "title": item["snippet"]["title"]
            })
        return playlists
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch playlists from YouTube: {str(e)}")


