from sqlalchemy.orm import Session
from typing import List, Optional
from repositories import generation_combo_repository
from fastapi import HTTPException
import json

VALID_CATEGORIES = {"metadata", "thumbnail", "footage"}
VALID_ENDPOINT_TYPES = {"chat", "image"}

def _validate_combo_rules(category: str, endpoint_type: str, config_json: Optional[str] = None):
    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}")
        
    if endpoint_type not in VALID_ENDPOINT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid endpoint_type. Must be one of: {', '.join(VALID_ENDPOINT_TYPES)}")
        
    if (category == "metadata" and endpoint_type != "chat") or \
       (category == "thumbnail" and endpoint_type != "image") or \
       (category == "footage" and endpoint_type != "image"):
        raise HTTPException(status_code=400, detail="Invalid category and endpoint combination.")

    if config_json and config_json.strip():
        try:
            json.loads(config_json)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Config JSON is not valid JSON.")

def get_all(db: Session, category: Optional[str] = None):
    return generation_combo_repository.get_all(db, category=category)

def get_by_id(db: Session, combo_id: str):
    return generation_combo_repository.get_by_id(db, combo_id)

def create(db: Session, combo_data: dict):
    _validate_combo_rules(combo_data.get("category"), combo_data.get("endpoint_type"), combo_data.get("config_json"))
    return generation_combo_repository.create(db, combo_data)

def update(db: Session, combo_id: str, updates: dict):
    existing = get_by_id(db, combo_id)
    if not existing:
        return None
        
    cat = updates.get("category", existing.category)
    ept = updates.get("endpoint_type", existing.endpoint_type)
    cfg = updates.get("config_json", existing.config_json)
    
    _validate_combo_rules(cat, ept, cfg)
    
    return generation_combo_repository.update(db, combo_id, updates)

def delete(db: Session, combo_id: str) -> bool:
    return generation_combo_repository.delete(db, combo_id)
