import os
from sqlalchemy.orm import Session
from fastapi import HTTPException
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from database.models import UploadJob
from repositories import packages as package_repository
from services import oauth_service
from services.upload_progress import update_progress, clear_progress
from app.config import settings


def _resolve_title(job: UploadJob, package) -> str:
    """
    Title resolution priority:
    1. UploadJob.title (if set, not None, not empty, not 'TBD')
    2. Fallback: 'Package {package_number}'
    """
    title = job.title
    if not title or title.strip() == "" or title.strip().upper() == "TBD":
        if package:
            return f"Package {package.package_number}"
        return f"Package {job.package_id}"
    return title.strip()


def upload_video(db: Session, job: UploadJob) -> dict:
    """
    Upload a video to YouTube using the job's OAuth credentials.

    Returns:
        { "video_id": str, "video_url": str }

    Raises:
        HTTPException 400: Video file not found on disk.
        HTTPException 401: OAuth credentials invalid or missing.
        HTTPException 500: YouTube API upload failure.
    """
    # 1. Resolve video file path
    video_path = job.video_path
    if not os.path.isabs(video_path):
        # Relative path — resolve from DATA_PATH (legacy/test records)
        video_path = os.path.join(os.path.abspath(settings.DATA_PATH), video_path)

    if not os.path.exists(video_path):
        raise HTTPException(
            status_code=400,
            detail=f"Video file not found at path: {video_path}"
        )

    # 2. Load package for metadata
    package = None
    if job.package_id:
        package = package_repository.get_package(db, job.package_id)

    # 3. Resolve title
    title = _resolve_title(job, package)

    # 4. Get valid OAuth credentials (auto-refresh handled inside)
    credentials = oauth_service.get_valid_credentials(db, job.channel_id)

    # 5. Build YouTube API client
    try:
        youtube = build("youtube", "v3", credentials=credentials)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build YouTube API client: {str(e)}"
        )

    # 6. Load channel upload preferences
    from services.channel_upload_preferences import get_preferences
    pref = get_preferences(db, job.channel_id)

    # 7. Prepare video metadata
    body = {
        "snippet": {
            "title": title,
            "description": job.description or "",
            "categoryId": pref.category_id or "22"
        },
        "status": {
            "privacyStatus": pref.privacy_status or "private"
        }
    }

    if pref.default_language:
        body["snippet"]["defaultLanguage"] = pref.default_language

    if pref.default_tags:
        body["snippet"]["tags"] = pref.default_tags


    # 7.5 Apply publishing defaults scheduling
    from services.publishing_defaults_executor import apply_scheduling_defaults
    publish_at_str = apply_scheduling_defaults(db, job.channel_id, body)
    if publish_at_str:
        from datetime import datetime
        naive_dt = datetime.strptime(publish_at_str, "%Y-%m-%dT%H:%M:%SZ")
        job.scheduled_at = naive_dt
        db.commit()


    # 8. Upload via resumable upload
    media = MediaFileUpload(video_path, mimetype="video/mp4", resumable=True)

    try:
        request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media
        )

        response = None
        update_progress(job.id, 0, "uploading")
        while response is None:
            status, response = request.next_chunk()
            if status:
                progress_pct = int(status.progress() * 100)
                update_progress(job.id, progress_pct, "uploading")

        clear_progress(job.id)

    except Exception as e:
        clear_progress(job.id)
        raise HTTPException(
            status_code=500,
            detail=f"YouTube upload failed: {str(e)}"
        )

    # 9. Extract result
    video_id = response.get("id")
    if not video_id:
        raise HTTPException(
            status_code=500,
            detail="YouTube upload completed but no video ID was returned."
        )

    # 9.5 Post-upload: default playlist assignment (non-blocking)
    from services.publishing_defaults_executor import assign_playlist_defaults
    assign_playlist_defaults(db, job.channel_id, youtube, video_id)

    video_url = f"https://www.youtube.com/watch?v={video_id}"


    return {
        "video_id": video_id,
        "video_url": video_url,
        "title": title
    }
