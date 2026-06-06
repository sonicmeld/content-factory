from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database.database import get_db
from api.schemas import ContentPackageCreate, ContentPackageUpdate, ContentPackageResponse
from repositories import packages as package_repo
from services import packages as package_service

router = APIRouter(prefix="/packages", tags=["content_packages"])

@router.get("", response_model=List[ContentPackageResponse])
def list_packages(
    channel_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return package_repo.get_packages(db, channel_id=channel_id, status=status, skip=skip, limit=limit)

@router.get("/{package_id}", response_model=ContentPackageResponse)
def get_package(package_id: str, db: Session = Depends(get_db)):
    db_package = package_repo.get_package(db, package_id)
    if not db_package:
        raise HTTPException(status_code=404, detail="Content package not found")
    return db_package

@router.post("", response_model=ContentPackageResponse)
def create_package(package: ContentPackageCreate, db: Session = Depends(get_db)):
    return package_service.create_content_package(db, package)

@router.put("/{package_id}", response_model=ContentPackageResponse)
def update_package(package_id: str, package_update: ContentPackageUpdate, db: Session = Depends(get_db)):
    updated_package = package_service.update_content_package(db, package_id, package_update)
    if not updated_package:
        raise HTTPException(status_code=404, detail="Content package not found")
    return updated_package

@router.delete("/{package_id}")
def delete_package(package_id: str, db: Session = Depends(get_db)):
    success = package_repo.delete_package(db, package_id)
    if not success:
        raise HTTPException(status_code=404, detail="Content package not found")
    return {"message": "Content package deleted successfully"}
