from sqlalchemy.orm import Session
from typing import List, Optional
from database.models import MetadataVariant

def create(db: Session, variant_data: dict) -> MetadataVariant:
    """Create a new MetadataVariant record."""
    db_variant = MetadataVariant(**variant_data)
    db.add(db_variant)
    db.commit()
    db.refresh(db_variant)
    return db_variant

def get_by_id(db: Session, variant_id: str) -> Optional[MetadataVariant]:
    """Retrieve a MetadataVariant record by its primary key."""
    return db.query(MetadataVariant).filter(MetadataVariant.id == variant_id).first()

def get_by_generation_id(db: Session, package_generation_id: str) -> List[MetadataVariant]:
    """Retrieve all variants for a given package generation."""
    return (
        db.query(MetadataVariant)
        .filter(MetadataVariant.package_generation_id == package_generation_id)
        .order_by(MetadataVariant.created_at.desc())
        .all()
    )

def get_selected_by_generation_id(db: Session, package_generation_id: str) -> Optional[MetadataVariant]:
    """Retrieve the currently selected variant for a package generation."""
    return (
        db.query(MetadataVariant)
        .filter(
            MetadataVariant.package_generation_id == package_generation_id,
            MetadataVariant.is_selected == 1
        )
        .first()
    )

def set_selected(db: Session, package_generation_id: str, variant_id: str):
    """Set the target variant as selected and unselect all others for the package generation."""
    # Unselect all
    db.query(MetadataVariant).filter(
        MetadataVariant.package_generation_id == package_generation_id
    ).update({"is_selected": 0})
    
    # Select target
    db.query(MetadataVariant).filter(
        MetadataVariant.id == variant_id
    ).update({"is_selected": 1})
    
    db.commit()

def delete(db: Session, variant_id: str) -> bool:
    """Delete a variant by its id."""
    variant = get_by_id(db, variant_id)
    if variant:
        db.delete(variant)
        db.commit()
        return True
    return False
