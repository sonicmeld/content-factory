import time
from apscheduler.schedulers.background import BackgroundScheduler
from workers.scheduler import process_upload_queue
from workers.cleanup import cleanup_temp_files
from workers.logger_setup import scheduler_logger

def run_scheduler():
    scheduler_logger.info("Starting standalone APScheduler Worker...")
    
    # Run once at startup
    process_upload_queue()
    cleanup_temp_files()
    
    scheduler = BackgroundScheduler()
    scheduler.add_job(process_upload_queue, 'interval', seconds=60)
    scheduler.add_job(cleanup_temp_files, 'interval', hours=24)
    scheduler.start()
    
    try:
        while True:
            time.sleep(2)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()

if __name__ == "__main__":
    run_scheduler()
