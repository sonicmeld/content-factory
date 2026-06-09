from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database.database import get_db
from api.schemas import GenerationAssetResponse
from services import asset_engine_service

router = APIRouter(prefix="/api/packages", tags=["generation_assets"])

@router.get("/{package_id}/assets", response_model=List[GenerationAssetResponse])
def get_package_assets(package_id: str, db: Session = Depends(get_db)):
    """Fetch all generated assets for a specific package generation."""
    return asset_engine_service.get_generation_assets(db, package_id)

@router.get("/{package_id}/assets/{asset_type}", response_model=List[GenerationAssetResponse])
def get_package_assets_by_type(package_id: str, asset_type: str, db: Session = Depends(get_db)):
    """Fetch assets of a specific type for a package generation."""
    return asset_engine_service.get_generation_assets_by_type(db, package_id, asset_type)

@router.post("/{package_id}/assets/{asset_id}/select", response_model=GenerationAssetResponse)
def select_generation_asset(package_id: str, asset_id: str, db: Session = Depends(get_db)):
    """Select an asset variant and promote it to the active package generation if applicable."""
    return asset_engine_service.select_asset_variant(db, package_id, asset_id)

asset_router = APIRouter(prefix="/api/assets", tags=["generation_assets"])

@asset_router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_generation_asset(asset_id: str, db: Session = Depends(get_db)):
    """Delete a generation asset record and its physical file."""
    success = asset_engine_service.delete_asset(db, asset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Asset not found")
    return None
