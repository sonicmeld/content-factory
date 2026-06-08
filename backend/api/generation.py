"""
api/generation.py — Sprint 7A-1 Foundation Layer

Read-only API endpoints for the Generation Studio.
Sprint 7A-1 scope: retrieval and record initialisation only.
9Router execution endpoints will be added in Sprint 7A-2.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from api.schemas import PackageGenerationResponse
from repositories.packages import get_package
from services import generation_service

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
