import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from cryptography.fernet import Fernet
import google_auth_oauthlib.flow

from app.config import settings
from repositories import oauth_repository, gcp_profile_repository
from services import channel_service

# Initialize Fernet
try:
    fernet = Fernet(settings.ENCRYPTION_KEY.encode())
except Exception as e:
    fernet = None

def encrypt_token(token: str) -> str:
    if not fernet or not token:
        return token
    return fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    if not fernet or not encrypted_token:
        return encrypted_token
    try:
        return fernet.decrypt(encrypted_token.encode()).decode()
    except Exception:
        return encrypted_token

def get_client_config(client_id: str, client_secret: str, project_id: str):
    return {
        "web": {
            "client_id": client_id,
            "project_id": project_id,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": client_secret,
            "redirect_uris": [settings.OAUTH_REDIRECT_URI]
        }
    }

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube"
]

def generate_auth_url(db: Session, channel_id: str) -> str:
    channel = channel_service.get_channel(db, channel_id)
    if not channel.gcp_profile_id:
        raise HTTPException(status_code=400, detail="Channel does not have a GCP profile assigned")
    
    gcp_profile = gcp_profile_repository.get_profile(db, channel.gcp_profile_id)
    if not gcp_profile:
        raise HTTPException(status_code=404, detail="Assigned GCP profile not found")

    client_config = get_client_config(
        gcp_profile.client_id, gcp_profile.client_secret, gcp_profile.project_id or ""
    )

    flow = google_auth_oauthlib.flow.Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=settings.OAUTH_REDIRECT_URI
    )
    
    # We pass channel_id as state so we know which channel this is for in the callback
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=channel_id
    )
    return auth_url

def handle_callback(db: Session, state: str, code: str):
    channel_id = state
    channel = channel_service.get_channel(db, channel_id)
    if not channel.gcp_profile_id:
        raise HTTPException(status_code=400, detail="Channel does not have a GCP profile assigned")
        
    gcp_profile = gcp_profile_repository.get_profile(db, channel.gcp_profile_id)
    
    client_config = get_client_config(
        gcp_profile.client_id, gcp_profile.client_secret, gcp_profile.project_id or ""
    )
    
    flow = google_auth_oauthlib.flow.Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=settings.OAUTH_REDIRECT_URI
    )
    
    try:
        flow.fetch_token(code=code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch token: {str(e)}")
        
    credentials = flow.credentials
    
    token_data = {
        "id": str(uuid.uuid4()),
        "channel_id": channel_id,
        "access_token": credentials.token,
        "refresh_token": encrypt_token(credentials.refresh_token) if credentials.refresh_token else None,
        "expires_at": credentials.expiry.replace(tzinfo=timezone.utc) if credentials.expiry else None
    }
    
    return oauth_repository.create_or_update_token(db, token_data)

def disconnect_oauth(db: Session, channel_id: str):
    token = oauth_repository.get_token_by_channel(db, channel_id)
    if token:
        db.delete(token)
        db.commit()
        return True
    return False
