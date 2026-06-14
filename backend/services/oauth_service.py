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
    
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=channel_id
    )
    return auth_url

def generate_identity_auth_url(db: Session, gcp_profile_id: str, workspace_id: str) -> str:
    """
    Generate OAuth URL directly for YouTube Identity (decoupled from channel).
    Passes state as identity|<gcp_profile_id>|<workspace_id>
    """
    gcp_profile = gcp_profile_repository.get_profile(db, gcp_profile_id)
    if not gcp_profile:
        raise HTTPException(status_code=404, detail="GCP profile not found")

    client_config = get_client_config(
        gcp_profile.client_id, gcp_profile.client_secret, gcp_profile.project_id or ""
    )

    flow = google_auth_oauthlib.flow.Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=settings.OAUTH_REDIRECT_URI
    )
    
    state = f"identity|{gcp_profile_id}|{workspace_id}"
    
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=state
    )
    return auth_url

def handle_callback(db: Session, state: str, code: str):
    is_identity_flow = state.startswith("identity|")
    
    if is_identity_flow:
        _, gcp_profile_id, workspace_id = state.split("|")
        gcp_profile = gcp_profile_repository.get_profile(db, gcp_profile_id)
        if not gcp_profile:
            raise HTTPException(status_code=400, detail="GCP profile not found for identity flow")
    else:
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
    
    # Sync YouTube Channel Identity from Google
    google_account_email = None
    yt_channel_id = None
    yt_title = "Unknown Channel"
    yt_handle = None
    yt_url = None
    
    try:
        youtube = build("youtube", "v3", credentials=credentials)
        response = youtube.channels().list(part="snippet", mine=True).execute()
        
        if "items" in response and len(response["items"]) > 0:
            yt_channel = response["items"][0]
            yt_channel_id = yt_channel["id"]
            
            snippet = yt_channel.get("snippet", {})
            yt_title = snippet.get("title")
            yt_handle = snippet.get("customUrl")
            yt_url = f"https://youtube.com/channel/{yt_channel_id}"
    except Exception as e:
        print(f"Failed to sync YouTube channel identity: {e}")
        
    if not yt_channel_id:
        raise HTTPException(status_code=400, detail="Could not retrieve YouTube Channel ID from the Google Account.")

    from database.models import YoutubeAccount, OAuthToken
    
    if is_identity_flow:
        # 1. Upsert YoutubeAccount directly
        account = db.query(YoutubeAccount).filter(YoutubeAccount.youtube_channel_id == yt_channel_id).first()
        if not account:
            account = YoutubeAccount(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                gcp_profile_id=gcp_profile_id,
                youtube_channel_id=yt_channel_id,
                youtube_channel_title=yt_title,
                youtube_handle=yt_handle,
                youtube_channel_url=yt_url,
                analytics_enabled=True,
            )
            db.add(account)
        else:
            account.youtube_channel_title = yt_title or account.youtube_channel_title
            account.youtube_handle = yt_handle or account.youtube_handle
            account.youtube_channel_url = yt_url or account.youtube_channel_url
            account.gcp_profile_id = gcp_profile_id
        
        db.commit()
        db.refresh(account)
        
        # 2. Upsert OAuthToken using youtube_account_id
        token = db.query(OAuthToken).filter(OAuthToken.youtube_account_id == account.id).first()
        if not token:
            token = OAuthToken(
                id=str(uuid.uuid4()),
                youtube_account_id=account.id,
                channel_id=None,
            )
            db.add(token)
            
        token.access_token = credentials.token
        if credentials.refresh_token:
            token.refresh_token = encrypt_token(credentials.refresh_token)
        if credentials.expiry:
            token.expires_at = credentials.expiry.replace(tzinfo=timezone.utc)
            
        db.commit()
        
        return {
            "id": token.id,
            "youtube_account_id": account.id,
            "access_token": token.access_token
        }
    else:
        # Legacy Channel Flow (non-destructive)
        channel.youtube_channel_id = yt_channel_id
        channel.youtube_channel_title = yt_title
        channel.youtube_handle = yt_handle
        channel.youtube_channel_url = yt_url
        db.commit()
        db.refresh(channel)
        
        token_data = {
            "id": str(uuid.uuid4()),
            "channel_id": channel_id,
            "access_token": credentials.token,
            "refresh_token": encrypt_token(credentials.refresh_token) if credentials.refresh_token else None,
            "expires_at": credentials.expiry.replace(tzinfo=timezone.utc) if credentials.expiry else None
        }
        oauth_repository.create_or_update_token(db, token_data)

        try:
            youtube_identity_service.register_from_channel(
                db=db,
                channel=channel,
                google_account_email=google_account_email,
            )
        except Exception as e:
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
    Decoupled approach: Tries to find token by channel_id (legacy), 
    if not found, tries to find by youtube_account_id directly via channel binding.
    """
    from database.models import OAuthToken, YoutubeAccount
    
    token_record = None
    gcp_profile_id = None
    
    # Check legacy channel flow first
    token_record = db.query(OAuthToken).filter(OAuthToken.channel_id == channel_id).first()
    if token_record:
        channel = channel_service.get_channel(db, channel_id)
        if channel:
            gcp_profile_id = channel.gcp_profile_id

    # If not found or no gcp_profile, check Identity Layer
    if not token_record or not gcp_profile_id:
        account = db.query(YoutubeAccount).filter(YoutubeAccount.channel_binding_id == channel_id).first()
        if account:
            token_record = db.query(OAuthToken).filter(OAuthToken.youtube_account_id == account.id).first()
            gcp_profile_id = account.gcp_profile_id
            
    if not token_record:
        raise HTTPException(
            status_code=401,
            detail="Channel/Identity is not authorized. Please complete OAuth."
        )

    if not gcp_profile_id:
        raise HTTPException(
            status_code=400,
            detail="Channel/Identity does not have a GCP profile assigned. Cannot build credentials."
        )

    gcp_profile = gcp_profile_repository.get_profile(db, gcp_profile_id)
    if not gcp_profile:
        raise HTTPException(
            status_code=400,
            detail="Assigned GCP profile not found. Cannot build credentials."
        )

    raw_refresh_token = decrypt_token(token_record.refresh_token) if token_record.refresh_token else None
    if not raw_refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Refresh token is unavailable. Please re-authorize via OAuth."
        )

    credentials = google.oauth2.credentials.Credentials(
        token=token_record.access_token,
        refresh_token=raw_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=gcp_profile.client_id,
        client_secret=gcp_profile.client_secret,
        scopes=SCOPES
    )

    if token_record.expires_at:
        credentials.expiry = token_record.expires_at.replace(tzinfo=None)

    if credentials.expired or not credentials.valid:
        try:
            request = google.auth.transport.requests.Request()
            credentials.refresh(request)
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail=f"Token refresh failed. You may need to re-authorize. Error: {str(e)}"
            )

        new_expires_at = credentials.expiry.replace(tzinfo=timezone.utc) if credentials.expiry else None
        
        # Update token safely
        token_record.access_token = credentials.token
        token_record.expires_at = new_expires_at
        db.commit()

    return credentials
