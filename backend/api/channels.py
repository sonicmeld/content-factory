from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database.database import get_db
from api.schemas import (
    ChannelCreate,
    ChannelUpdate,
    ChannelResponse,
    ChannelUploadPreferenceResponse,
    ChannelUploadPreferenceUpdate
)
from services import channel_service, channel_upload_preferences

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

