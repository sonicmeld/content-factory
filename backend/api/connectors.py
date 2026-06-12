import os
import uuid
import shutil
import mimetypes
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database.database import get_db
from database.models import ExternalAccount, ConnectorJob, AssetInbox, Channel, Asset
from api.schemas import (
    ExternalAccountCreate,
    ExternalAccountUpdate,
    ExternalAccountResponse,
    ConnectorJobCreate,
    ConnectorJobResponse,
    AssetInboxResponse
)
from app.config import settings

router = APIRouter(prefix="/api/connectors", tags=["connectors"])

# --- External Accounts ---

@router.get("/accounts", response_model=List[ExternalAccountResponse])
def get_external_accounts(
    workspace_id: Optional[str] = None,
    provider: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ExternalAccount)
    if workspace_id:
        query = query.filter(ExternalAccount.workspace_id == workspace_id)
    if provider:
        query = query.filter(ExternalAccount.provider == provider)
    return query.all()

@router.post("/accounts", response_model=ExternalAccountResponse)
def create_external_account(
    account: ExternalAccountCreate,
    db: Session = Depends(get_db)
):
    db_account = ExternalAccount(
        id=str(uuid.uuid4()),
        workspace_id=account.workspace_id,
        provider=account.provider,
        account_name=account.account_name,
        profile_name=account.profile_name,
        is_active=1
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

@router.patch("/accounts/{account_id}", response_model=ExternalAccountResponse)
def update_external_account(
    account_id: str,
    account_update: ExternalAccountUpdate,
    db: Session = Depends(get_db)
):
    db_account = db.query(ExternalAccount).filter(ExternalAccount.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="External account not found")
    
    update_data = account_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_account, key, value)
        
    db.commit()
    db.refresh(db_account)
    return db_account

@router.delete("/accounts/{account_id}")
def delete_external_account(
    account_id: str,
    db: Session = Depends(get_db)
):
    db_account = db.query(ExternalAccount).filter(ExternalAccount.id == account_id).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="External account not found")
    
    db.delete(db_account)
    db.commit()
    return {"message": "External account deleted successfully"}


# --- Connector Jobs ---

@router.post("/jobs", response_model=ConnectorJobResponse)
def create_connector_job(
    job: ConnectorJobCreate,
    db: Session = Depends(get_db)
):
    db_job = ConnectorJob(
        id=str(uuid.uuid4()),
        workspace_id=job.workspace_id,
        project_id=job.project_id,
        provider=job.provider,
        account_id=job.account_id,
        asset_type=job.asset_type,
        status="pending",
        combo_id=job.combo_id,
        prompt_id=job.prompt_id,
        prompt=job.prompt
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.get("/jobs/active", response_model=Optional[ConnectorJobResponse])
def get_active_connector_job(
    workspace_id: Optional[str] = None,
    project_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ConnectorJob).filter(ConnectorJob.status == "pending")
    if workspace_id:
        query = query.filter(ConnectorJob.workspace_id == workspace_id)
    if project_id:
        query = query.filter(ConnectorJob.project_id == project_id)
    
    # Return the latest pending job
    return query.order_by(ConnectorJob.created_at.desc()).first()


# --- Asset Inbox ---

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "txt", "md", "mp4", "mov", "mkv", "webm", "wav", "mp3"}

def validate_extension(filename: str):
    ext = filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension '{ext}' not allowed")
    return ext

