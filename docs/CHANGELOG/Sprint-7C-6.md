# Changelog — Sprint 7C-6: YouTube Upload Queue Progress Monitoring & Live Logs

## 1. Real-Time Upload Progress Monitoring
*   **File-Based Status Tracker (`backend/services/upload_progress.py`)**: Designed a zero-migration progress tracker storing active upload percentage (0-100%) and chunk details into isolated JSON logs (`logs/progress_{job_id}.json`). This prevents database transaction lock contention during rapid uploads.
*   **Loop Chunk Reporting**: Integrated progress logging into both manual upload routes (`uploader.py`) and background worker threads (`backend/workers/uploader.py`) using Google Media IoBaseUpload's next-chunk callbacks.
*   **Dynamic Schema Merging**: Expanded FastAPI schemas (`schemas.py`) and upload services to merge disk progress logs on-the-fly when resolving active jobs.
*   **Dynamic Frontend Progress Indicator**: Updated types, established a 3-second refetch interval (`refetchInterval: 3000`), and integrated active progress bars directly beneath filenames on the Dashboard and Upload Queue pages.

## 2. Live Upload Logs Terminal Panel
*   **Backend Logs API (`GET /api/uploads/logs`)**: Exposed a safe file reader retrieving the last 50 lines from the application's active `logs/upload.log`.
*   **Interactive Terminal Widget**: Refactored the Dashboard grid layout to incorporate a Linux-themed scrollable dark terminal panel.
*   **Real-time Tail Logging**: Log lines are auto-refetched every 3 seconds and displayed chronologically reversed (latest entries at the top) for immediate observation.
