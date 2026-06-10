"""
api/generation.py — Sprint 7A-3 Metadata Combo Engine

API endpoints for the Generation Studio, including metadata generation.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from database.database import get_db, SessionLocal
from api.schemas import PackageGenerationResponse, GenerateMetadataRequest
from repositories.packages import get_package
from repositories.channel_repository import get_channel
from repositories import prompt_context_repository
from services import generation_service
from app.config import settings

router = APIRouter(prefix="/api/packages", tags=["generation"])


@router.get("/{package_id}/generation", response_model=PackageGenerationResponse)
def get_package_generation(package_id: str, db: Session = Depends(get_db)):
    """
    Retrieve the Generation Studio record for a Content Package.

    Returns 404 if the package does not exist.
    Returns 404 if no generation record has been initialised for this package.
    Includes an `is_ready` flag computed from the Architecture Lock rules.
    """
    package = get_package(db, package_id)
    if not package:
        raise HTTPException(status_code=404, detail=f"Package '{package_id}' not found.")

    gen = generation_service.get_generation(db, package_id)
    if not gen:
        raise HTTPException(
            status_code=404,
            detail=f"No generation record found for package '{package_id}'. "
                   "Trigger generation first.",
        )

    ready = generation_service.is_package_ready(db, package_id)

    # Manually build response with computed is_ready
    return PackageGenerationResponse(
        id=gen.id,
        package_id=gen.package_id,
        title=gen.title,
        description=gen.description,
        thumbnail_path=gen.thumbnail_path,
        metadata_status=gen.metadata_status,
        thumbnail_status=gen.thumbnail_status,
        error_message=gen.error_message,
        is_ready=ready,
        created_at=gen.created_at,
        updated_at=gen.updated_at,
    )


@router.post("/{package_id}/generate-metadata", response_model=PackageGenerationResponse)
def generate_package_metadata(
    package_id: str,
    background_tasks: BackgroundTasks,
    request_data: Optional[GenerateMetadataRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Trigger generation of video metadata (Title + Description) via 9Router.
    Runs asynchronously in the background. Sets metadata_status to 'processing' immediately.
    """
    # 1. Load and validate package exists
    package = get_package(db, package_id)
    if not package:
        raise HTTPException(status_code=404, detail=f"Package '{package_id}' not found.")

    # 2. Load and validate channel
    channel = get_channel(db, package.channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail=f"Channel '{package.channel_id}' not found.")

    combo = (channel.metadata_combo or "").strip()
    if not combo:
        raise HTTPException(
            status_code=400,
            detail="metadata_combo is not configured for this channel. Go to Channel Settings -> Generation Studio to set it."
        )

    if not settings.NINE_ROUTER_URL or not settings.NINE_ROUTER_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="9Router API is not configured on the backend. Check NINE_ROUTER_URL and NINE_ROUTER_API_KEY settings."
        )

    # 2.1 Extract and validate context_id if provided
    context_id = None
    if request_data and request_data.context_id:
        context_id = request_data.context_id
        ctx = prompt_context_repository.get_by_id(db, context_id)
        if not ctx:
            raise HTTPException(status_code=404, detail="Prompt Context not found.")
        if ctx.channel_id != package.channel_id:
            raise HTTPException(
                status_code=400,
                detail="Prompt Context does not belong to Package Channel"
            )

    # 3. Ensure PackageGeneration record exists
    gen = generation_service.get_generation(db, package_id)
    if not gen:
        gen = generation_service.create_generation_record(db, package_id)

    # 4. Set status to processing synchronously
    generation_service.update_generation_status(
        db, package_id, metadata_status="processing", error_message=None
    )
    db.commit()

    # 5. Background task to call 9Router & save result
    def run_generation():
        db_bg = SessionLocal()
        try:
            generation_service.generate_metadata(db_bg, package_id, context_id=context_id)
        except Exception:
            pass  # Error status is already saved in the database inside generate_metadata
        finally:
            db_bg.close()

    background_tasks.add_task(run_generation)

    # Reload record to return latest status
    db.refresh(gen)
    ready = generation_service.is_package_ready(db, package_id)
    return PackageGenerationResponse(
        id=gen.id,
        package_id=gen.package_id,
        title=gen.title,
        description=gen.description,
        thumbnail_path=gen.thumbnail_path,
        metadata_status=gen.metadata_status,
        thumbnail_status=gen.thumbnail_status,
        error_message=gen.error_message,
        is_ready=ready,
        created_at=gen.created_at,
        updated_at=gen.updated_at,
    )


