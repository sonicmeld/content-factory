from sqlalchemy.orm import Session
from typing import List, Optional
from repositories import generation_combo_repository

VALID_CATEGORIES = {"metadata", "thumbnail", "footage"}
VALID_ENDPOINT_TYPES = {"chat", "image"}

def _validate_combo_rules(category: str, endpoint_type: str):
    if category not in VALID_CATEGORIES:
        raise ValueError(f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}")
        
    if endpoint_type not in VALID_ENDPOINT_TYPES:
        raise ValueError(f"Invalid endpoint_type. Must be one of: {', '.join(VALID_ENDPOINT_TYPES)}")
        
    if category == "metadata" and endpoint_type != "chat":
        raise ValueError("Metadata combo must use 'chat' endpoint_type")
        
    if category == "thumbnail" and endpoint_type != "image":
        raise ValueError("Thumbnail combo must use 'image' endpoint_type")
        
    if category == "footage" and endpoint_type != "image":
        raise ValueError("Footage combo must use 'image' endpoint_type")

def get_all(db: Session, category: Optional[str] = None):
    return generation_combo_repository.get_all(db, category=category)

def get_by_id(db: Session, combo_id: str):
    return generation_combo_repository.get_by_id(db, combo_id)

def create(db: Session, combo_data: dict):
    _validate_combo_rules(combo_data.get("category"), combo_data.get("endpoint_type"))
    return generation_combo_repository.create(db, combo_data)

def update(db: Session, combo_id: str, updates: dict):
    existing = get_by_id(db, combo_id)
    if not existing:
        return None
        
    cat = updates.get("category", existing.category)
    ept = updates.get("endpoint_type", existing.endpoint_type)
    
    _validate_combo_rules(cat, ept)
    
    return generation_combo_repository.update(db, combo_id, updates)

def delete(db: Session, combo_id: str) -> bool:
    return generation_combo_repository.delete(db, combo_id)
