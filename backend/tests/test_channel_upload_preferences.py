import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.models import Base, Channel, ChannelUploadPreference, UploadJob
from app.main import app
from database.database import get_db
from services import channel_upload_preferences, uploader
from unittest.mock import patch, MagicMock

SQLALCHEMY_TEST_URL = "sqlite:///./test_upload_prefs.db"

engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    import os, time
    time.sleep(0.2)
    try:
        if os.path.exists("test_upload_prefs.db"):
            os.remove("test_upload_prefs.db")
    except PermissionError:
        pass

@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def make_channel(db):
    ch = Channel(
        id=str(uuid.uuid4()),
        name=f"Pref Test Channel {uuid.uuid4().hex[:6]}",
        slug=f"pref-test-channel-{uuid.uuid4().hex[:6]}",
        youtube_channel_id=f"UCtestpref-{uuid.uuid4().hex[:6]}",
        youtube_channel_title="Pref Test Channel Title",
        is_active=1
    )
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return ch

# 1. Test get_preferences (returns transient, doesn't persist)
def test_get_preferences_transient(db):
    channel = make_channel(db)
    
    # Verify no record exists in DB initially
    db_pref = db.query(ChannelUploadPreference).filter_by(channel_id=channel.id).first()
    assert db_pref is None
    
    # Call get_preferences
    pref = channel_upload_preferences.get_preferences(db, channel.id)
    assert pref is not None
    assert pref.channel_id == channel.id
    assert pref.privacy_status == "private"
    assert pref.category_id == "22"
    assert pref.default_language == "en"
    assert pref.default_tags == []
    
    # Verify STILL no record exists in DB (transient)
    db_pref2 = db.query(ChannelUploadPreference).filter_by(channel_id=channel.id).first()
    assert db_pref2 is None

# 2. Test validate_preferences
def test_validate_preferences():
    from fastapi import HTTPException
    
    # Valid
    channel_upload_preferences.validate_preferences("public", "10", "en", ["music", "pop"])
    
    # Invalid privacy
    with pytest.raises(HTTPException) as exc:
        channel_upload_preferences.validate_preferences("invalid", "10", "en", [])
    assert exc.value.status_code == 400
    
    # Tags length limit checking (combined length must be <= 500)
    # 501 character string
    long_tag = "a" * 501
    with pytest.raises(HTTPException) as exc:
        channel_upload_preferences.validate_preferences("public", "10", "en", [long_tag])
    assert exc.value.status_code == 400
    
    # Multiple tags exceeding 500 characters (including commas)
    tags = ["a" * 250, "b" * 250]  # combined length: 250 + 250 + 1 = 501
    with pytest.raises(HTTPException) as exc:
        channel_upload_preferences.validate_preferences("public", "10", "en", tags)
    assert exc.value.status_code == 400

# 3. Test update_preferences (upsert)
def test_update_preferences(db):
    channel = make_channel(db)
    
    updates = {
        "privacy_status": "unlisted",
        "category_id": "10",
        "default_language": "id",
        "default_tags": ["lagu", "pop", "indonesia"]
    }
    
    pref = channel_upload_preferences.update_preferences(db, channel.id, updates)
    assert pref.id != ""
    assert pref.privacy_status == "unlisted"
    assert pref.category_id == "10"
    assert pref.default_language == "id"
    assert pref.default_tags == ["lagu", "pop", "indonesia"]
    
    # Verify in DB
    db_pref = db.query(ChannelUploadPreference).filter_by(channel_id=channel.id).first()
    assert db_pref is not None
    assert db_pref.privacy_status == "unlisted"
    
    # Update again
    updates2 = {
        "privacy_status": "public",
        "category_id": "24",
        "default_language": "en",
        "default_tags": ["new"]
    }
    pref2 = channel_upload_preferences.update_preferences(db, channel.id, updates2)
    assert pref.id == pref2.id  # Same record
    assert pref2.privacy_status == "public"

# 4. Test REST API Endpoints
def test_api_get_preferences_defaults(client, db):
    channel = make_channel(db)
    
    response = client.get(f"/api/channels/{channel.id}/upload-preferences")
    assert response.status_code == 200
    data = response.json()
    assert data["channel_id"] == channel.id
    assert data["privacy_status"] == "private"
    assert data["default_tags"] == []
    
    # Verify no record created in DB
    db_pref = db.query(ChannelUploadPreference).filter_by(channel_id=channel.id).first()
    assert db_pref is None

def test_api_put_preferences(client, db):
    channel = make_channel(db)
    
    payload = {
        "privacy_status": "unlisted",
        "category_id": "1",
        "default_language": "es",
        "default_tags": ["film", "trailers"]
    }
    
    response = client.put(f"/api/channels/{channel.id}/upload-preferences", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["privacy_status"] == "unlisted"
    assert data["category_id"] == "1"
    assert data["default_language"] == "es"
    assert data["default_tags"] == ["film", "trailers"]
    
    # Verify record exists in DB
    db_pref = db.query(ChannelUploadPreference).filter_by(channel_id=channel.id).first()
    assert db_pref is not None
    assert db_pref.privacy_status == "unlisted"

def test_api_get_preferences_saved(client, db):
    channel = make_channel(db)
    channel_upload_preferences.update_preferences(db, channel.id, {
        "privacy_status": "public",
        "category_id": "15",
        "default_language": "ja",
        "default_tags": ["cats"]
    })
    
    response = client.get(f"/api/channels/{channel.id}/upload-preferences")
    assert response.status_code == 200
    data = response.json()
    assert data["privacy_status"] == "public"
    assert data["category_id"] == "15"
    assert data["default_tags"] == ["cats"]

def test_api_get_preferences_channel_not_found(client):
    response = client.get("/api/channels/nonexistent-channel-id/upload-preferences")
    assert response.status_code == 404

# 5. Integration: Uploader service payload mapping
@patch("services.uploader.build")
@patch("services.uploader.MediaFileUpload")
@patch("services.uploader.oauth_service.get_valid_credentials")
def test_uploader_service_uses_preferences(mock_get_creds, mock_media, mock_build, db):
    channel = make_channel(db)
    channel_upload_preferences.update_preferences(db, channel.id, {
        "privacy_status": "unlisted",
        "category_id": "10",
        "default_language": "fr",
        "default_tags": ["chanson", "musique"]
    })
    
    job = UploadJob(
        id=str(uuid.uuid4()),
        channel_id=channel.id,
        video_path="mock_video.mp4",
        title="My Custom Title",
        description="My custom description",
        status="pending"
    )
    db.add(job)
    db.commit()
    
    # Mock YouTube Client response
    mock_youtube = MagicMock()
    mock_insert_request = MagicMock()
    mock_youtube.videos().insert.return_value = mock_insert_request
    mock_insert_request.next_chunk.return_value = (None, {"id": "YT_VIDEO_123"})
    mock_build.return_value = mock_youtube
    
    # Trigger uploader
    with patch("os.path.exists", return_value=True):
        res = uploader.upload_video(db, job)
        
    assert res["video_id"] == "YT_VIDEO_123"
    
    # Inspect arguments passed to insert
    mock_youtube.videos().insert.assert_called_once()
    kwargs = mock_youtube.videos().insert.call_args[1]
    body = kwargs["body"]
    
    assert body["snippet"]["title"] == "My Custom Title"
    assert body["snippet"]["description"] == "My custom description"
    assert body["snippet"]["categoryId"] == "10"
    assert body["snippet"]["defaultLanguage"] == "fr"
    assert body["snippet"]["tags"] == ["chanson", "musique"]
    assert body["status"]["privacyStatus"] == "unlisted"
