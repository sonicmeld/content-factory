import os
import uuid
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException
from database.models import Asset
from repositories import asset_repository
from services import channel_service
from app.config import settings

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "txt"}

def validate_file_extension(filename: str):
    ext = filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension '{ext}' not allowed")
    return ext

def upload_asset(db: Session, file: UploadFile, channel_id: str, asset_type: str, tags: str = None) -> Asset:
    ext = validate_file_extension(file.filename)
    
    if channel_id == "shared":
        base_dir = os.path.join(settings.DATA_PATH, "shared-assets")
    else:
        channel = channel_service.get_channel(db, channel_id)
        base_dir = os.path.join(settings.DATA_PATH, "channels", channel.slug, "assets", asset_type)
        
    os.makedirs(base_dir, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}.{ext}"
    filepath = os.path.join(base_dir, safe_filename)
    
    try:
        with open(filepath, "wb") as f:
            f.write(file.file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    db_asset = Asset(
        id=file_id,
        channel_id=channel_id,
        type=asset_type,
        filename=file.filename,
        filepath=filepath,
        tags=tags
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
    
    if os.path.exists(asset.filepath):
        try:
            os.remove(asset.filepath)
        except Exception as e:
            pass # Continue to delete DB record even if file deletion fails
            
    asset_repository.delete_asset(db, asset)
