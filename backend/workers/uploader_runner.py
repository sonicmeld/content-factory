import time
import os
import shutil
from database.database import SessionLocal
from database.models import UploadJob
from workers.uploader import upload_to_youtube
from repositories import upload_repository
from workers.logger_setup import upload_logger

def process_uploads():
    db = SessionLocal()
    try:
        # Find all scheduled jobs
        jobs = db.query(UploadJob).filter(UploadJob.status == "scheduled").all()
        
        for job in jobs:
            upload_logger.info(f"Picked up scheduled job {job.id}")
            upload_to_youtube(db, job.id)
            
            db.refresh(job)
            final_dir = "published" if job.status == "published" else "failed"
            if job.status in ["published", "failed"]:
                if "scheduled" in job.video_path:
                    final_path = job.video_path.replace("scheduled", final_dir)
                else:
                    final_path = job.video_path.replace("pending", final_dir)
                    
                os.makedirs(os.path.dirname(final_path), exist_ok=True)
                try:
                    if os.path.exists(job.video_path):
                        shutil.move(job.video_path, final_path)
                        upload_repository.update_job(db, job, {"video_path": final_path})
                except Exception as e:
                    upload_logger.error(f"Failed to move finalized file for job {job.id}: {e}")
                    
    finally:
        db.close()

def run_uploader():
    upload_logger.info("Starting standalone Uploader Worker...")
    while True:
        process_uploads()
        time.sleep(10)

if __name__ == "__main__":
    run_uploader()
