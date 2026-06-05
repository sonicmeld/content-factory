import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException
from api.schemas import GCPProfileCreate, GCPProfileUpdate
from database.models import GCPProfile
from repositories import gcp_profile_repository

def create_profile(db: Session, profile_in: GCPProfileCreate) -> GCPProfile:
    profile_id = str(uuid.uuid4())
    db_profile = GCPProfile(
        id=profile_id,
        **profile_in.model_dump()
    )
    return gcp_profile_repository.create_profile(db, db_profile)

def get_profiles(db: Session, skip: int = 0, limit: int = 100):
    return gcp_profile_repository.get_profiles(db, skip, limit)

def get_profile(db: Session, profile_id: str) -> GCPProfile:
    profile = gcp_profile_repository.get_profile(db, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="GCP Profile not found")
    return profile

def update_profile(db: Session, profile_id: str, profile_in: GCPProfileUpdate) -> GCPProfile:
    profile = get_profile(db, profile_id)
    updates = profile_in.model_dump(exclude_unset=True)
    return gcp_profile_repository.update_profile(db, profile, updates)

def delete_profile(db: Session, profile_id: str):
    profile = get_profile(db, profile_id)
    gcp_profile_repository.delete_profile(db, profile)
