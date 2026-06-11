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
    
    valid_statuses = ['draft', 'ready', 'assembled', 'queued', 'uploading', 'published', 'failed']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed statuses are: {', '.join(valid_statuses)}")
        
    update_data = ContentPackageUpdate(status=status)
    return package_repo.update_package(db, package_id, update_data)

# Sprint 7C-4: Assembly Foundation Layer
def assemble_package(db: Session, package_id: str):
    """Consumes mapped assets (is_selected=True) to produce a compiled production artifact (manifest.json)."""
    import logging
    import json
    from repositories import package_generation_repository
    from database.models import MetadataVariant, GenerationAsset
    logger = logging.getLogger(__name__)

    # 1. Fetch ContentPackage
    existing_package = package_repo.get_package(db, package_id)
    if not existing_package:
        raise HTTPException(status_code=404, detail="Content package not found")
        
    # 2. Fetch PackageGeneration
    generation = package_generation_repository.get_by_package_id(db, package_id)
    if not generation:
        raise HTTPException(status_code=400, detail="Missing Generation data. No mapped assets available.")

    # 3. Extensible Asset-Type Validation
    # Define required production assets. In the future, 'Footage' can be added here without refactoring the engine.
    REQUIRED_ASSET_TYPES = ['Metadata', 'Thumbnail']
    
    missing_assets = []
    manifest_payload = {
        "package_id": package_id,
        "channel_id": existing_package.channel_id,
        "video_path": existing_package.video_path,
        "assets": {}
    }

    # Validate Metadata mapping
    if 'Metadata' in REQUIRED_ASSET_TYPES:
        selected_metadata = db.query(MetadataVariant).filter(
            MetadataVariant.package_generation_id == generation.id,
            MetadataVariant.is_selected == True
        ).first()
        if not selected_metadata:
            missing_assets.append('Metadata')
        else:
            manifest_payload["assets"]["Metadata"] = {
                "title": selected_metadata.title,
                "description": selected_metadata.description,
                "tags": selected_metadata.tags,
                "variant_id": selected_metadata.id
            }

    # Validate Thumbnail mapping
    if 'Thumbnail' in REQUIRED_ASSET_TYPES:
        selected_thumbnail = db.query(GenerationAsset).filter(
            GenerationAsset.package_generation_id == generation.id,
            GenerationAsset.asset_type == 'thumbnail',
            GenerationAsset.is_selected == True
        ).first()
        if not selected_thumbnail:
            missing_assets.append('Thumbnail')
        else:
            manifest_payload["assets"]["Thumbnail"] = {
                "file_path": selected_thumbnail.file_path,
                "asset_id": selected_thumbnail.id
            }

    if missing_assets:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot assemble package. Missing mapped production assets: {', '.join(missing_assets)}"
        )
        
    # 4. Compile Output (manifest.json)
    if existing_package.video_path:
        base_dir = os.path.dirname(existing_package.video_path)
    else:
        # Fallback if no video path (should not happen based on package creation rules)
        channel = channel_service.get_channel(db, existing_package.channel_id)
        base_dir = os.path.join(settings.DATA_PATH, "channels", channel.slug, "packages", existing_package.package_number)
        os.makedirs(base_dir, exist_ok=True)

    manifest_path = os.path.join(base_dir, "manifest.json")
    try:
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_payload, f, indent=4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write Assembly manifest: {str(e)}")
        
    # 5. Set ContentPackage.status = "assembled"
    updated_package = update_package_status(db, package_id, "assembled")
    
    # 6. Emit audit event
    logger.info(f"[AUDIT] package_assembled: Package {package_id}, Channel {existing_package.channel_id}")
    
    return updated_package
