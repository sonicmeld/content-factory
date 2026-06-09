from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import uuid

from database.models import GenerationCombo, Channel

def get_all(db: Session, category: Optional[str] = None) -> List[GenerationCombo]:
    query = db.query(GenerationCombo)
    if category:
        query = query.filter(GenerationCombo.category == category)
    return query.all()

def get_by_id(db: Session, combo_id: str) -> Optional[GenerationCombo]:
    return db.query(GenerationCombo).filter(GenerationCombo.id == combo_id).first()

def get_by_name(db: Session, name: str) -> Optional[GenerationCombo]:
    return db.query(GenerationCombo).filter(GenerationCombo.name == name).first()

def create(db: Session, combo_data: dict) -> GenerationCombo:
    if "id" not in combo_data:
        combo_data["id"] = str(uuid.uuid4())
    db_combo = GenerationCombo(**combo_data)
    try:
        db.add(db_combo)
        db.commit()
        db.refresh(db_combo)
        return db_combo
    except IntegrityError as e:
        db.rollback()
        raise ValueError("A combo with this name already exists") from e

def update(db: Session, combo_id: str, updates: dict) -> Optional[GenerationCombo]:
    db_combo = get_by_id(db, combo_id)
    if not db_combo:
        return None
    
    for key, value in updates.items():
        if hasattr(db_combo, key):
            setattr(db_combo, key, value)
            
    try:
        db.commit()
        db.refresh(db_combo)
        return db_combo
    except IntegrityError as e:
        db.rollback()
        raise ValueError("A combo with this name already exists") from e

def delete(db: Session, combo_id: str) -> bool:
    db_combo = get_by_id(db, combo_id)
    if not db_combo:
        return False
        
    # Check if used by any channel
    used_in_metadata = db.query(Channel).filter(Channel.metadata_combo == db_combo.name).first()
    used_in_thumbnail = db.query(Channel).filter(Channel.thumbnail_combo == db_combo.name).first()
    used_in_footage = db.query(Channel).filter(Channel.footage_combo == db_combo.name).first()
    
    if used_in_metadata or used_in_thumbnail or used_in_footage:
        raise ValueError("Combo is currently assigned to one or more channels. Deactivate it instead.")
        
    db.delete(db_combo)
    db.commit()
    return True
