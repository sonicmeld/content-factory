from sqlalchemy.orm import Session
from database.models import GenerationAsset
from typing import List, Optional
import uuid

def create_asset(db: Session, asset_in: dict) -> GenerationAsset:
    """Create a new GenerationAsset record."""
    asset_id = str(uuid.uuid4())
    db_asset = GenerationAsset(
        id=asset_id,
        **asset_in
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

def get_asset_by_id(db: Session, asset_id: str) -> Optional[GenerationAsset]:
    """Retrieve an asset by its ID."""
    return db.query(GenerationAsset).filter(GenerationAsset.id == asset_id).first()

def get_assets_by_generation(db: Session, package_generation_id: str) -> List[GenerationAsset]:
    """Fetch all assets for a specific generation run."""
    return db.query(GenerationAsset).filter(
        GenerationAsset.package_generation_id == package_generation_id
    ).order_by(GenerationAsset.created_at.desc()).all()

def get_assets_by_type(db: Session, package_generation_id: str, asset_type: str) -> List[GenerationAsset]:
    """Fetch all assets of a specific type for a generation run."""
    return db.query(GenerationAsset).filter(
        GenerationAsset.package_generation_id == package_generation_id,
        GenerationAsset.asset_type == asset_type
    ).order_by(GenerationAsset.created_at.desc()).all()

def update_asset_status(db: Session, asset_id: str, status: str) -> Optional[GenerationAsset]:
    """Update the status of an asset."""
    db_asset = get_asset_by_id(db, asset_id)
    if db_asset:
        db_asset.status = status
        db.commit()
        db.refresh(db_asset)
    return db_asset

def delete_asset(db: Session, asset_id: str) -> bool:
    """Delete an asset record."""
    db_asset = get_asset_by_id(db, asset_id)
    if db_asset:
        db.delete(db_asset)
        db.commit()
        return True
    return False

# Sprint 7A-7: Asset Variant Library
def set_selected(db: Session, package_generation_id: str, asset_type: str, asset_id: str):
    """Sets is_selected=1 for the specified asset, and is_selected=0 for all other assets of the same type in the generation."""
    # First set all to 0
    db.query(GenerationAsset).filter(
        GenerationAsset.package_generation_id == package_generation_id,
        GenerationAsset.asset_type == asset_type
    ).update({"is_selected": 0})
    
    # Set the chosen one to 1
    db.query(GenerationAsset).filter(
        GenerationAsset.id == asset_id,
        GenerationAsset.package_generation_id == package_generation_id,
        GenerationAsset.asset_type == asset_type
    ).update({"is_selected": 1})
    
    db.commit()
