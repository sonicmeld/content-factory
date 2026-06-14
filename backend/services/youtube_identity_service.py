"""
YouTube Identity Service
Single Source of Truth untuk identitas akun YouTube di Content Factory.

Tanggung jawab:
- Mendaftarkan/update entri youtube_accounts dari data Channel yang sudah ber-OAuth
- Menyediakan list akun aktif per workspace (untuk selector UI)
- Toggle analytics_enabled per akun tanpa menghapus data historis
- Lookup akun berdasarkan youtube_channel_id (untuk resolusi SSOT dari domain lain)

Catatan arsitektur:
- oauth_tokens tetap tabel terpisah (di-link via channel_id dari Channel Domain)
- Multi-GCP: setiap YoutubeAccount memiliki gcp_profile_id sendiri
- Menonaktifkan analytics_enabled TIDAK menghapus data historis analytics
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from database.models import YoutubeAccount, Channel


def list_accounts(db: Session, workspace_id: Optional[str] = None) -> List[YoutubeAccount]:
    """
    Mengembalikan semua YouTube accounts.
    Jika workspace_id diberikan, filter berdasarkan workspace.
    """
    query = db.query(YoutubeAccount)
    if workspace_id:
        query = query.filter(YoutubeAccount.workspace_id == workspace_id)
    return query.order_by(YoutubeAccount.created_at.desc()).all()


def get_account(db: Session, account_id: str) -> YoutubeAccount:
    """
    Mengambil satu YoutubeAccount berdasarkan ID.
    HTTP 404 jika tidak ditemukan.
    """
    account = db.query(YoutubeAccount).filter(YoutubeAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail=f"YouTube account '{account_id}' not found.")
    return account


def get_account_by_youtube_channel_id(db: Session, youtube_channel_id: str) -> Optional[YoutubeAccount]:
    """
    Lookup YoutubeAccount berdasarkan youtube_channel_id (YouTube's own ID, e.g. UCxxx...).
    Mengembalikan None jika tidak ditemukan (bukan raise 404).
    """
    return db.query(YoutubeAccount).filter(
        YoutubeAccount.youtube_channel_id == youtube_channel_id
    ).first()


def get_active_accounts(db: Session, workspace_id: Optional[str] = None) -> List[YoutubeAccount]:
    """
    Mengembalikan YouTube accounts dengan analytics_enabled=True.
    Digunakan oleh frontend selector di halaman Analytics.
    """
    query = db.query(YoutubeAccount).filter(YoutubeAccount.analytics_enabled == True)
    if workspace_id:
        query = query.filter(YoutubeAccount.workspace_id == workspace_id)
    return query.order_by(YoutubeAccount.youtube_channel_title).all()


def register_from_channel(
    db: Session,
    channel: Channel,
    google_account_email: Optional[str] = None,
) -> YoutubeAccount:
    """
    Membuat atau mengupdate entri youtube_accounts dari data Channel yang sudah ber-OAuth.
    Dipanggil otomatis dari oauth_service.handle_callback() setelah token tersimpan.

    Logic:
    1. Cari existing record berdasarkan youtube_channel_id (upsert pattern).
    2. Jika ada → update title, handle, url, dan gcp_profile_id (idempotent).
    3. Jika tidak ada → buat record baru.
    4. Selalu binding channel_binding_id ke channel.id yang memiliki OAuth ini.

    Catatan: workspace_id diambil dari channel.id karena Channel saat ini belum
    memiliki kolom workspace_id sendiri. Untuk kompatibilitas, kita gunakan
    channel.id sebagai workspace_id sementara sampai workspace domain terbentuk penuh.
    """
    if not channel.youtube_channel_id:
        raise HTTPException(
            status_code=400,
            detail=f"Channel '{channel.id}' does not have a YouTube channel identity yet. "
                   "Complete OAuth first to sync the YouTube Channel ID."
        )

    existing = get_account_by_youtube_channel_id(db, channel.youtube_channel_id)

    if existing:
        # Update identity metadata (idempotent upsert)
        existing.youtube_channel_title = channel.youtube_channel_title or existing.youtube_channel_title
        existing.youtube_handle = channel.youtube_handle or existing.youtube_handle
        existing.youtube_channel_url = channel.youtube_channel_url or existing.youtube_channel_url
        existing.gcp_profile_id = channel.gcp_profile_id or existing.gcp_profile_id
        existing.channel_binding_id = channel.id
        if google_account_email:
            existing.google_account_email = google_account_email
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new SSOT record
        new_account = YoutubeAccount(
            id=str(uuid.uuid4()),
            workspace_id=channel.id,  # Sementara: pakai channel.id sebagai workspace_id
            gcp_profile_id=channel.gcp_profile_id,
            channel_binding_id=channel.id,
            google_account_email=google_account_email,
            youtube_channel_id=channel.youtube_channel_id,
            youtube_channel_title=channel.youtube_channel_title or "Unknown Channel",
            youtube_handle=channel.youtube_handle,
            youtube_channel_url=channel.youtube_channel_url,
            analytics_enabled=True,
        )
        db.add(new_account)
        db.commit()
        db.refresh(new_account)
        return new_account


def toggle_analytics_enabled(db: Session, account_id: str, enabled: bool) -> YoutubeAccount:
    """
    Mengaktifkan atau menonaktifkan binding Analytics untuk satu YouTube account.

    Business rule: menonaktifkan analytics_enabled TIDAK menghapus data historis.
    Data tetap ada di database; hanya akun ini yang tidak akan muncul di selector UI.
    """
    account = get_account(db, account_id)
    account.analytics_enabled = enabled
    account.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(account)
    return account


def sync_all_channels(db: Session) -> dict:
    """
    Sync semua Channel yang memiliki youtube_channel_id ke youtube_accounts.
    Dipanggil manual via endpoint POST /youtube-identity/sync.

    Berguna untuk inisialisasi setelah migrasi: mengisi youtube_accounts
    dari data channels yang sudah ada sebelum fitur ini dibuat.
    """
    channels_with_yt = db.query(Channel).filter(
        Channel.youtube_channel_id.isnot(None),
        Channel.youtube_channel_id != ""
    ).all()

    created = 0
    updated = 0

    for channel in channels_with_yt:
        try:
            existing = get_account_by_youtube_channel_id(db, channel.youtube_channel_id)
            if existing:
                existing.youtube_channel_title = channel.youtube_channel_title or existing.youtube_channel_title
                existing.youtube_handle = channel.youtube_handle or existing.youtube_handle
                existing.youtube_channel_url = channel.youtube_channel_url or existing.youtube_channel_url
                existing.gcp_profile_id = channel.gcp_profile_id or existing.gcp_profile_id
                existing.channel_binding_id = channel.id
                existing.updated_at = datetime.now(timezone.utc)
                updated += 1
            else:
                new_account = YoutubeAccount(
                    id=str(uuid.uuid4()),
                    workspace_id=channel.id,
                    gcp_profile_id=channel.gcp_profile_id,
                    channel_binding_id=channel.id,
                    youtube_channel_id=channel.youtube_channel_id,
                    youtube_channel_title=channel.youtube_channel_title or "Unknown Channel",
                    youtube_handle=channel.youtube_handle,
                    youtube_channel_url=channel.youtube_channel_url,
                    analytics_enabled=True,
                )
                db.add(new_account)
                created += 1
        except Exception as e:
            print(f"[sync_all_channels] Skipped channel {channel.id}: {e}")
            continue

    db.commit()
    return {
        "synced": len(channels_with_yt),
        "created": created,
        "updated": updated,
    }
