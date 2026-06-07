import os
import uuid
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException
from api.schemas import ContentPackageUpdate, ContentPackageCreate
from database.models import ContentPackage
from repositories import packages as package_repo
from services import channel_service
from app.config import settings

def validate_package_video_extension(filename: str):
    ext = filename.split(".")[-1].lower()
    if ext not in {"mp4"}:
        raise HTTPException(status_code=400, detail=f"Video file extension '{ext}' not allowed. Only .mp4 is supported.")
    return ext

def validate_package_timestamp_extension(filename: str):
    ext = filename.split(".")[-1].lower()
    if ext not in {"txt"}:
        raise HTTPException(status_code=400, detail=f"Timestamp file extension '{ext}' not allowed. Only .txt is supported.")
    return ext

async def create_content_package_with_files(
    db: Session, 
    channel_id: str, 
    package_number: str, 
    status: str,
    video: UploadFile,
    timestamp: UploadFile = None
) -> ContentPackage:
    channel = channel_service.get_channel(db, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
        
    # Validate extensions
    video_ext = validate_package_video_extension(video.filename)
    if timestamp:
        timestamp_ext = validate_package_timestamp_extension(timestamp.filename)

    # Base directory for the package
    base_dir = os.path.join(settings.DATA_PATH, "channels", channel.slug, "packages", package_number)
    os.makedirs(base_dir, exist_ok=True)

    # Save video
    video_filename = f"video.{video_ext}"
    video_path = os.path.join(base_dir, video_filename)
    try:
        with open(video_path, "wb") as f:
            while chunk := await video.read(1024 * 1024):
                f.write(chunk)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video file: {str(e)}")

    # Save timestamp if provided
    timestamp_path_db = None
    if timestamp:
        timestamp_filename = f"timestamp.{timestamp_ext}"
        timestamp_path = os.path.join(base_dir, timestamp_filename)
        try:
            with open(timestamp_path, "wb") as f:
                while chunk := await timestamp.read(1024 * 1024):
                    f.write(chunk)
            timestamp_path_db = timestamp_path
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save timestamp file: {str(e)}")

    package_data = ContentPackageCreate(
        channel_id=channel_id,
        package_number=package_number,
        video_path=video_path,
        timestamp_path=timestamp_path_db,
        status=status
    )
    
    return package_repo.create_package(db, package_data)

def update_content_package(db: Session, package_id: str, package_update: ContentPackageUpdate):
    existing_package = package_repo.get_package(db, package_id)
    if not existing_package:
        raise HTTPException(status_code=404, detail="Content package not found")
        
    updated_package = package_repo.update_package(db, package_id, package_update)
    return updated_package

def update_package_status(db: Session, package_id: str, status: str):
    existing_package = package_repo.get_package(db, package_id)
    if not existing_package:
        raise HTTPException(status_code=404, detail="Content package not found")
    
    valid_statuses = ['draft', 'ready', 'queued', 'uploading', 'published', 'failed']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed statuses are: {', '.join(valid_statuses)}")
        
    update_data = ContentPackageUpdate(status=status)
    return package_repo.update_package(db, package_id, update_data)
