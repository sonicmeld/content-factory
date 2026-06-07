from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.database import get_db
from services import publisher_service

router = APIRouter(prefix="/api/channels/{channel_id}/publisher", tags=["publisher"])

@router.post("/run-once")
def run_publisher_once(channel_id: str, db: Session = Depends(get_db)):
    """
    Manually triggers the Publisher to execute the next pending job.
    """
    return publisher_service.run_once(db, channel_id)

@router.post("/complete")
def complete_publisher_job(channel_id: str, db: Session = Depends(get_db)):
    """
    Manually completes the currently active uploading job (Simulation of upload finish).
    """
    return publisher_service.complete_job(db, channel_id)

@router.get("/status")
def get_publisher_status(channel_id: str, db: Session = Depends(get_db)):
    """
    Returns the Publisher module status.
    """
    return publisher_service.get_publisher_status(db, channel_id)

@router.post("/upload")
def execute_youtube_upload(channel_id: str, db: Session = Depends(get_db)):
    """
    Sprint 7: Execute YouTube upload for the current active (or next pending) job.

    Lifecycle:
      - Finds uploading job (or advances pending -> uploading automatically).
      - Calls uploader.upload_video() via execute_upload().
      - On success: persists youtube_video_id + youtube_video_url, job -> completed,
        package -> published, queue item removed.
      - On failure: job -> failed, package -> failed, queue item removed.
    """
    return publisher_service.execute_upload(db, channel_id)
