from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database.database import get_db
from api.schemas import MetadataLibraryResponse, MetadataVariantResponse
from repositories import metadata_library_repository as lib_repo
from services import metadata_library_service as lib_service

router = APIRouter(prefix="/api/metadata-library", tags=["metadata_library"])

@router.get("", response_model=List[MetadataLibraryResponse])
def list_library_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search_query: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return lib_repo.get_library_items(db, skip=skip, limit=limit, search_query=search_query, category=category)

@router.get("/{item_id}", response_model=MetadataLibraryResponse)
def get_library_item(item_id: str, db: Session = Depends(get_db)):
    item = lib_repo.get_library_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Library item not found")
    return item

class PublishRequest(BaseModel):
    category: Optional[str] = None
    tags: Optional[str] = None

@router.post("/publish/{variant_id}", response_model=MetadataLibraryResponse)
def publish_to_library(
    variant_id: str,
    request: PublishRequest,
    db: Session = Depends(get_db)
):
    """
    Publishes a selected MetadataVariant to the Global Metadata Library.
    """
    return lib_service.publish_variant_to_library(db, variant_id, request.category, request.tags)

@router.post("/{item_id}/clone/{package_generation_id}", response_model=MetadataVariantResponse)
def clone_library_item(
    item_id: str,
    package_generation_id: str,
    db: Session = Depends(get_db)
):
    """
    Clones an item from the Global Metadata Library to create a working MetadataVariant 
    for a specific package generation.
    """
    return lib_service.clone_library_item_to_variant(db, package_generation_id, item_id)

@router.delete("/{item_id}")
def delete_library_item(item_id: str, db: Session = Depends(get_db)):
    success = lib_repo.delete_library_item(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Library item not found")
    return {"message": "Library item deleted successfully"}
