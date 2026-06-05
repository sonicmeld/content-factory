from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.database import get_db
from api.schemas import GCPProfileCreate, GCPProfileUpdate, GCPProfileResponse
from services import gcp_profile_service

router = APIRouter(prefix="/api/gcp-profiles", tags=["gcp_profiles"])

@router.post("", response_model=GCPProfileResponse)
def create_profile(profile_in: GCPProfileCreate, db: Session = Depends(get_db)):
    return gcp_profile_service.create_profile(db, profile_in)

@router.get("", response_model=List[GCPProfileResponse])
def get_profiles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return gcp_profile_service.get_profiles(db, skip=skip, limit=limit)

@router.get("/{profile_id}", response_model=GCPProfileResponse)
def get_profile(profile_id: str, db: Session = Depends(get_db)):
    return gcp_profile_service.get_profile(db, profile_id)

@router.put("/{profile_id}", response_model=GCPProfileResponse)
def update_profile(profile_id: str, profile_in: GCPProfileUpdate, db: Session = Depends(get_db)):
    return gcp_profile_service.update_profile(db, profile_id, profile_in)

@router.delete("/{profile_id}")
def delete_profile(profile_id: str, db: Session = Depends(get_db)):
    gcp_profile_service.delete_profile(db, profile_id)
    return {"message": "GCP Profile deleted successfully"}
