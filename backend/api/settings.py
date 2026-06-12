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
    timeout = db.query(SystemSetting).filter(SystemSetting.key == "nine_router_timeout").first()
    max_tokens = db.query(SystemSetting).filter(SystemSetting.key == "nine_router_max_tokens").first()
    strip_json = db.query(SystemSetting).filter(SystemSetting.key == "nine_router_strip_json_mode").first()
    strip_penalties = db.query(SystemSetting).filter(SystemSetting.key == "nine_router_strip_penalties").first()
    convert_system = db.query(SystemSetting).filter(SystemSetting.key == "nine_router_convert_system_to_user").first()
    
    return {
        "single_model_endpoint": endpoint.value if endpoint else "http://localhost:20128/v1/images/generations",
        "single_model_api_key": api_key.value if api_key else "",
        "nine_router_timeout": int(timeout.value) if (timeout and timeout.value.isdigit()) else 60,
        "nine_router_max_tokens": int(max_tokens.value) if (max_tokens and max_tokens.value.isdigit()) else 4000,
        "nine_router_strip_json_mode": (strip_json.value == "1") if strip_json else True,
        "nine_router_strip_penalties": (strip_penalties.value == "1") if strip_penalties else True,
        "nine_router_convert_system_to_user": (convert_system.value == "1") if convert_system else False
    }

@router.post("", response_model=SystemSettingsResponse)
def update_system_settings(req: SystemSettingsUpdate, db: Session = Depends(get_db)):
    # Helper to set or create SystemSetting key-value
    def set_key_val(key_name: str, val: str):
        record = db.query(SystemSetting).filter(SystemSetting.key == key_name).first()
        if not record:
            record = SystemSetting(key=key_name)
            db.add(record)
        record.value = val
        return record

    endpoint = set_key_val("single_model_endpoint", req.single_model_endpoint)
    api_key = set_key_val("single_model_api_key", req.single_model_api_key)
    timeout = set_key_val("nine_router_timeout", str(req.nine_router_timeout))
    max_tokens = set_key_val("nine_router_max_tokens", str(req.nine_router_max_tokens))
    strip_json = set_key_val("nine_router_strip_json_mode", "1" if req.nine_router_strip_json_mode else "0")
    strip_penalties = set_key_val("nine_router_strip_penalties", "1" if req.nine_router_strip_penalties else "0")
    convert_system = set_key_val("nine_router_convert_system_to_user", "1" if req.nine_router_convert_system_to_user else "0")
    
    db.commit()
    
    return {
        "single_model_endpoint": endpoint.value,
        "single_model_api_key": api_key.value,
        "nine_router_timeout": int(timeout.value),
        "nine_router_max_tokens": int(max_tokens.value),
        "nine_router_strip_json_mode": (strip_json.value == "1"),
        "nine_router_strip_penalties": (strip_penalties.value == "1"),
        "nine_router_convert_system_to_user": (convert_system.value == "1")
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
