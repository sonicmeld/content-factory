from sqlalchemy.orm import Session
from database.models import GCPProfile

def get_profiles(db: Session, skip: int = 0, limit: int = 100):
    return db.query(GCPProfile).offset(skip).limit(limit).all()

def get_profile(db: Session, profile_id: str):
    return db.query(GCPProfile).filter(GCPProfile.id == profile_id).first()

def create_profile(db: Session, profile: GCPProfile):
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

def update_profile(db: Session, profile: GCPProfile, updates: dict):
    for key, value in updates.items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile

def delete_profile(db: Session, profile: GCPProfile):
    db.delete(profile)
    db.commit()
