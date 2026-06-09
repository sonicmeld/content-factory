from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database.session import get_db
from api import schemas
from services import generation_combo_service

router = APIRouter(
    prefix="/api/generation-combos",
    tags=["Generation Combos"],
)

@router.get("", response_model=List[schemas.GenerationComboResponse])
def get_generation_combos(category: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return generation_combo_service.get_all(db, category=category)

@router.post("", response_model=schemas.GenerationComboResponse)
def create_generation_combo(combo: schemas.GenerationComboCreate, db: Session = Depends(get_db)):
    try:
        return generation_combo_service.create(db, combo.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{combo_id}", response_model=schemas.GenerationComboResponse)
def update_generation_combo(combo_id: str, combo: schemas.GenerationComboUpdate, db: Session = Depends(get_db)):
    try:
        updated = generation_combo_service.update(db, combo_id, combo.model_dump(exclude_unset=True))
        if not updated:
            raise HTTPException(status_code=404, detail="Combo not found")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{combo_id}")
def delete_generation_combo(combo_id: str, db: Session = Depends(get_db)):
    try:
        success = generation_combo_service.delete(db, combo_id)
        if not success:
            raise HTTPException(status_code=404, detail="Combo not found")
        return {"detail": "Combo deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
