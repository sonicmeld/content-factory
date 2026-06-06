import os
import uuid
import mimetypes
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException
from database.models import Asset
from repositories import asset_repository
from services import channel_service
from app.config import settings

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "txt", "md", "mp4", "mov", "mkv", "webm", "wav", "mp3"}

def validate_file_extension(filename: str):
    ext = filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension '{ext}' not allowed")
    return ext

async def upload_asset(db: Session, file: UploadFile, channel_id: str | None, asset_type: str) -> Asset:
    ext = validate_file_extension(file.filename)
    
    if channel_id == "shared" or not channel_id:
        base_dir = os.path.join(settings.DATA_PATH, "shared", asset_type)
        actual_channel_id = None
    else:
        channel = channel_service.get_channel(db, channel_id)
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")
        base_dir = os.path.join(settings.DATA_PATH, "channels", channel.slug, asset_type)
        actual_channel_id = channel_id
        
    os.makedirs(base_dir, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}.{ext}"
    filepath = os.path.join(base_dir, safe_filename)
    
    file_size = 0
    try:
        with open(filepath, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)
                file_size += len(chunk)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    mime_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"

    db_asset = Asset(
        id=file_id,
        channel_id=actual_channel_id,
        asset_type=asset_type,
        filename=file.filename,
        file_path=filepath,
        file_size=file_size,
        mime_type=mime_type
    )
    return asset_repository.create_asset(db, db_asset)

def get_assets(db: Session, channel_id: str = None, asset_type: str = None, skip: int = 0, limit: int = 100):
    return asset_repository.get_assets(db, channel_id, asset_type, skip, limit)

def get_asset(db: Session, asset_id: str) -> Asset:
    asset = asset_repository.get_asset(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

def delete_asset(db: Session, asset_id: str):
    asset = get_asset(db, asset_id)
    
    if os.path.exists(asset.file_path):
        try:
            os.remove(asset.file_path)
        except Exception as e:
            pass # Continue to delete DB record even if file deletion fails
            
    asset_repository.delete_asset(db, asset)
