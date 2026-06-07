from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Optional
from database.models import UploadJob

def create_job(db: Session, job_data: dict) -> UploadJob:
    db_job = UploadJob(**job_data)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

def get_job(db: Session, job_id: str) -> Optional[UploadJob]:
    return db.query(UploadJob).filter(UploadJob.id == job_id).first()

def get_jobs_by_channel(db: Session, channel_id: str, skip: int = 0, limit: int = 100) -> List[UploadJob]:
    return db.query(UploadJob).filter(UploadJob.channel_id == channel_id).order_by(UploadJob.created_at.desc()).offset(skip).limit(limit).all()

def update_job(db: Session, job_id: str, updates: dict) -> Optional[UploadJob]:
    job = get_job(db, job_id)
    if job:
        for key, value in updates.items():
            setattr(job, key, value)
        db.commit()
        db.refresh(job)
    return job

def get_job_stats(db: Session, channel_id: str) -> Dict[str, int]:
    # Pending, uploading, completed, failed
    stats = {
        "pending": 0,
        "uploading": 0,
        "completed": 0,
        "failed": 0
    }
    
    results = db.query(UploadJob.status, func.count(UploadJob.id)).filter(
        UploadJob.channel_id == channel_id
    ).group_by(UploadJob.status).all()
    
    for status, count in results:
        if status in stats:
            stats[status] = count
            
    return stats
