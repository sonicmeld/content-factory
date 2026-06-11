import os
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException
from api.schemas import UploadJobCreate
from database.models import UploadJob
from repositories import upload_repository
from services import channel_service
from app.config import settings

def create_upload_job(db: Session, job_in: UploadJobCreate) -> UploadJob:
    channel = channel_service.get_channel(db, job_in.channel_id)
    
    # Validate file exists
    base_dir = os.path.join(settings.DATA_PATH, "channels", channel.slug, "uploads", "pending")
    full_video_path = os.path.join(base_dir, job_in.video_path)
    
    if not os.path.exists(full_video_path):
        raise HTTPException(status_code=400, detail=f"Video file not found at: {full_video_path}")
        
    job_id = str(uuid.uuid4())
    db_job = UploadJob(
        id=job_id,
        status="pending",
        **job_in.model_dump()
    )
    return upload_repository.create_job(db, db_job)

def get_jobs(db: Session, channel_id: str = None, status: str = None, skip: int = 0, limit: int = 100):
    jobs = upload_repository.get_jobs(db, channel_id, status, skip, limit)
    from services.upload_progress import get_progress
    for job in jobs:
        progress_info = get_progress(job.id)
        job.progress = progress_info.get("progress")
    return jobs

def get_job(db: Session, job_id: str) -> UploadJob:
    job = upload_repository.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Upload job not found")
    from services.upload_progress import get_progress
    progress_info = get_progress(job.id)
    job.progress = progress_info.get("progress")
    return job

def update_status(db: Session, job_id: str, status: str) -> UploadJob:
    job = get_job(db, job_id)
    return upload_repository.update_job(db, job, {"status": status})

def retry_job(db: Session, job_id: str) -> UploadJob:
    job = get_job(db, job_id)
    return upload_repository.update_job(db, job, {
        "status": "pending",
        "retry_count": 0,
        "error_message": None
    })

def delete_job(db: Session, job_id: str):
    job = get_job(db, job_id)
    upload_repository.delete_job(db, job)
