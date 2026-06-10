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
from repositories import package_generation_repository, prompt_context_repository
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


def generate_metadata(db: Session, package_id: str, context_id: Optional[str] = None) -> PackageGeneration:
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

    if not settings.NINE_ROUTER_URL or not settings.NINE_ROUTER_API_KEY:
        raise ValueError("9Router API is not configured. Set NINE_ROUTER_URL and NINE_ROUTER_API_KEY in .env")

    combo = (channel.metadata_combo or "").strip()

    # --- Step 2.5: Validate Combo Readiness ---
    from services.generation_combo_service import validate_metadata_ready
    from fastapi import HTTPException
    if not validate_metadata_ready(db, channel):
        raise HTTPException(
            status_code=400,
            detail="Selected Combo is missing or inactive."
        )

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

        # --- Sprint 7C-1: Runtime Core Composition ---
        from services.runtime_core_service import (
            resolve_prompt_chain,
            build_prompt_chain_text,
            build_runtime_payload,
            resolve_combo,
            create_runtime_audit,
            finalize_runtime_audit
        )
        
        # 1. Combo Resolver
        valid_combo = resolve_combo(combo)
        
        # 2. Prompt Resolver
        selected_prompt, assigned_prompts = resolve_prompt_chain(db, context_id, channel.id, "metadata")
        
        # 3. Prompt Composition Engine
        prompt_chain_text = build_prompt_chain_text(selected_prompt, assigned_prompts)
        
        # 4. Runtime Context Builder
        user_message = build_runtime_payload(prompt_chain_text, channel, package, timestamp_content, is_metadata=True)
        
        # 5. Create Runtime Audit (Pending)
        audit = create_runtime_audit(
            db, 
            package_id, 
            "metadata", 
            selected_prompt, 
            assigned_prompts, 
            valid_combo, 
            user_message
        )

        payload = {
            "model": combo,
            "stream": False,
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

        # Defensive logging before parsing
        status_code = response.status_code
        content_type = response.headers.get("content-type", "unknown")
        snippet = response.text[:500]
        print(f"[9Router Response Log] Status: {status_code}, Content-Type: {content_type}")
        print(f"[9Router Response Body Snippet]: {snippet}")

        try:
            data = response.json()
            if isinstance(data, dict) and "title" in data and "description" in data:
                title = data["title"]
                description = data["description"]
            else:
                raw_text = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )
                if not raw_text:
                    raise ValueError("No content returned in chat completion choices.")
                title, description = _parse_title_description(raw_text)
        except Exception as err:
            error_msg = f"Failed to parse metadata response: {str(err)} (Body: {snippet})"
            package_generation_repository.update_generation(
                db,
                package_id,
                {
                    "metadata_status": "failed",
                    "error_message": error_msg,
                },
            )
            finalize_runtime_audit(db, audit.execution_id, success=False, error_message=error_msg)
            # Return instead of raising to prevent crashing the worker/endpoint
            return package_generation_repository.get_by_package_id(db, package_id)

        # --- Step 7: Persist completed result ---
        # Sprint 7A-5: Create MetadataVariant instead of overwriting title/description
        import uuid
        from repositories.metadata_variant_repository import create as create_metadata_variant
        import logging

        logger = logging.getLogger(__name__)
        source_context = selected_prompt.title if selected_prompt else None
        
        variant_data = {
            "id": str(uuid.uuid4()),
            "package_generation_id": gen.id,
            "title": title,
            "description": description,
            "source_combo": combo,
            "source_context": source_context,
            "is_selected": 0,
        }
        create_metadata_variant(db, variant_data)
        
        # Sprint 7A-5 Audit Log
        logger.info(f"[AUDIT] metadata_variant_created: Package {package_id}, Combo {combo}, Context {source_context}")
        print(f"[AUDIT] metadata_variant_created: Package {package_id}, Combo {combo}, Context {source_context}")

        finalize_runtime_audit(db, audit.execution_id, success=True)

        return package_generation_repository.update_generation(
            db,
            package_id,
            {
                "metadata_status": "completed",
                "error_message": None,
                "metadata_combo_used": combo,
                "prompt_context_used": source_context,
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
        if 'audit' in locals() and hasattr(audit, 'execution_id'):
            finalize_runtime_audit(db, audit.execution_id, success=False, error_message=str(exc))
        raise

def select_metadata_variant(db: Session, package_id: str, variant_id: str) -> PackageGeneration:
    """
    Sprint 7A-5: Select a metadata variant and apply it to the PackageGeneration record.
    """
    from repositories.metadata_variant_repository import get_by_id, set_selected
    from fastapi import HTTPException
    import logging

    logger = logging.getLogger(__name__)

    variant = get_by_id(db, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Metadata Variant not found")
        
    gen = package_generation_repository.get_by_package_id(db, package_id)
    if not gen or gen.id != variant.package_generation_id:
        raise HTTPException(status_code=400, detail="Variant does not belong to this package generation")
        
    # Set selected
    set_selected(db, gen.id, variant_id)
    
    # Audit Log
    logger.info(f"[AUDIT] metadata_variant_selected: Package {package_id}, Variant {variant_id}, Combo {variant.source_combo}, Context {variant.source_context}")
    print(f"[AUDIT] metadata_variant_selected: Package {package_id}, Variant {variant_id}, Combo {variant.source_combo}, Context {variant.source_context}")

    # Synchronize into PackageGeneration
    return package_generation_repository.update_generation(
        db,
        package_id,
        {
            "title": variant.title,
            "description": variant.description,
            "metadata_combo_used": variant.source_combo,
            "prompt_context_used": variant.source_context,
        }
    )

def delete_metadata_variant(db: Session, variant_id: str) -> bool:
    """
    Sprint 7A-5: Delete a metadata variant. 
    Selected variants cannot be deleted.
    """
    from repositories.metadata_variant_repository import get_by_id, delete
    from fastapi import HTTPException
    import logging
    
    logger = logging.getLogger(__name__)

    variant = get_by_id(db, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Metadata Variant not found")
        
    if variant.is_selected == 1:
        raise HTTPException(status_code=400, detail="Cannot delete selected variant")
        
    package_id = "unknown"
    gen = package_generation_repository.get_by_id(db, variant.package_generation_id)
    if gen:
        package_id = gen.package_id

    delete(db, variant_id)
    
    # Audit Log
    logger.info(f"[AUDIT] metadata_variant_deleted: Package {package_id}, Variant {variant_id}, Combo {variant.source_combo}, Context {variant.source_context}")
    print(f"[AUDIT] metadata_variant_deleted: Package {package_id}, Variant {variant_id}, Combo {variant.source_combo}, Context {variant.source_context}")

    return True


def generate_thumbnail(db: Session, package_id: str, context_id: Optional[str] = None) -> PackageGeneration:
    """
    Sprint 7A-4 — Thumbnail Combo Engine.
    """
    # 1. Load package
    package = get_package(db, package_id)
    if not package:
        raise ValueError(f"Package '{package_id}' not found.")

    # 2. Load channel
    channel = get_channel(db, package.channel_id)
    if not channel:
        raise ValueError(f"Channel '{package.channel_id}' not found.")

    if not settings.NINE_ROUTER_URL or not settings.NINE_ROUTER_API_KEY:
        raise ValueError("9Router API is not configured. Set NINE_ROUTER_URL and NINE_ROUTER_API_KEY in .env")

    combo = (channel.thumbnail_combo or "").strip()

    # 3.5 Validate Combo Readiness
    from services.generation_combo_service import validate_thumbnail_ready
    from fastapi import HTTPException
    if not validate_thumbnail_ready(db, channel):
        raise HTTPException(
            status_code=400,
            detail="Selected Combo is missing or inactive."
        )

    # Ensure generation record exists
    gen = get_generation(db, package_id)
    if not gen:
        gen = create_generation_record(db, package_id)

    # Set processing status
    package_generation_repository.update_generation(
        db, package_id, {"thumbnail_status": "processing", "error_message": None}
    )

    try:
        video_filename = package.video_path.split("/")[-1].split("\\")[-1] if package.video_path else "unknown"
        timestamp_content = _read_timestamp_content(package.timestamp_path or "")

        # --- Sprint 7C-1: Runtime Core Composition ---
        from services.runtime_core_service import (
            resolve_prompt_chain,
            build_prompt_chain_text,
            build_runtime_payload,
            resolve_combo,
            create_runtime_audit,
            finalize_runtime_audit
        )
        
        # 1. Combo Resolver
        valid_combo = resolve_combo(combo)
        
        # 2. Prompt Resolver
        selected_prompt, assigned_prompts = resolve_prompt_chain(db, context_id, channel.id, "thumbnail")
        
        # 3. Prompt Composition Engine
        prompt_chain_text = build_prompt_chain_text(selected_prompt, assigned_prompts)
        
        # 4. Runtime Context Builder
        prompt = build_runtime_payload(prompt_chain_text, channel, package, timestamp_content, is_metadata=False)
        
        # 5. Create Runtime Audit (Pending)
        audit = create_runtime_audit(
            db, 
            package_id, 
            "thumbnail", 
            selected_prompt, 
            assigned_prompts, 
            valid_combo, 
            prompt
        )

        # 5. Call image service with model explicitly passed
        from services.image_service import generate_thumbnail as run_image_service
        
        output_path = run_image_service(db, prompt, package.channel_id, combo)
        filename = os.path.basename(output_path)

        # Save success
        finalize_runtime_audit(db, audit.execution_id, success=True)
        return package_generation_repository.update_generation(
            db,
            package_id,
            {
                "thumbnail_path": filename,
                "thumbnail_status": "completed",
                "error_message": None,
                "thumbnail_combo_used": combo,
                "prompt_context_used": selected_prompt.title if selected_prompt else None,
            },
        )

    except Exception as exc:
        package_generation_repository.update_generation(
            db,
            package_id,
            {
                "thumbnail_status": "failed",
                "error_message": str(exc),
            },
        )
        if 'audit' in locals() and hasattr(audit, 'execution_id'):
            finalize_runtime_audit(db, audit.execution_id, success=False, error_message=str(exc))
        raise

