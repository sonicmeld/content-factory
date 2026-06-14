import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from cryptography.fernet import Fernet
import google_auth_oauthlib.flow
import google.oauth2.credentials
import google.auth.transport.requests
from googleapiclient.discovery import build
from app.config import settings
from repositories import oauth_repository, gcp_profile_repository
from services import channel_service
from services import youtube_identity_service

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
    
    oauth_repository.create_or_update_token(db, token_data)

    # Sync YouTube Channel Identity
    google_account_email = None
    try:
        youtube = build("youtube", "v3", credentials=credentials)
        response = youtube.channels().list(part="snippet", mine=True).execute()
        
        if "items" in response and len(response["items"]) > 0:
            yt_channel = response["items"][0]
            channel.youtube_channel_id = yt_channel["id"]
            
            snippet = yt_channel.get("snippet", {})
            channel.youtube_channel_title = snippet.get("title")
            channel.youtube_handle = snippet.get("customUrl")
            
            # Form standard channel URL if not provided explicitly by the API
            channel.youtube_channel_url = f"https://youtube.com/channel/{channel.youtube_channel_id}"
            
            db.commit()
            db.refresh(channel)
    except Exception as e:
        print(f"Failed to sync YouTube channel identity: {e}")
    
    # Auto-register ke YouTube Identity Layer (SSOT)
    # Dilakukan setelah Channel identity di-sync agar youtube_channel_id tersedia.
    try:
        youtube_identity_service.register_from_channel(
            db=db,
            channel=channel,
            google_account_email=google_account_email,
        )
    except Exception as e:
        # Non-fatal: OAuth tetap sukses meskipun SSOT sync gagal
        print(f"[oauth_service] Warning: Failed to register YouTube Identity SSOT: {e}")
    
    return token_data

def disconnect_oauth(db: Session, channel_id: str):
    token = oauth_repository.get_token_by_channel(db, channel_id)
    if token:
        db.delete(token)
        db.commit()
        return True
    return False

def get_valid_credentials(db: Session, channel_id: str) -> google.oauth2.credentials.Credentials:
    """
    Single source of truth for building valid, auto-refreshing Google Credentials.

    Lifecycle:
    1. Load OAuth token record for this channel.
    2. Load the associated GCP profile (client_id, client_secret).
    3. Decrypt refresh_token.
    4. Construct google.oauth2.credentials.Credentials.
    5. If expired, perform automatic refresh using Google's token endpoint.
    6. Persist refreshed access_token and expires_at back to the database.
    7. Return usable credentials.

    Failure handling:
    - Missing token record          -> 401: Channel not authorized
    - Missing refresh_token         -> 401: Refresh token unavailable, re-auth required
    - Missing GCP profile           -> 400: GCP profile not configured
    - Refresh failure (revoked/bad) -> 401: Token refresh failed
    """
    # Step 1: Load token record
    token_record = oauth_repository.get_token_by_channel(db, channel_id)
    if not token_record:
        raise HTTPException(
            status_code=401,
            detail="Channel is not authorized. Please complete OAuth."
        )

    # Step 2: Load GCP profile for client credentials
    channel = channel_service.get_channel(db, channel_id)
    if not channel.gcp_profile_id:
        raise HTTPException(
            status_code=400,
            detail="Channel does not have a GCP profile assigned. Cannot build credentials."
        )

    gcp_profile = gcp_profile_repository.get_profile(db, channel.gcp_profile_id)
    if not gcp_profile:
        raise HTTPException(
            status_code=400,
            detail="Assigned GCP profile not found. Cannot build credentials."
        )

    # Step 3: Decrypt refresh_token
    raw_refresh_token = decrypt_token(token_record.refresh_token) if token_record.refresh_token else None
    if not raw_refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Refresh token is unavailable. Please re-authorize the channel via OAuth."
        )

    # Step 4: Construct Credentials object
    credentials = google.oauth2.credentials.Credentials(
        token=token_record.access_token,
        refresh_token=raw_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=gcp_profile.client_id,
        client_secret=gcp_profile.client_secret,
        scopes=SCOPES
    )

    # Override expiry from database if available
    if token_record.expires_at:
        credentials.expiry = token_record.expires_at.replace(tzinfo=None)

    # Step 5 & 6: Auto-refresh if expired
    if credentials.expired or not credentials.valid:
        try:
            request = google.auth.transport.requests.Request()
            credentials.refresh(request)
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail=f"Token refresh failed. The channel may need to re-authorize. Error: {str(e)}"
            )

        # Step 6: Persist refreshed token values back to database
        new_expires_at = credentials.expiry.replace(tzinfo=timezone.utc) if credentials.expiry else None
        oauth_repository.create_or_update_token(db, {
            "channel_id": channel_id,
            "access_token": credentials.token,
            "refresh_token": None,  # Intentionally None: repository will preserve existing
            "expires_at": new_expires_at
        })

    # Step 7: Return usable credentials
    return credentials
