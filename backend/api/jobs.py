from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
from pydantic import BaseModel
from typing import Optional

from database.database import get_db
from services import job_service

router = APIRouter(prefix="/api/channels/{channel_id}/jobs", tags=["jobs"])

class JobStatusUpdate(BaseModel):
    status: str
    error_message: Optional[str] = None
    youtube_video_id: Optional[str] = None
    youtube_video_url: Optional[str] = None

@router.post("/from-queue")
def create_job_from_queue(channel_id: str, db: Session = Depends(get_db)):
    """
    Triggers creation of an Upload Job from the top of the queue for the given channel.
    This simulates the Publisher pulling the next item.
    """
    job = job_service.create_job_from_queue(db, channel_id)
    return {"message": "Job created successfully", "job_id": job.id}

@router.put("/{job_id}/status")
def update_job_status(channel_id: str, job_id: str, payload: JobStatusUpdate, db: Session = Depends(get_db)):
    """
    Updates the status of a job and automatically syncs the package status.
    """
    job = job_service.update_job_status(
        db, 
        job_id, 
        payload.status, 
        error_message=payload.error_message,
        youtube_video_id=payload.youtube_video_id,
        youtube_video_url=payload.youtube_video_url
    )
    return {"message": "Job status updated", "job_id": job.id, "status": job.status}

@router.get("/stats")
def get_job_stats(channel_id: str, db: Session = Depends(get_db)):
    """
    Get job statistics for the dashboard
    """
    return job_service.get_job_stats(db, channel_id)
