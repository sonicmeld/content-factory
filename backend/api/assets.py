from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database.database import get_db
from api.schemas import AssetResponse
from services import asset_service

router = APIRouter(prefix="/api/assets", tags=["assets"])

@router.post("/shared", response_model=AssetResponse)
async def upload_shared_asset(
    asset_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return await asset_service.upload_asset(db, file, "shared", asset_type)

@router.get("/shared", response_model=List[AssetResponse])
def get_shared_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return asset_service.get_assets(db, channel_id="shared", asset_type=None, skip=skip, limit=limit)

@router.post("", response_model=AssetResponse)
async def upload_channel_asset(
    channel_id: str = Form(...),
    asset_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return await asset_service.upload_asset(db, file, channel_id, asset_type)

@router.get("", response_model=List[AssetResponse])
def get_channel_assets(
    channel_id: Optional[str] = None,
    asset_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return asset_service.get_assets(db, channel_id=channel_id, asset_type=asset_type, skip=skip, limit=limit)

@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: str, db: Session = Depends(get_db)):
    return asset_service.get_asset(db, asset_id)

@router.delete("/{asset_id}")
def delete_asset(asset_id: str, db: Session = Depends(get_db)):
    asset_service.delete_asset(db, asset_id)
    return {"message": "Asset deleted successfully"}
