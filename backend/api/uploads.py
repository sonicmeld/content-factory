from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database.database import get_db
from api.schemas import UploadJobCreate, UploadJobResponse, UploadJobUpdateStatus
from services import upload_service

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

@router.post("", response_model=UploadJobResponse)
def create_upload_job(job_in: UploadJobCreate, db: Session = Depends(get_db)):
    return upload_service.create_upload_job(db, job_in)

@router.get("", response_model=List[UploadJobResponse])
def get_jobs(
    channel_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return upload_service.get_jobs(db, channel_id=channel_id, status=status, skip=skip, limit=limit)

@router.get("/{job_id}", response_model=UploadJobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    return upload_service.get_job(db, job_id)

@router.patch("/{job_id}/status", response_model=UploadJobResponse)
def update_status(job_id: str, payload: UploadJobUpdateStatus, db: Session = Depends(get_db)):
    return upload_service.update_status(db, job_id, payload.status)

@router.post("/{job_id}/retry", response_model=UploadJobResponse)
def retry_job(job_id: str, db: Session = Depends(get_db)):
    return upload_service.retry_job(db, job_id)
