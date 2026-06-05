import os
import shutil
from datetime import datetime, timezone
from database.database import SessionLocal
from workers.logger_setup import scheduler_logger
from repositories import upload_repository
from database.models import UploadJob

def process_upload_queue():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        # Compare without timezone if sqlite doesn't support it, but models uses naive DateTime by default
        jobs = db.query(UploadJob).filter(
            UploadJob.status == "pending",
            UploadJob.scheduled_at <= datetime.utcnow()
        ).all()
        
        if jobs:
            scheduler_logger.info(f"Found {len(jobs)} pending jobs to process.")
            
        for job in jobs:
            base_dir = os.path.dirname(job.video_path)
            if "pending" in base_dir:
                new_path = job.video_path.replace("pending", "scheduled")
                os.makedirs(os.path.dirname(new_path), exist_ok=True)
                try:
                    if os.path.exists(job.video_path):
                        shutil.move(job.video_path, new_path)
                        upload_repository.update_job(db, job, {"video_path": new_path, "status": "scheduled"})
                except Exception as e:
                    scheduler_logger.error(f"Failed to move file for job {job.id}: {e}")
                    continue
    finally:
        db.close()
