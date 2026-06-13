import os
import uuid
import shutil
import mimetypes
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database.database import get_db
from database.models import ExternalAccount, ConnectorJob, AssetInbox, Channel, Asset, PromptContext, RuntimeAudit, SystemSetting
from api.schemas import (
    ExternalAccountCreate,
    ExternalAccountUpdate,
    ExternalAccountResponse,
    ConnectorJobCreate,
    ConnectorJobResponse,
    AssetInboxResponse,
    ApproveInboxAssetRequest,
    SingleModelGenerationRequest
)
from app.config import settings
from sqlalchemy import func

router = APIRouter(prefix="/api/connectors", tags=["connectors"])

# --- Static Providers Registry ---
PROVIDERS = [
    {"name": "NanoBanana", "type": "api"},
    {"name": "Flux", "type": "api"},
    {"name": "SDXL", "type": "api"},
    {"name": "Google Flow", "type": "connector"},
    {"name": "Gemini", "type": "connector"},
    {"name": "ChatGPT", "type": "connector"}
]

@router.get("/providers")
def get_providers():
    return PROVIDERS

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

def to_job_response(job: ConnectorJob, db: Session) -> ConnectorJobResponse:
    channel_id = None
    prompt_text = None
    if job.prompt_id:
        context = db.query(PromptContext).filter(PromptContext.id == job.prompt_id).first()
        if context:
            channel_id = context.channel_id
            prompt_text = context.notes or context.description or context.title
            
    return ConnectorJobResponse(
        id=job.id,
        workspace_id=job.workspace_id,
        provider=job.provider,
        account_id=job.account_id,
        asset_type=job.asset_type,
        status=job.status,
        combo_id=job.combo_id,
        prompt_id=job.prompt_id,
        created_at=job.created_at,
        channel_id=channel_id,
        prompt=prompt_text
    )

@router.get("/jobs", response_model=List[ConnectorJobResponse])
def get_connector_jobs(
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ConnectorJob)
    if workspace_id:
        query = query.filter(ConnectorJob.workspace_id == workspace_id)
    jobs = query.order_by(ConnectorJob.created_at.desc()).all()
    return [to_job_response(job, db) for job in jobs]

