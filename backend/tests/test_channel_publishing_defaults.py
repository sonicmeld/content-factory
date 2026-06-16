import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from unittest.mock import patch, MagicMock

from database.models import Base, Channel, ChannelPublishingDefault, UploadJob
from app.main import app
from database.database import get_db
from services import channel_publishing_defaults, publishing_defaults_executor, uploader

SQLALCHEMY_TEST_URL = "sqlite:///./test_publishing_defaults.db"

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
        if os.path.exists("test_publishing_defaults.db"):
            os.remove("test_publishing_defaults.db")
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
        name=f"Pub Test Channel {uuid.uuid4().hex[:6]}",
        slug=f"pub-test-channel-{uuid.uuid4().hex[:6]}",
        youtube_channel_id=f"UCtestpub-{uuid.uuid4().hex[:6]}",
        youtube_channel_title="Pub Test Channel Title",
        is_active=1
    )
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return ch

# 1. Test get_defaults (returns transient, doesn't persist)
def test_get_defaults_transient(db):
    channel = make_channel(db)
    
    # Verify no record exists in DB initially
    db_record = db.query(ChannelPublishingDefault).filter_by(channel_id=channel.id).first()
    assert db_record is None
    
    # Call get_defaults
    record = channel_publishing_defaults.get_defaults(db, channel.id)
    assert record is not None
    assert record.channel_id == channel.id
    assert record.preferred_publish_time == "19:00"
    assert record.timezone is None
    assert record.default_playlist_id is None
    assert record.auto_schedule_enabled is False
    
    # Verify STILL no record exists in DB (transient)
    db_record2 = db.query(ChannelPublishingDefault).filter_by(channel_id=channel.id).first()
    assert db_record2 is None

# 2. Test validate_defaults
def test_validate_defaults():
    # Valid configurations
    channel_publishing_defaults.validate_defaults("18:30", "Asia/Jakarta", "PL123", True)
    channel_publishing_defaults.validate_defaults("12:00", None, None, False)
    
    # Invalid timezone
    with pytest.raises(HTTPException) as exc:
        channel_publishing_defaults.validate_defaults("12:00", "Invalid/Zone", None, False)
    assert exc.value.status_code == 400
    
    # Invalid publish time formats
    invalid_times = ["24:00", "12:60", "9:00", "abc", "", None]
    for it in invalid_times:
        with pytest.raises(HTTPException) as exc:
            channel_publishing_defaults.validate_defaults(it, "UTC", None, True)
        assert exc.value.status_code == 400

# 3. Test update_defaults (upsert)
def test_update_defaults(db):
    channel = make_channel(db)
    
    updates = {
        "preferred_publish_time": "14:15",
        "timezone": "America/New_York",
        "default_playlist_id": "PL_xyz_123",
        "auto_schedule_enabled": True
    }
    
    record = channel_publishing_defaults.update_defaults(db, channel.id, updates)
    assert record.id != ""
    assert record.preferred_publish_time == "14:15"
    assert record.timezone == "America/New_York"
    assert record.default_playlist_id == "PL_xyz_123"
    assert record.auto_schedule_enabled is True
    
    # Verify in DB
    db_record = db.query(ChannelPublishingDefault).filter_by(channel_id=channel.id).first()
    assert db_record is not None
    assert db_record.preferred_publish_time == "14:15"
    
    # Update again
    updates2 = {
        "preferred_publish_time": "08:00",
        "timezone": None,
        "default_playlist_id": None,
        "auto_schedule_enabled": False
    }
    record2 = channel_publishing_defaults.update_defaults(db, channel.id, updates2)
    assert record.id == record2.id  # Same record
    assert record2.preferred_publish_time == "08:00"
    assert record2.timezone is None
    assert record2.auto_schedule_enabled is False

# 4. Test calculate_next_publish_time
def test_calculate_next_publish_time():
    # Test that next publish time calculation always returns ISO format UTC datetime string
    publish_str = publishing_defaults_executor.calculate_next_publish_time("19:00", "Asia/Jakarta")
    assert len(publish_str) == 20
    assert publish_str.endswith("Z")
    
    # Verify parsing succeeds
    from datetime import datetime
    dt = datetime.strptime(publish_str, "%Y-%m-%dT%H:%M:%SZ")
    assert dt > datetime.utcnow() # Must be scheduled in the future