@router.post("/{package_id}/generate-thumbnail", response_model=PackageGenerationResponse)
def generate_package_thumbnail(
    package_id: str,
    background_tasks: BackgroundTasks,
    request_data: Optional[GenerateMetadataRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Trigger generation of video thumbnail via 9Router.
    Runs asynchronously in the background. Sets thumbnail_status to 'processing' immediately.
    """
    # 1. Load and validate package exists
    package = get_package(db, package_id)
    if not package:
        raise HTTPException(status_code=404, detail=f"Package '{package_id}' not found.")

    # 2. Load and validate channel
    channel = get_channel(db, package.channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail=f"Channel '{package.channel_id}' not found.")

    combo = (channel.thumbnail_combo or "").strip()
    if not combo:
        raise HTTPException(
            status_code=400,
            detail="thumbnail_combo is not configured for this channel. Go to Channel Settings -> Generation Studio to set it."
        )

    if not settings.NINE_ROUTER_URL or not settings.NINE_ROUTER_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="9Router API is not configured on the backend. Check NINE_ROUTER_URL and NINE_ROUTER_API_KEY settings."
        )

    # 2.1 Extract and validate context_id if provided
    context_id = None
    if request_data and request_data.context_id:
        context_id = request_data.context_id
        ctx = prompt_context_repository.get_by_id(db, context_id)
        if not ctx:
            raise HTTPException(status_code=404, detail="Prompt Context not found.")
        if ctx.channel_id != package.channel_id:
            raise HTTPException(
                status_code=400,
                detail="Prompt Context does not belong to Package Channel"
            )

    # 3. Ensure PackageGeneration record exists
    gen = generation_service.get_generation(db, package_id)
    if not gen:
        gen = generation_service.create_generation_record(db, package_id)

    # 4. Set status to processing synchronously
    generation_service.update_generation_status(
        db, package_id, thumbnail_status="processing", error_message=None
    )
    db.commit()

    # 5. Background task to call 9Router & save result
    def run_generation():
        db_bg = SessionLocal()
        try:
            generation_service.generate_thumbnail(db_bg, package_id, context_id=context_id)
        except Exception:
            pass  # Error status is already saved in the database inside generate_thumbnail
        finally:
            db_bg.close()

    background_tasks.add_task(run_generation)

    # Reload record to return latest status
    db.refresh(gen)
    ready = generation_service.is_package_ready(db, package_id)
    return PackageGenerationResponse(
        id=gen.id,
        package_id=gen.package_id,
        title=gen.title,
        description=gen.description,
        thumbnail_path=gen.thumbnail_path,
        metadata_status=gen.metadata_status,
        thumbnail_status=gen.thumbnail_status,
        error_message=gen.error_message,
        is_ready=ready,
        created_at=gen.created_at,
        updated_at=gen.updated_at,
    )


from typing import List
from api.schemas import MetadataVariantResponse
from repositories import metadata_variant_repository

@router.get("/{package_id}/metadata-variants", response_model=List[MetadataVariantResponse])
def get_metadata_variants(package_id: str, db: Session = Depends(get_db)):
    """
    Retrieve all metadata variants for a given package.
    """
    gen = generation_service.get_generation(db, package_id)
    if not gen:
        return []
    
    return metadata_variant_repository.get_by_generation_id(db, gen.id)


@router.post("/{package_id}/metadata-variants/{variant_id}/select", response_model=PackageGenerationResponse)
def select_metadata_variant(package_id: str, variant_id: str, db: Session = Depends(get_db)):
    """
    Select a specific metadata variant as the active metadata for the package.
    """
    try:
        updated_gen = generation_service.select_metadata_variant(db, package_id, variant_id)
        ready = generation_service.is_package_ready(db, package_id)
        
        return PackageGenerationResponse(
            id=updated_gen.id,
            package_id=updated_gen.package_id,
            title=updated_gen.title,
            description=updated_gen.description,
            thumbnail_path=updated_gen.thumbnail_path,
            metadata_status=updated_gen.metadata_status,
            thumbnail_status=updated_gen.thumbnail_status,
            error_message=updated_gen.error_message,
            is_ready=ready,
            created_at=updated_gen.created_at,
            updated_at=updated_gen.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

from database.models import RuntimeAudit
from api.schemas import RuntimeAuditResponse

@router.get("/{package_id}/runtime-audits", response_model=List[RuntimeAuditResponse])
def get_runtime_audits(package_id: str, db: Session = Depends(get_db)):
    """
    Retrieve all runtime audits for a given package, ordered by newest first.
    """
    # Verify package exists
    package = get_package(db, package_id)
    if not package:
        raise HTTPException(status_code=404, detail=f"Package '{package_id}' not found.")
        
    audits = (
        db.query(RuntimeAudit)
        .filter(RuntimeAudit.package_id == package_id)
        .order_by(RuntimeAudit.executed_at.desc())
        .all()
    )
    return audits
