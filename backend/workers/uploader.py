import os
from sqlalchemy.orm import Session
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials

from workers.logger_setup import upload_logger
from repositories import upload_repository, oauth_repository
from services.oauth_service import decrypt_token, get_client_config
from repositories.gcp_profile_repository import get_profile
from repositories.channel_repository import get_channel

YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"

def upload_to_youtube(db: Session, job_id: str):
    job = upload_repository.get_job(db, job_id)
    if not job:
        upload_logger.error(f"Job {job_id} not found.")
        return
        
    upload_repository.update_job(db, job, {"status": "uploading"})
    upload_logger.info(f"Starting upload for job {job_id}")

    try:
        channel = get_channel(db, job.channel_id)
        token = oauth_repository.get_token_by_channel(db, job.channel_id)
        if not token:
            raise Exception("OAuth token missing.")
            
        gcp_profile = get_profile(db, channel.gcp_profile_id)
        if not gcp_profile:
            raise Exception("GCP Profile missing.")
            
        client_config = get_client_config(gcp_profile.client_id, gcp_profile.client_secret, gcp_profile.project_id or "")
        
        credentials = Credentials(
            token=token.access_token,
            refresh_token=decrypt_token(token.refresh_token),
            token_uri=client_config['web']['token_uri'],
            client_id=client_config['web']['client_id'],
            client_secret=client_config['web']['client_secret']
        )
        
        youtube = build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION, credentials=credentials)
        
        body = {
            'snippet': {
                'title': job.title or "Untitled",
                'description': job.description or "",
                'categoryId': '22'
            },
            'status': {
                'privacyStatus': 'private'
            }
        }
        
        media = MediaFileUpload(job.video_path, chunksize=256*1024, resumable=True)
        
        request = youtube.videos().insert(
            part=",".join(body.keys()),
            body=body,
            media_body=media
        )
        
        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                upload_logger.info(f"Job {job_id}: Uploaded {int(status.progress() * 100)}%")
                
        upload_logger.info(f"Job {job_id} successfully published to YouTube! Video ID: {response.get('id')}")
        upload_repository.update_job(db, job, {"status": "published"})

    except Exception as e:
        upload_logger.error(f"Job {job_id} failed: {str(e)}")
        new_retry_count = job.retry_count + 1
        new_status = "failed" if new_retry_count >= 3 else "pending"
        upload_repository.update_job(db, job, {
            "status": new_status,
            "retry_count": new_retry_count,
            "error_message": str(e)
        })
