"""
generation_service.py — Sprint 7A-1 Foundation Layer

Provides the business logic layer for the Generation Studio.
Sprint 7A-1 scope: record management and ready-state evaluation only.
9Router API calls are NOT implemented in this sprint.
"""

import uuid
from sqlalchemy.orm import Session
from typing import Optional

from database.models import PackageGeneration
from repositories import package_generation_repository
from repositories.packages import get_package


def create_generation_record(db: Session, package_id: str) -> PackageGeneration:
    """
    Create an initial PackageGeneration record for a Content Package.
    Both metadata_status and thumbnail_status are initialised to 'pending'.
    Raises ValueError if a generation record already exists for the package.
    """
    existing = package_generation_repository.get_by_package_id(db, package_id)
    if existing:
        raise ValueError(
            f"PackageGeneration record already exists for package_id={package_id}. "
            "Use update_generation_status() to modify it."
        )

    generation_data = {
        "id": str(uuid.uuid4()),
        "package_id": package_id,
        "title": None,
        "description": None,
        "thumbnail_path": None,
        "metadata_status": "pending",
        "thumbnail_status": "pending",
        "error_message": None,
    }
    return package_generation_repository.create_generation(db, generation_data)


def get_generation(db: Session, package_id: str) -> Optional[PackageGeneration]:
    """Return the PackageGeneration record for a given package_id, or None."""
    return package_generation_repository.get_by_package_id(db, package_id)


def update_generation_status(
    db: Session,
    package_id: str,
    *,
    metadata_status: Optional[str] = None,
    thumbnail_status: Optional[str] = None,
    title: Optional[str] = None,
    description: Optional[str] = None,
    thumbnail_path: Optional[str] = None,
    error_message: Optional[str] = None,
) -> Optional[PackageGeneration]:
    """
    Update one or more fields on a PackageGeneration record.
    Only keyword arguments that are not None will be applied.

    Valid status values: pending | processing | completed | failed
    """
    valid_statuses = {"pending", "processing", "completed", "failed"}

    if metadata_status and metadata_status not in valid_statuses:
        raise ValueError(f"Invalid metadata_status: '{metadata_status}'. Must be one of {valid_statuses}")
    if thumbnail_status and thumbnail_status not in valid_statuses:
        raise ValueError(f"Invalid thumbnail_status: '{thumbnail_status}'. Must be one of {valid_statuses}")

    updates = {}
    if metadata_status is not None:
        updates["metadata_status"] = metadata_status
    if thumbnail_status is not None:
        updates["thumbnail_status"] = thumbnail_status
    if title is not None:
        updates["title"] = title
    if description is not None:
        updates["description"] = description
    if thumbnail_path is not None:
        updates["thumbnail_path"] = thumbnail_path
    if error_message is not None:
        updates["error_message"] = error_message

    if not updates:
        return package_generation_repository.get_by_package_id(db, package_id)

    return package_generation_repository.update_generation(db, package_id, updates)


def is_package_ready(db: Session, package_id: str) -> bool:
    """
    Return True if a Content Package satisfies all conditions for 'Ready' status.

    Conditions (Architecture Lock Report — Sprint 7A):
        1. content_packages.video_path must exist (non-empty).
        2. A PackageGeneration record must exist for the package.
        3. package_generations.metadata_status == 'completed'.
        4. package_generations.thumbnail_status == 'completed'.
    """
    # Condition 1: Package must exist and have a video path
    package = get_package(db, package_id)
    if not package or not package.video_path:
        return False

    # Condition 2-4: Generation record must exist with both tracks completed
    gen = package_generation_repository.get_by_package_id(db, package_id)
    if not gen:
        return False

    return gen.metadata_status == "completed" and gen.thumbnail_status == "completed"
