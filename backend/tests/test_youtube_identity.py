"""
Test Suite: YouTube Identity Layer
Tests untuk youtube_identity_service dan endpoint /api/youtube-identity/

Verifikasi:
1. register_from_channel: upsert ke youtube_accounts setelah OAuth
2. list_accounts / get_active_accounts: filter dan list
3. toggle_analytics_enabled: toggle tanpa menghapus data
4. sync_all_channels: bulk sync idempotent dari channels existing
5. API REST endpoints: response codes dan format
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.models import Base, Channel, YoutubeAccount
from app.main import app
from database.database import get_db
from services import youtube_identity_service


# ─────────────────────────────────────────────
# Test Database Setup
# ─────────────────────────────────────────────
SQLALCHEMY_TEST_URL = "sqlite:///./test_youtube_identity.db"

engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    import os, time
    time.sleep(0.2)  # Brief wait for Windows to release file lock
    try:
        if os.path.exists("test_youtube_identity.db"):
            os.remove("test_youtube_identity.db")
    except PermissionError:
        pass  # Windows file lock — cleanup handled by OS on process exit



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


# ─────────────────────────────────────────────
# Helper: Build Channel fixture
# ─────────────────────────────────────────────
def make_channel(db, youtube_channel_id="UCtest123", gcp_profile_id=None):
    ch = Channel(
        id=str(uuid.uuid4()),
        name="Test Channel",
        slug=f"test-channel-{uuid.uuid4().hex[:6]}",
        youtube_channel_id=youtube_channel_id,
        youtube_channel_title="Test Channel Title",
        youtube_handle="@testhandle",
        youtube_channel_url=f"https://youtube.com/channel/{youtube_channel_id}",
        gcp_profile_id=gcp_profile_id,
    )
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return ch


# ─────────────────────────────────────────────
# Test 1: register_from_channel — create new
# ─────────────────────────────────────────────
def test_register_from_channel_creates_new(db):
    """OAuth callback harus membuat entri baru di youtube_accounts."""
    channel = make_channel(db, youtube_channel_id="UCnew001")
    
    account = youtube_identity_service.register_from_channel(db, channel=channel)
    
    assert account is not None
    assert account.youtube_channel_id == "UCnew001"
    assert account.youtube_channel_title == "Test Channel Title"
    assert account.channel_binding_id == channel.id
    assert account.analytics_enabled is True


# ─────────────────────────────────────────────
# Test 2: register_from_channel — idempotent upsert
# ─────────────────────────────────────────────
def test_register_from_channel_upserts(db):
    """Memanggil register_from_channel dua kali untuk channel yang sama harus update, bukan duplikasi."""
    channel = make_channel(db, youtube_channel_id="UCupsert001")
    
    # First call
    acc1 = youtube_identity_service.register_from_channel(db, channel=channel)
    
    # Modify channel title
    channel.youtube_channel_title = "Updated Title"
    db.commit()
    
    # Second call (upsert)
    acc2 = youtube_identity_service.register_from_channel(db, channel=channel)
    
    # Should be same record, not new
    assert acc1.id == acc2.id
    assert acc2.youtube_channel_title == "Updated Title"


# ─────────────────────────────────────────────
# Test 3: list_accounts dan get_active_accounts
# ─────────────────────────────────────────────
def test_list_and_active_accounts(db):
    """list_accounts mengembalikan semua, get_active_accounts hanya yang analytics_enabled=True."""
    ch_a = make_channel(db, youtube_channel_id="UClist_a")
    ch_b = make_channel(db, youtube_channel_id="UClist_b")
    
    acc_a = youtube_identity_service.register_from_channel(db, ch_a)
    acc_b = youtube_identity_service.register_from_channel(db, ch_b)
    
    # Disable analytics for acc_b
    youtube_identity_service.toggle_analytics_enabled(db, acc_b.id, enabled=False)
    
    all_accounts = youtube_identity_service.list_accounts(db)
    active_accounts = youtube_identity_service.get_active_accounts(db)
    
    all_ids = [a.id for a in all_accounts]
    active_ids = [a.id for a in active_accounts]
    
    assert acc_a.id in all_ids
    assert acc_b.id in all_ids
    assert acc_a.id in active_ids
    assert acc_b.id not in active_ids  # Disabled, should not appear in active


# ─────────────────────────────────────────────
# Test 4: toggle_analytics_enabled preserves data
# ─────────────────────────────────────────────
def test_toggle_analytics_does_not_delete_data(db):
    """Menonaktifkan analytics_enabled TIDAK menghapus data dari database."""
    channel = make_channel(db, youtube_channel_id="UCtoggle001")
    account = youtube_identity_service.register_from_channel(db, channel=channel)
    account_id = account.id
    
    # Toggle off
    result = youtube_identity_service.toggle_analytics_enabled(db, account_id, enabled=False)
    assert result.analytics_enabled is False
    
    # Data still exists
    check = db.query(YoutubeAccount).filter(YoutubeAccount.id == account_id).first()
    assert check is not None
    assert check.analytics_enabled is False
    
    # Toggle back on
    result2 = youtube_identity_service.toggle_analytics_enabled(db, account_id, enabled=True)
    assert result2.analytics_enabled is True


# ─────────────────────────────────────────────
# Test 5: sync_all_channels — bulk idempotent
# ─────────────────────────────────────────────
def test_sync_all_channels_idempotent(db):
    """sync_all_channels harus aman dijalankan berulang kali."""
    # Create channels without manually registering
    ch = make_channel(db, youtube_channel_id="UCsync_bulk_001")
    
    result1 = youtube_identity_service.sync_all_channels(db)
    assert result1["synced"] >= 1
    assert result1["created"] >= 0
    
    # Run again — should update, not create duplicate
    result2 = youtube_identity_service.sync_all_channels(db)
    assert result2["updated"] >= 0  # Should update, not re-create
    
    # Verify no duplicates by unique constraint
    count = db.query(YoutubeAccount).filter(
        YoutubeAccount.youtube_channel_id == "UCsync_bulk_001"
    ).count()
    assert count == 1


# ─────────────────────────────────────────────
# Test 6: API REST Endpoints
# ─────────────────────────────────────────────
def test_api_list_accounts(client, db):
    """GET /api/youtube-identity/accounts harus mengembalikan 200."""
    response = client.get("/api/youtube-identity/accounts")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_api_active_accounts(client, db):
    """GET /api/youtube-identity/accounts/active harus mengembalikan 200."""
    response = client.get("/api/youtube-identity/accounts/active")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_api_get_account_not_found(client, db):
    """GET /api/youtube-identity/accounts/{nonexistent} harus mengembalikan 404."""
    response = client.get("/api/youtube-identity/accounts/nonexistent-id-xyz")
    assert response.status_code == 404


def test_api_sync(client, db):
    """POST /api/youtube-identity/sync harus mengembalikan 200 dengan summary."""
    response = client.post("/api/youtube-identity/sync")
    assert response.status_code == 200
    data = response.json()
    assert "synced" in data
    assert "created" in data
    assert "updated" in data
    assert "message" in data


def test_api_toggle_analytics(client, db):
    """PATCH /api/youtube-identity/accounts/{id}/analytics harus mengubah analytics_enabled."""
    channel = make_channel(db, youtube_channel_id="UCapitest001")
    account = youtube_identity_service.register_from_channel(db, channel=channel)
    
    # Toggle off
    response = client.patch(
        f"/api/youtube-identity/accounts/{account.id}/analytics",
        json={"enabled": False}
    )
    assert response.status_code == 200
    assert response.json()["analytics_enabled"] is False
    
    # Toggle on
    response2 = client.patch(
        f"/api/youtube-identity/accounts/{account.id}/analytics",
        json={"enabled": True}
    )
    assert response2.status_code == 200
    assert response2.json()["analytics_enabled"] is True
