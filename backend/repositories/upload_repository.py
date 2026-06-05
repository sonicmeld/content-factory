from sqlalchemy.orm import Session
from database.models import UploadJob

def get_jobs(db: Session, channel_id: str = None, status: str = None, skip: int = 0, limit: int = 100):
    query = db.query(UploadJob)
    if channel_id:
        query = query.filter(UploadJob.channel_id == channel_id)
    if status:
        query = query.filter(UploadJob.status == status)
    return query.offset(skip).limit(limit).all()

def get_job(db: Session, job_id: str):
    return db.query(UploadJob).filter(UploadJob.id == job_id).first()

def create_job(db: Session, job: UploadJob):
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

def update_job(db: Session, job: UploadJob, updates: dict):
    for key, value in updates.items():
        setattr(job, key, value)
    db.commit()
    db.refresh(job)
    return job
