import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.database import get_db
from database.models import SystemSetting, GenerationModel
from api.schemas import (
    SystemSettingsResponse,
    SystemSettingsUpdate,
    GenerationModelResponse,
    GenerationModelCreate
)

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("", response_model=SystemSettingsResponse)
def get_system_settings(db: Session = Depends(get_db)):
    endpoint = db.query(SystemSetting).filter(SystemSetting.key == "single_model_endpoint").first()
    api_key = db.query(SystemSetting).filter(SystemSetting.key == "single_model_api_key").first()
    
    return {
        "single_model_endpoint": endpoint.value if endpoint else "http://localhost:20128/v1/images/generations",
        "single_model_api_key": api_key.value if api_key else ""
    }

@router.post("", response_model=SystemSettingsResponse)
def update_system_settings(req: SystemSettingsUpdate, db: Session = Depends(get_db)):
    endpoint = db.query(SystemSetting).filter(SystemSetting.key == "single_model_endpoint").first()
    if not endpoint:
        endpoint = SystemSetting(key="single_model_endpoint")
        db.add(endpoint)
    endpoint.value = req.single_model_endpoint
    
    api_key = db.query(SystemSetting).filter(SystemSetting.key == "single_model_api_key").first()
    if not api_key:
        api_key = SystemSetting(key="single_model_api_key")
        db.add(api_key)
    api_key.value = req.single_model_api_key
    
    db.commit()
    return {
        "single_model_endpoint": endpoint.value,
        "single_model_api_key": api_key.value
    }

@router.get("/models", response_model=List[GenerationModelResponse])
def get_generation_models(db: Session = Depends(get_db)):
    return db.query(GenerationModel).filter(GenerationModel.is_active == 1).all()

@router.post("/models", response_model=GenerationModelResponse)
def create_generation_model(req: GenerationModelCreate, db: Session = Depends(get_db)):
    # Check if model already exists
    existing = db.query(GenerationModel).filter(GenerationModel.name == req.name, GenerationModel.is_active == 1).first()
    if existing:
        raise HTTPException(status_code=400, detail="Model already exists")
        
    new_model = GenerationModel(
        id=str(uuid.uuid4()),
        name=req.name,
        is_active=1
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model

@router.delete("/models/{id}")
def delete_generation_model(id: str, db: Session = Depends(get_db)):
    model = db.query(GenerationModel).filter(GenerationModel.id == id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
        
    model.is_active = 0
    db.commit()
    return {"message": "Model deleted successfully"}
