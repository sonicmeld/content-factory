import uuid
import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException

from repositories import metadata_library_repository as lib_repo
from repositories import metadata_variant_repository as variant_repo
from api.schemas import MetadataLibraryCreate

logger = logging.getLogger(__name__)

def publish_variant_to_library(db: Session, variant_id: str, category: str = None, tags: str = None):
    """
    Publishes a selected MetadataVariant to the Global Metadata Library.
    """
    variant = variant_repo.get_by_id(db, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Metadata variant not found")
        
    if not variant.is_selected:
        raise HTTPException(status_code=400, detail="Only selected variants can be published to the library")
        
    item_data = MetadataLibraryCreate(
        title=variant.title,
        description=variant.description,
        category=category,
        tags=tags,
        source_variant_id=variant.id
    )
    
    library_item = lib_repo.create_library_item(db, item_data)
    logger.info(f"[AUDIT] published_to_library: Variant {variant_id} -> Library Item {library_item.id}")
    
    return library_item

def clone_library_item_to_variant(db: Session, package_generation_id: str, library_item_id: str):
    """
    Clones an item from the Global Metadata Library to create a working MetadataVariant 
    for a specific package generation.
    """
    library_item = lib_repo.get_library_item(db, library_item_id)
    if not library_item:
        raise HTTPException(status_code=404, detail="Library item not found")
        
    if not library_item.is_active:
        raise HTTPException(status_code=400, detail="Cannot clone an inactive library item")
        
    # Create a new working variant
    variant_id = str(uuid.uuid4())
    from database.models import MetadataVariant
    new_variant = MetadataVariant(
        id=variant_id,
        package_generation_id=package_generation_id,
        title=library_item.title,
        description=library_item.description,
        source_combo="metadata_library",
        source_context=library_item_id, # Track which item was cloned
        is_selected=0 # Force user to review and select it manually
    )
    db.add(new_variant)
    db.commit()
    db.refresh(new_variant)
    
    logger.info(f"[AUDIT] cloned_from_library: Library Item {library_item_id} -> Variant {variant_id}")
    
    return new_variant
