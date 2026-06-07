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
