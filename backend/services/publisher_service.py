from sqlalchemy.orm import Session
from fastapi import HTTPException
from repositories import job_repository
from services import job_service
from services import uploader

def run_once(db: Session, channel_id: str):
    """
    Publisher Foundation: Run Once (transition pending -> uploading).
    """
    # 1. Look for an active job first. Only one job can be uploading at a time.
    active_job = job_repository.get_active_job(db, channel_id)
    if active_job:
        raise HTTPException(status_code=400, detail="An upload job is already running.")

    # 2. Look for the next pending job
    pending_job = job_repository.get_next_pending_job(db, channel_id)
    
    if not pending_job:
        # Try to pull one from queue
        try:
            pending_job = job_service.create_job_from_queue(db, channel_id)
        except HTTPException as e:
            if e.status_code == 400: # Queue empty
                raise HTTPException(status_code=400, detail="Queue is empty and no pending jobs found.")
            raise e

    if not pending_job:
        raise HTTPException(status_code=400, detail="Could not find or create a pending job.")

    # 3. Transition to uploading
    updated_job = job_service.update_job_status(db, pending_job.id, "uploading")
    return {
        "message": "Job transitioned to uploading.",
        "job": updated_job
    }

def complete_job(db: Session, channel_id: str):
    """
    Publisher Foundation: Complete Job (transition uploading -> completed).
    """
    active_job = job_repository.get_active_job(db, channel_id)
    if not active_job:
        raise HTTPException(status_code=400, detail="No active upload job found to complete.")

    # In a real scenario, YouTube video ID/URL would be populated here.
    updated_job = job_service.update_job_status(db, active_job.id, "completed")
    return {
        "message": "Job transitioned to completed.",
        "job": updated_job
    }

def get_publisher_status(db: Session, channel_id: str):
    """
    Return status for the publisher module.
    """
    active_job = job_repository.get_active_job(db, channel_id)
    last_job = job_repository.get_last_executed_job(db, channel_id)
    
    return {
        "status": "Running" if active_job else "Idle",
        "active_job": active_job,
        "last_job": last_job
    }

def execute_upload(db: Session, channel_id: str):
    """
    Sprint 7: YouTube Execution MVP.

    Lifecycle:
      1. Find active uploading job (or transition pending -> uploading first).
      2. Execute uploader.upload_video().
      3. On success: persist youtube_video_id + youtube_video_url, transition -> completed.
         (job_service.update_job_status handles package -> published + queue removal)
      4. On failure: persist error_message, transition -> failed.
         (job_service.update_job_status handles package -> failed + queue removal)

    Does NOT modify run_once(), complete_job(), or any other publisher foundation behavior.
    """
    # Step 1: Find active uploading job
    active_job = job_repository.get_active_job(db, channel_id)

    if not active_job:
        # No active job — attempt to advance a pending job to uploading first
        pending_job = job_repository.get_next_pending_job(db, channel_id)
        if not pending_job:
            raise HTTPException(
                status_code=400,
                detail="No pending or uploading jobs found. Queue a package and call run-once first."
            )
        # Transition pending -> uploading
        job_service.update_job_status(db, pending_job.id, "uploading")
        db.expire_all()
        active_job = job_repository.get_active_job(db, channel_id)

    if not active_job:
        raise HTTPException(
            status_code=500,
            detail="Failed to locate active upload job after transition."
        )

    # Step 2: Execute upload
    try:
        result = uploader.upload_video(db, active_job)
    except HTTPException as e:
        # Propagate explicit HTTP errors (file not found, OAuth failure)
        # but also mark the job as failed so the lifecycle stays consistent
        job_service.update_job_status(
            db, active_job.id, "failed",
            error_message=e.detail
        )
        raise e
    except Exception as e:
        job_service.update_job_status(
            db, active_job.id, "failed",
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Unexpected upload error: {str(e)}")

    # Step 3: Persist result and complete
    job_service.update_job_status(
        db,
        active_job.id,
        "completed",
        youtube_video_id=result["video_id"],
        youtube_video_url=result["video_url"]
    )

    return {
        "message": "Upload completed successfully.",
        "video_id": result["video_id"],
        "video_url": result["video_url"],
        "title": result["title"],
        "job_id": active_job.id
    }
