import os
import time
from app.config import settings
from workers.logger_setup import scheduler_logger

def cleanup_temp_files():
    temp_dir = os.path.join(settings.DATA_PATH, "temp")
    if not os.path.exists(temp_dir):
        return
        
    now = time.time()
    cutoff = now - (24 * 3600)
    
    count = 0
    for root, dirs, files in os.walk(temp_dir):
        for file in files:
            filepath = os.path.join(root, file)
            try:
                if os.path.getmtime(filepath) < cutoff:
                    os.remove(filepath)
                    count += 1
            except Exception as e:
                scheduler_logger.error(f"Failed to delete temp file {filepath}: {e}")
                
    if count > 0:
        scheduler_logger.info(f"Cleaned up {count} old temp files.")
