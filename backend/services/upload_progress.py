import os
import json
import logging

logger = logging.getLogger(__name__)

LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")

def get_progress_file_path(job_id: str) -> str:
    return os.path.join(LOGS_DIR, f"progress_{job_id}.json")

def update_progress(job_id: str, progress: int, status: str, error_message: str = None):
    """Writes/updates progress status for a specific upload job in a JSON file."""
    try:
        os.makedirs(LOGS_DIR, exist_ok=True)
        file_path = get_progress_file_path(job_id)
        
        data = {
            "progress": progress,
            "status": status,
            "error_message": error_message
        }
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f)
            
    except Exception as e:
        logger.error(f"Failed to write upload progress for job {job_id}: {e}")

def get_progress(job_id: str) -> dict:
    """Reads progress status for a specific upload job from its JSON file."""
    file_path = get_progress_file_path(job_id)
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read upload progress for job {job_id}: {e}")
            
    return {"progress": None, "status": None, "error_message": None}

def clear_progress(job_id: str):
    """Removes the progress JSON file for a job when it completes or fails."""
    file_path = get_progress_file_path(job_id)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            logger.error(f"Failed to remove progress file for job {job_id}: {e}")
