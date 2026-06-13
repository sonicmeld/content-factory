import hashlib
import uuid
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database.database import get_db
from database.models import CompanionRuntime, SystemSetting
from api.schemas import (
    CompanionRegisterRequest,
    CompanionRegisterResponse,
    CompanionMeResponse,
    CompanionRuntimeResponse
)
from api.companion_auth import get_current_runtime

router = APIRouter(prefix="/api/companion", tags=["companion"])

@router.post("/register", response_model=CompanionRegisterResponse)
def register_companion(
    req: CompanionRegisterRequest,
    db: Session = Depends(get_db)
):
    # 1. Check if registration is allowed in system_settings
    reg_setting = db.query(SystemSetting).filter(SystemSetting.key == "allow_runtime_registration").first()
    if reg_setting and reg_setting.value == "0":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Companion runtime registration is disabled by administrator."
        )

    # 2. Check runtime_name uniqueness
    existing_name = db.query(CompanionRuntime).filter(CompanionRuntime.runtime_name == req.runtime_name).first()
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Runtime name '{req.runtime_name}' is already registered."
        )

    # 3. Check client_id uniqueness
    existing_client = db.query(CompanionRuntime).filter(CompanionRuntime.client_id == req.client_id).first()
    if existing_client:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Client ID '{req.client_id}' is already registered."
        )

    # 4. Generate cryptographically secure token and SHA256 hash
    api_key = secrets.token_urlsafe(32)
    api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    runtime_id = str(uuid.uuid4())
    db_runtime = CompanionRuntime(
        id=runtime_id,
        runtime_name=req.runtime_name,
        client_id=req.client_id,
        api_key_hash=api_key_hash,
        status="offline",
        is_revoked=0
    )
    db.add(db_runtime)
    db.commit()
    db.refresh(db_runtime)

    return CompanionRegisterResponse(runtime_id=runtime_id, api_key=api_key)

@router.post("/heartbeat")
def post_heartbeat(
    current_runtime: CompanionRuntime = Depends(get_current_runtime),
    db: Session = Depends(get_db)
):
    # Update last seen and online status
    current_runtime.status = "online"
    current_runtime.last_seen_at = datetime.utcnow()
    db.commit()
    return {"status": "ok"}

@router.get("/me", response_model=CompanionMeResponse)
def get_me(
    current_runtime: CompanionRuntime = Depends(get_current_runtime)
):
    return current_runtime

@router.get("/runtimes", response_model=List[CompanionRuntimeResponse])
def get_runtimes(
    db: Session = Depends(get_db)
):
    runtimes = db.query(CompanionRuntime).order_by(CompanionRuntime.runtime_name).all()
    
    # Calculate online/offline status dynamically in memory
    now = datetime.utcnow()
    offline_threshold = now - timedelta(seconds=180)

    for r in runtimes:
        if r.is_revoked == 1:
            r.status = "revoked"
        elif not r.last_seen_at or r.last_seen_at < offline_threshold:
            r.status = "offline"
        else:
            r.status = "online"

    return runtimes

@router.post("/runtimes/{runtime_id}/revoke")
def revoke_runtime(
    runtime_id: str,
    db: Session = Depends(get_db)
):
    runtime = db.query(CompanionRuntime).filter(CompanionRuntime.id == runtime_id).first()
    if not runtime:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Companion Runtime not found."
        )

    # Invalidate runtime access by setting is_revoked flag
    runtime.is_revoked = 1
    runtime.status = "revoked"
    db.commit()

    return {"status": "ok"}
