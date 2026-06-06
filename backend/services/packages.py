from sqlalchemy.orm import Session
from fastapi import HTTPException
from api.schemas import ContentPackageCreate, ContentPackageUpdate
from repositories import packages as package_repo
from repositories import assets as asset_repo

def validate_package_assets(db: Session, channel_id: str, video_asset_id: str, timestamp_asset_id: str = None):
    # Verify video asset
    video_asset = asset_repo.get_asset(db, video_asset_id)
    if not video_asset:
        raise HTTPException(status_code=404, detail="Video asset not found")
    
    if video_asset.channel_id and video_asset.channel_id != channel_id:
        raise HTTPException(status_code=400, detail="Video asset does not belong to this channel or shared pool")

    # Verify timestamp asset if provided
    if timestamp_asset_id:
        timestamp_asset = asset_repo.get_asset(db, timestamp_asset_id)
        if not timestamp_asset:
            raise HTTPException(status_code=404, detail="Timestamp asset not found")
        
        if timestamp_asset.channel_id and timestamp_asset.channel_id != channel_id:
            raise HTTPException(status_code=400, detail="Timestamp asset does not belong to this channel or shared pool")

def create_content_package(db: Session, package: ContentPackageCreate):
    validate_package_assets(db, package.channel_id, package.video_asset_id, package.timestamp_asset_id)
    return package_repo.create_package(db, package)

def update_content_package(db: Session, package_id: str, package_update: ContentPackageUpdate):
    # If updating assets, we need to validate them again.
    # However, to validate we need the channel_id, which we get from the existing package.
    existing_package = package_repo.get_package(db, package_id)
    if not existing_package:
        raise HTTPException(status_code=404, detail="Content package not found")
        
    video_id = package_update.video_asset_id if package_update.video_asset_id is not None else existing_package.video_asset_id
    timestamp_id = package_update.timestamp_asset_id if package_update.timestamp_asset_id is not None else existing_package.timestamp_asset_id
    
    if package_update.video_asset_id is not None or package_update.timestamp_asset_id is not None:
        validate_package_assets(db, existing_package.channel_id, video_id, timestamp_id)
        
    updated_package = package_repo.update_package(db, package_id, package_update)
    return updated_package
