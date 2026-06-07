import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException

from repositories import job_repository, queue_repository
from repositories import packages as package_repository
from database.models import UploadQueue, ContentPackage

def create_job_from_queue(db: Session, channel_id: str):
    # 1. Read top item from upload_queue
    # We get the item with the smallest queue_position
    queue_items = queue_repository.get_queue(db, channel_id)
    if not queue_items:
        raise HTTPException(status_code=400, detail="Queue is empty")
        
    top_item = queue_items[0]
    
    # 2. Read metadata from content_packages
    package = package_repository.get_package(db, top_item.package_id)
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
        
    # Check if a pending/uploading job already exists for this package
    # A simple way: check if status is already uploading
    # But per rules, package remains queued. Let's not prevent multiple jobs, but usually it shouldn't happen.
    
    # 3. Create upload_jobs record with status pending
    job_data = {
        "id": str(uuid.uuid4()),
        "channel_id": channel_id,
        "package_id": package.id,
        "video_path": package.video_path,
        "title": "TBD", # Might be templated later
        "description": "TBD",
        "thumbnail_path": "", # TBD
        "status": "pending"
    }
    
    job = job_repository.create_job(db, job_data)
    
    # 4. Package status remains `queued` at this stage.
    # No package status update here.
    
    return job

def update_job_status(db: Session, job_id: str, new_status: str, error_message: str = None, youtube_video_id: str = None, youtube_video_url: str = None):
    job = job_repository.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    valid_statuses = ["pending", "uploading", "completed", "failed"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    updates = {"status": new_status}
    if error_message is not None:
        updates["error_message"] = error_message
    if youtube_video_id is not None:
        updates["youtube_video_id"] = youtube_video_id
    if youtube_video_url is not None:
        updates["youtube_video_url"] = youtube_video_url
        
    updated_job = job_repository.update_job(db, job_id, updates)
    
    # Status Synchronization
    package = package_repository.get_package(db, job.package_id)
    if package:
        if new_status == "uploading":
            package_repository.update_package_status(db, package.id, "uploading")
        elif new_status == "failed":
            package_repository.update_package_status(db, package.id, "failed")
            # Remove from queue
            queue_repository.remove_from_queue(db, package.id)
        elif new_status == "completed":
            package_repository.update_package_status(db, package.id, "published")
            # Remove from queue
            queue_repository.remove_from_queue(db, package.id)
            
    return updated_job

def get_job_stats(db: Session, channel_id: str):
    return job_repository.get_job_stats(db, channel_id)