@router.post("/inbox/upload", response_model=AssetInboxResponse)
async def upload_inbox_asset(
    workspace_id: str = Form(...),
    project_id: str = Form(...),
    source: str = Form(...),
    asset_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    ext = validate_extension(file.filename)
    
    inbox_dir = os.path.join(settings.DATA_PATH, "inbox")
    os.makedirs(inbox_dir, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}.{ext}"
    filepath = os.path.join(inbox_dir, safe_filename)
    
    try:
        with open(filepath, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    db_inbox = AssetInbox(
        id=file_id,
        workspace_id=workspace_id,
        project_id=project_id,
        source=source,
        asset_type=asset_type,
        status="pending",
        file_path=filepath
    )
    
    db.add(db_inbox)
    db.commit()
    db.refresh(db_inbox)
    return db_inbox

@router.get("/inbox", response_model=List[AssetInboxResponse])
def get_inbox_assets(
    workspace_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = "pending",
    db: Session = Depends(get_db)
):
    query = db.query(AssetInbox)
    if workspace_id:
        query = query.filter(AssetInbox.workspace_id == workspace_id)
    if project_id:
        query = query.filter(AssetInbox.project_id == project_id)
    if status:
        query = query.filter(AssetInbox.status == status)
    return query.order_by(AssetInbox.created_at.desc()).all()

@router.post("/inbox/{inbox_id}/approve", response_model=AssetInboxResponse)
def approve_inbox_asset(
    inbox_id: str,
    db: Session = Depends(get_db)
):
    inbox_item = db.query(AssetInbox).filter(AssetInbox.id == inbox_id).first()
    if not inbox_item:
        raise HTTPException(status_code=404, detail="Inbox item not found")
    
    if inbox_item.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot approve item in status: {inbox_item.status}")
        
    # Find corresponding Channel/Project
    channel = db.query(Channel).filter(Channel.id == inbox_item.project_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Corresponding Channel/Project not found")
        
    # Check if the source file exists
    if not os.path.exists(inbox_item.file_path):
        raise HTTPException(status_code=404, detail="Source file missing from inbox storage")
        
    # Define target path under channel assets
    ext = inbox_item.file_path.split(".")[-1]
    target_dir = os.path.join(settings.DATA_PATH, "channels", channel.slug, inbox_item.asset_type)
    os.makedirs(target_dir, exist_ok=True)
    
    asset_id = str(uuid.uuid4())
    safe_filename = f"{asset_id}.{ext}"
    target_path = os.path.join(target_dir, safe_filename)
    
    try:
        shutil.move(inbox_item.file_path, target_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move file to channel library: {str(e)}")
        
    file_size = os.path.getsize(target_path)
    mime_type = mimetypes.guess_type(target_path)[0] or "application/octet-stream"
    
    # Create main library Asset record
    db_asset = Asset(
        id=asset_id,
        channel_id=inbox_item.project_id,
        asset_type=inbox_item.asset_type,
        filename=f"imported_{inbox_item.source}_{inbox_item.asset_type}_{asset_id[:8]}.{ext}",
        file_path=target_path,
        file_size=file_size,
        mime_type=mime_type
    )
    db.add(db_asset)
    
    # Update active jobs matching this context to completed
    active_jobs = db.query(ConnectorJob).filter(
        ConnectorJob.project_id == inbox_item.project_id,
        ConnectorJob.asset_type == inbox_item.asset_type,
        ConnectorJob.status == "pending"
    ).all()
    for job in active_jobs:
        job.status = "completed"
        
    # Mark inbox item as approved
    inbox_item.status = "approved"
    inbox_item.file_path = target_path # Update to new path
    
    db.commit()
    db.refresh(inbox_item)
    return inbox_item

@router.post("/inbox/{inbox_id}/reject", response_model=AssetInboxResponse)
def reject_inbox_asset(
    inbox_id: str,
    db: Session = Depends(get_db)
):
    inbox_item = db.query(AssetInbox).filter(AssetInbox.id == inbox_id).first()
    if not inbox_item:
        raise HTTPException(status_code=404, detail="Inbox item not found")
        
    if inbox_item.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject item in status: {inbox_item.status}")
        
    # Attempt to delete the physical file to save space
    if os.path.exists(inbox_item.file_path):
        try:
            os.remove(inbox_item.file_path)
        except Exception:
            pass
            
    # Update active jobs matching this context to failed/cancelled
    active_jobs = db.query(ConnectorJob).filter(
        ConnectorJob.project_id == inbox_item.project_id,
        ConnectorJob.asset_type == inbox_item.asset_type,
        ConnectorJob.status == "pending"
    ).all()
    for job in active_jobs:
        job.status = "failed"
        
    inbox_item.status = "rejected"
    db.commit()
    db.refresh(inbox_item)
    return inbox_item

@router.post("/inbox/{inbox_id}/archive", response_model=AssetInboxResponse)
def archive_inbox_asset(
    inbox_id: str,
    db: Session = Depends(get_db)
):
    inbox_item = db.query(AssetInbox).filter(AssetInbox.id == inbox_id).first()
    if not inbox_item:
        raise HTTPException(status_code=404, detail="Inbox item not found")
        
    inbox_item.status = "archived"
    db.commit()
    db.refresh(inbox_item)
    return inbox_item
