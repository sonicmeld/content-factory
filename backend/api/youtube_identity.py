"""
YouTube Identity API Router
Prefix: /api/youtube-identity

Endpoints:
- GET    /accounts                 → List semua YouTube accounts (filter by workspace_id optional)
- GET    /accounts/active          → List accounts dengan analytics_enabled=True
- GET    /accounts/{id}            → Detail satu account
- PATCH  /accounts/{id}/analytics  → Toggle analytics_enabled
- POST   /sync                     → Sync dari channels existing ke youtube_accounts
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database.database import get_db
from api.schemas import (
    YoutubeAccountResponse,
    YoutubeAnalyticsToggleRequest,
    YoutubeSyncResponse,
)
from services import youtube_identity_service

router = APIRouter(prefix="/api/youtube-identity", tags=["youtube-identity"])


@router.get("/accounts", response_model=List[YoutubeAccountResponse])
def list_youtube_accounts(
    workspace_id: Optional[str] = Query(None, description="Filter by workspace ID"),
    db: Session = Depends(get_db),
):
    """
    Mengembalikan semua YouTube accounts yang terdaftar.
    Opsional: filter berdasarkan workspace_id.
    """
    return youtube_identity_service.list_accounts(db, workspace_id=workspace_id)


@router.get("/accounts/active", response_model=List[YoutubeAccountResponse])
def list_active_youtube_accounts(
    workspace_id: Optional[str] = Query(None, description="Filter by workspace ID"),
    db: Session = Depends(get_db),
):
    """
    Mengembalikan YouTube accounts dengan analytics_enabled=True.
    Digunakan oleh frontend selector di halaman Analytics (Market Intelligence, Context Pipeline).
    """
    return youtube_identity_service.get_active_accounts(db, workspace_id=workspace_id)


@router.get("/accounts/{account_id}", response_model=YoutubeAccountResponse)
def get_youtube_account(
    account_id: str,
    db: Session = Depends(get_db),
):
    """
    Mengambil detail satu YouTube account berdasarkan ID.
    HTTP 404 jika tidak ditemukan.
    """
    return youtube_identity_service.get_account(db, account_id)


@router.patch("/accounts/{account_id}/analytics", response_model=YoutubeAccountResponse)
def toggle_analytics_binding(
    account_id: str,
    payload: YoutubeAnalyticsToggleRequest,
    db: Session = Depends(get_db),
):
    """
    Toggle analytics_enabled untuk satu YouTube account.

    Business rule: menonaktifkan analytics_enabled TIDAK menghapus data historis.
    """
    return youtube_identity_service.toggle_analytics_enabled(
        db, account_id=account_id, enabled=payload.enabled
    )


@router.post("/sync", response_model=YoutubeSyncResponse)
def sync_channels_to_youtube_accounts(
    db: Session = Depends(get_db),
):
    """
    Sync semua Channel yang memiliki youtube_channel_id ke tabel youtube_accounts.
    Berguna untuk inisialisasi setelah migrasi database: mengisi youtube_accounts
    dari data channels yang sudah ada sebelum fitur ini dibuat.

    Operasi ini bersifat idempotent (aman dijalankan berulang kali).
    """
    result = youtube_identity_service.sync_all_channels(db)
    return YoutubeSyncResponse(
        synced=result["synced"],
        created=result["created"],
        updated=result["updated"],
        message=f"Sync complete: {result['created']} created, {result['updated']} updated from {result['synced']} channels."
    )