# 5. Test apply_scheduling_defaults
def test_apply_scheduling_defaults(db):
    channel = make_channel(db)
    
    body = {"snippet": {"title": "Hello"}}
    
    # Disabled initially
    publish_at = publishing_defaults_executor.apply_scheduling_defaults(db, channel.id, body)
    assert publish_at is None
    assert "status" not in body
    
    # Enabled
    channel_publishing_defaults.update_defaults(db, channel.id, {
        "preferred_publish_time": "15:30",
        "timezone": "Europe/London",
        "auto_schedule_enabled": True
    })
    
    publish_at2 = publishing_defaults_executor.apply_scheduling_defaults(db, channel.id, body)
    assert publish_at2 is not None
    assert body["status"]["privacyStatus"] == "private"
    assert body["status"]["publishAt"] == publish_at2

# 6. Test assign_playlist_defaults (non-blocking validation)
def test_assign_playlist_defaults(db):
    channel = make_channel(db)
    
    # No playlist configured initially
    mock_youtube = MagicMock()
    success = publishing_defaults_executor.assign_playlist_defaults(db, channel.id, mock_youtube, "video123")
    assert success is False
    mock_youtube.playlistItems().insert.assert_not_called()
    
    # Configure playlist
    channel_publishing_defaults.update_defaults(db, channel.id, {
        "preferred_publish_time": "19:00",
        "timezone": "UTC",
        "default_playlist_id": "PLplaylist123",
        "auto_schedule_enabled": False
    })
    
    # Success scenario
    mock_insert = MagicMock()
    mock_youtube.playlistItems().insert.return_value = mock_insert
    mock_insert.execute.return_value = {"id": "playlistitem123"}
    
    success2 = publishing_defaults_executor.assign_playlist_defaults(db, channel.id, mock_youtube, "video123")
    assert success2 is True
    mock_youtube.playlistItems().insert.assert_called_once()
    
    # Failure scenario (Graceful Non-Blocking check)
    mock_youtube2 = MagicMock()
    mock_insert_fail = MagicMock()
    mock_insert_fail.execute.side_effect = Exception("YouTube API error")
    mock_youtube2.playlistItems().insert.return_value = mock_insert_fail
    
    # Must NOT raise exception, just return False and log a warning
    success3 = publishing_defaults_executor.assign_playlist_defaults(db, channel.id, mock_youtube2, "video123")
    assert success3 is False

# 7. Test REST API Endpoints
def test_api_get_publishing_defaults_transient(client, db):
    channel = make_channel(db)
    
    response = client.get(f"/api/channels/{channel.id}/publishing-defaults")
    assert response.status_code == 200
    data = response.json()
    assert data["channel_id"] == channel.id
    assert data["preferred_publish_time"] == "19:00"
    assert data["timezone"] is None
    assert data["auto_schedule_enabled"] is False

def test_api_put_publishing_defaults(client, db):
    channel = make_channel(db)
    
    payload = {
        "preferred_publish_time": "21:30",
        "timezone": "Asia/Singapore",
        "default_playlist_id": "PLsingapore",
        "auto_schedule_enabled": True
    }
    
    response = client.put(f"/api/channels/{channel.id}/publishing-defaults", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["preferred_publish_time"] == "21:30"
    assert data["timezone"] == "Asia/Singapore"
    assert data["default_playlist_id"] == "PLsingapore"
    assert data["auto_schedule_enabled"] is True
    
    # Check database
    db_record = db.query(ChannelPublishingDefault).filter_by(channel_id=channel.id).first()
    assert db_record is not None
    assert db_record.preferred_publish_time == "21:30"

@patch("api.channels.build")
@patch("api.channels.oauth_service.get_valid_credentials")
def test_api_get_playlists_success(mock_get_creds, mock_build, client, db):
    channel = make_channel(db)
    
    # Mock YouTube Client response
    mock_youtube = MagicMock()
    mock_playlists = MagicMock()
    mock_youtube.playlists.return_value = mock_playlists
    mock_playlists.list.return_value.execute.return_value = {
        "items": [
            {
                "id": "PL123",
                "snippet": {"title": "Cool Videos"}
            }
        ]
    }
    mock_build.return_value = mock_youtube
    
    response = client.get(f"/api/channels/{channel.id}/playlists")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "PL123"
    assert data[0]["title"] == "Cool Videos"
