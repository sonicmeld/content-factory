"""
generation_service.py — Generation Studio Service Layer

Sprint 7A-1: Foundation (record management + is_package_ready).
Sprint 7A-3: Metadata Combo Engine (generate_metadata via 9Router).
"""

import os
import uuid
import requests
from sqlalchemy.orm import Session
from typing import Optional

from database.models import PackageGeneration
from repositories import package_generation_repository
from repositories.packages import get_package
from repositories.channel_repository import get_channel
from app.config import settings


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


def _build_9router_url() -> str:
    """Build the normalised 9Router /v1/chat/completions URL from settings."""
    base = settings.NINE_ROUTER_URL.rstrip("/")
    if not base.endswith("/v1"):
        base = f"{base}/v1"
    return f"{base}/chat/completions"


def _read_timestamp_content(timestamp_path: str) -> str:
    """Read the timestamp file content, returning empty string if unavailable."""
    if not timestamp_path:
        return ""
    try:
        # Resolve absolute path — mirror the same resolution used by packages.py
        abs_path = timestamp_path
        if not os.path.isabs(abs_path):
            data_root = os.path.abspath(settings.DATA_PATH)
            abs_path = os.path.join(data_root, timestamp_path)
        if os.path.exists(abs_path):
            with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read(4000)  # cap at 4 KB to keep prompt manageable
    except Exception:
        pass
    return ""


def _parse_title_description(text: str) -> tuple[str, str]:
    """
    Parse the 9Router response text into (title, description).

    Expected format (flexible):
        Title: <text>
        Description: <text>

    If the LLM does not follow the format, the first line becomes the title
    and the remainder becomes the description.
    """
    title = ""
    description = ""
    lines = [l.strip() for l in text.strip().splitlines()]

    for i, line in enumerate(lines):
        lower = line.lower()
        if lower.startswith("title:"):
            title = line.split(":", 1)[1].strip()
        elif lower.startswith("description:"):
            description = "\n".join(
                [line.split(":", 1)[1].strip()] + lines[i + 1:]
            ).strip()
            break

    # Fallback: use raw text split
    if not title and lines:
        title = lines[0]
        description = "\n".join(lines[1:]).strip() if len(lines) > 1 else ""

    return title, description


def generate_metadata(db: Session, package_id: str) -> PackageGeneration:
    """
    Sprint 7A-3 — Metadata Combo Engine.

    Flow:
        1. Load Package + Channel
        2. Validate 9Router config and metadata_combo
        3. Ensure PackageGeneration record exists (create if missing)
        4. Set metadata_status = 'processing'
        5. Call 9Router /v1/chat/completions with channel.metadata_combo as model
        6. Parse Title + Description from response
        7. Persist results → metadata_status = 'completed'
        8. On any error → metadata_status = 'failed', error_message = str(e)

    Never raises to the caller — all errors are captured into the generation record.
    """
    # --- Step 1: Load Package ---
    package = get_package(db, package_id)
    if not package:
        raise ValueError(f"Package '{package_id}' not found.")

    # --- Step 2: Load Channel ---
    channel = get_channel(db, package.channel_id)
    if not channel:
        raise ValueError(f"Channel '{package.channel_id}' not found.")

    combo = (channel.metadata_combo or "").strip()
    if not combo:
        raise ValueError(
            "metadata_combo is not configured for this channel. "
            "Go to Channel Settings → Generation Studio to set it."
        )

    if not settings.NINE_ROUTER_URL or not settings.NINE_ROUTER_API_KEY:
        raise ValueError("9Router API is not configured. Set NINE_ROUTER_URL and NINE_ROUTER_API_KEY in .env")

    # --- Step 3: Ensure generation record exists ---
    gen = package_generation_repository.get_by_package_id(db, package_id)
    if not gen:
        gen = create_generation_record(db, package_id)

    # --- Step 4: Set processing ---
    package_generation_repository.update_generation(
        db, package_id, {"metadata_status": "processing", "error_message": None}
    )

    # --- Step 5–7: Call 9Router ---
    try:
        video_filename = package.video_path.split("/")[-1].split("\\")[-1] if package.video_path else "unknown"
        timestamp_content = _read_timestamp_content(package.timestamp_path or "")

        user_message = (
            f"Channel: {channel.name}\n"
            f"Package Number: {package.package_number}\n"
            f"Video File: {video_filename}\n"
        )
        if timestamp_content:
            user_message += f"\nTimestamp File Content:\n{timestamp_content}"

        payload = {
            "model": combo,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a YouTube metadata generator. "
                        "Based on the provided package information, generate a compelling YouTube video title and description. "
                        "Respond ONLY in this format:\n"
                        "Title: <video title here>\n"
                        "Description: <video description here>"
                    ),
                },
                {"role": "user", "content": user_message},
            ],
        }

        headers = {
            "Authorization": f"Bearer {settings.NINE_ROUTER_API_KEY}",
            "Content-Type": "application/json",
        }

        response = requests.post(
            _build_9router_url(),
            json=payload,
            headers=headers,
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        raw_text = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )

        title, description = _parse_title_description(raw_text)

        # --- Step 7: Persist completed result ---
        return package_generation_repository.update_generation(
            db,
            package_id,
            {
                "title": title,
                "description": description,
                "metadata_status": "completed",
                "error_message": None,
            },
        )

    except Exception as exc:
        # --- Step 8: Failure handling ---
        package_generation_repository.update_generation(
            db,
            package_id,
            {
                "metadata_status": "failed",
                "error_message": str(exc),
            },
        )
        raise