@router.post("/jobs", response_model=ConnectorJobResponse)
def create_connector_job(
    job: ConnectorJobCreate,
    db: Session = Depends(get_db)
):
    db_job = ConnectorJob(
        id=str(uuid.uuid4()),
        workspace_id=job.workspace_id,
        provider=job.provider,
        account_id=job.account_id,
        asset_type=job.asset_type,
        status="pending",
        combo_id=job.combo_id,
        prompt_id=job.prompt_id
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return to_job_response(db_job, db)

@router.get("/jobs/active", response_model=Optional[ConnectorJobResponse])
def get_active_connector_job(
    workspace_id: Optional[str] = None,
    channel_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ConnectorJob).filter(ConnectorJob.status == "pending")
    if workspace_id:
        query = query.filter(ConnectorJob.workspace_id == workspace_id)
    if channel_id:
        query = query.join(PromptContext, ConnectorJob.prompt_id == PromptContext.id).filter(PromptContext.channel_id == channel_id)
    
    # Return the latest pending job
    job = query.order_by(ConnectorJob.created_at.desc()).first()
    if job:
        return to_job_response(job, db)
    return None

@router.get("/jobs/{job_id}", response_model=ConnectorJobResponse)
def get_connector_job(
    job_id: str,
    db: Session = Depends(get_db)
):
    job = db.query(ConnectorJob).filter(ConnectorJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Connector job not found")
        
    # Open the job if it is pending
    if job.status == "pending":
        job.status = "opened"
        db.commit()
        db.refresh(job)
        
    return to_job_response(job, db)


@router.delete("/jobs/{job_id}")
def delete_connector_job(
    job_id: str,
    db: Session = Depends(get_db)
):
    job = db.query(ConnectorJob).filter(ConnectorJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Connector job not found")
    db.delete(job)
    db.commit()
    return {"message": "Connector job deleted successfully"}


@router.delete("/jobs")
def clear_connector_jobs(
    workspace_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ConnectorJob)
    if workspace_id:
        query = query.filter(ConnectorJob.workspace_id == workspace_id)
    if status:
        if "," in status:
            query = query.filter(ConnectorJob.status.in_(status.split(",")))
        else:
            query = query.filter(ConnectorJob.status == status)
    
    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    return {"message": "Connector jobs cleared successfully", "deleted_count": deleted_count}


# --- Asset Inbox ---

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "txt", "md", "mp4", "mov", "mkv", "webm", "wav", "mp3"}

def validate_extension(filename: str):
    ext = filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension '{ext}' not allowed")
    return ext

def to_inbox_response(item: AssetInbox) -> AssetInboxResponse:
    return AssetInboxResponse(
        id=item.id,
        workspace_id=item.workspace_id,
        source=item.source,
        source_id=item.source_id,
        asset_type=item.asset_type,
        status=item.status,
        file_path=item.file_path,
        metadata=item.inbox_metadata,
        created_at=item.created_at
    )

@router.post("/inbox/upload", response_model=AssetInboxResponse)
async def upload_inbox_asset(
    workspace_id: str = Form(...),
    source: str = Form(...),
    source_id: Optional[str] = Form(None),
    asset_type: str = Form(...),
    metadata: Optional[str] = Form(None),
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
        source=source,
        source_id=source_id,
        asset_type=asset_type,
        status="pending",
        file_path=filepath,
        inbox_metadata=metadata
    )
    
    db.add(db_inbox)
    db.commit()
    db.refresh(db_inbox)
    return to_inbox_response(db_inbox)

@router.get("/inbox", response_model=List[AssetInboxResponse])
def get_inbox_assets(
    workspace_id: Optional[str] = None,
    status: Optional[str] = "pending",
    db: Session = Depends(get_db)
):
    query = db.query(AssetInbox)
    if workspace_id:
        query = query.filter(AssetInbox.workspace_id == workspace_id)
    if status:
        query = query.filter(AssetInbox.status == status)
    items = query.order_by(AssetInbox.created_at.desc()).all()
    return [to_inbox_response(item) for item in items]

@router.post("/inbox/{inbox_id}/approve", response_model=AssetInboxResponse)
def approve_inbox_asset(
    inbox_id: str,
    req: ApproveInboxAssetRequest,
    db: Session = Depends(get_db)
):
    inbox_item = db.query(AssetInbox).filter(AssetInbox.id == inbox_id).first()
    if not inbox_item:
        raise HTTPException(status_code=404, detail="Inbox item not found")
    
    if inbox_item.status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot approve item in status: {inbox_item.status}")
        
    # Find corresponding Channel if channel_id is provided
    channel = None
    if req.channel_id:
        channel = db.query(Channel).filter(Channel.id == req.channel_id).first()
        if not channel:
            raise HTTPException(status_code=404, detail="Target channel not found")
        
    # Check if the source file exists
    if not os.path.exists(inbox_item.file_path):
        raise HTTPException(status_code=404, detail="Source file missing from inbox storage")
        
    # Define target path under assets
    ext = inbox_item.file_path.split(".")[-1]
    asset_id = str(uuid.uuid4())
    safe_filename = f"{asset_id}.{ext}"
    
    if channel:
        target_dir = os.path.join(settings.DATA_PATH, "channels", channel.slug, inbox_item.asset_type)
    else:
        target_dir = os.path.join(settings.DATA_PATH, "shared", inbox_item.asset_type)
        
    os.makedirs(target_dir, exist_ok=True)
    target_path = os.path.join(target_dir, safe_filename)
    
    try:
        shutil.move(inbox_item.file_path, target_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move file to destination library: {str(e)}")
        
    file_size = os.path.getsize(target_path)
    mime_type = mimetypes.guess_type(target_path)[0] or "application/octet-stream"
    
    # Create main library Asset record
    db_asset = Asset(
        id=asset_id,
        channel_id=channel.id if channel else None,
        asset_type=inbox_item.asset_type,
        filename=f"imported_{inbox_item.source}_{inbox_item.asset_type}_{asset_id[:8]}.{ext}",
        file_path=target_path,
        file_size=file_size,
        mime_type=mime_type
    )
    db.add(db_asset)
    
    # Update active jobs matching this context to completed
    if inbox_item.source_id:
        job = db.query(ConnectorJob).filter(ConnectorJob.id == inbox_item.source_id).first()
        if job:
            job.status = "completed"
        
    # Mark inbox item as approved
    inbox_item.status = "approved"
    inbox_item.file_path = target_path # Update to new path
    
    db.commit()
    db.refresh(inbox_item)
    return to_inbox_response(inbox_item)

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
            
    # Update corresponding job status to failed
    if inbox_item.source_id:
        job = db.query(ConnectorJob).filter(ConnectorJob.id == inbox_item.source_id).first()
        if job:
            job.status = "failed"
        
    inbox_item.status = "rejected"
    db.commit()
    db.refresh(inbox_item)
    return to_inbox_response(inbox_item)

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
    return to_inbox_response(inbox_item)


import httpx
import json
import base64
import datetime

@router.post("/generate-single")
async def generate_single_model(
    req: SingleModelGenerationRequest,
    db: Session = Depends(get_db)
):
    audit_id = str(uuid.uuid4())
    execution_id = str(uuid.uuid4())
    
    endpoint_setting = db.query(SystemSetting).filter(SystemSetting.key == "single_model_endpoint").first()
    api_key_setting = db.query(SystemSetting).filter(SystemSetting.key == "single_model_api_key").first()
    
    endpoint = endpoint_setting.value if endpoint_setting else "http://localhost:20128/v1/images/generations"
    api_key = api_key_setting.value if api_key_setting else ""
    
    response_format = "b64_json" if "base64" in req.output_format.lower() else "url"
    payload = {
        "model": req.model,
        "prompt": req.prompt,
        "n": req.output_count,
        "size": req.size or "1280x720",
        "response_format": response_format
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
        
    audit_status = "success"
    error_msg = None
    saved_files = []
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
            
        if response.status_code != 200:
            raise Exception(f"API returned status {response.status_code}: {response.text}")
            
        try:
            data = response.json()
        except Exception as json_err:
            content_type = response.headers.get("content-type", "unknown")
            snippet = response.text[:500]
            raise ValueError(f"Expecting JSON response from API, but got Content-Type: '{content_type}' and body snippet: '{snippet}' (parsing error: {json_err})")
            
        if "data" not in data or not data["data"]:
            raise Exception(f"No image data returned in API response: {json.dumps(data)}")
            
        target_dir = os.path.join(settings.DATA_PATH, "shared", req.asset_type.lower())
        os.makedirs(target_dir, exist_ok=True)
        
        for idx, item in enumerate(data["data"]):
            asset_id = str(uuid.uuid4())
            ext = "png"
            safe_filename = f"{asset_id}.{ext}"
            filepath = os.path.join(target_dir, safe_filename)
            
            if response_format == "b64_json" and "b64_json" in item:
                img_data = base64.b64decode(item["b64_json"])
                with open(filepath, "wb") as f:
                    f.write(img_data)
            elif "url" in item:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    img_resp = await client.get(item["url"])
                if img_resp.status_code == 200:
                    with open(filepath, "wb") as f:
                        f.write(img_resp.content)
                else:
                    raise Exception(f"Failed to download image from URL: {item['url']}")
            else:
                raise Exception("Neither b64_json nor url was found in response item")
                
            file_size = os.path.getsize(filepath)
            mime_type = "image/png"
            
            db_asset = Asset(
                id=asset_id,
                channel_id=None,
                asset_type=req.asset_type.lower(),
                filename=f"single_{req.model.replace('/', '_')}_{asset_id[:8]}.{ext}",
                file_path=filepath,
                file_size=file_size,
                mime_type=mime_type
            )
            db.add(db_asset)
            saved_files.append(filepath)
            
    except Exception as e:
        audit_status = "failed"
        error_msg = str(e)
        
    db_audit = RuntimeAudit(
        id=audit_id,
        execution_id=execution_id,
        package_id="GLOBAL_WORKBOX",
        execution_type=req.asset_type,
        selected_prompt_id=None,
        selected_prompt_title=None,
        assigned_prompt_ids=None,
        assigned_prompt_titles=None,
        prompt_preview=req.prompt[:1000],
        combo_used=f"Single: {req.model}",
        status=audit_status,
        error_message=error_msg,
        executed_at=datetime.datetime.now(datetime.UTC)
    )
    db.add(db_audit)
    db.commit()
    
    if audit_status == "failed":
        raise HTTPException(status_code=400, detail=error_msg)
        
    return {"message": "Generation successful", "execution_id": execution_id, "files": saved_files}
