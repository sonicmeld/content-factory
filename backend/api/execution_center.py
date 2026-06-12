from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import uuid
import requests
import json
import os
from datetime import datetime
from pydantic import BaseModel

from database.database import get_db, SessionLocal
from database.models import PackageGeneration, ContentPackage, Channel, RuntimeAudit, MetadataVariant, GenerationAsset, GenerationCombo, PromptContext, MetadataLibrary, Asset
from app.config import settings
from services.image_service import generate_thumbnail, generate_footage

router = APIRouter(prefix="/api/execution-center", tags=["Execution Center"])

class GlobalGenerateRequest(BaseModel):
    asset_type: str  # 'Metadata' | 'Thumbnail' | 'Footage'
    combo_id: str
    prompt_ids: List[str]
    output_count: int = 1

@router.get("/tasks")
def get_execution_tasks(
    status: Optional[str] = None,
    channel_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns normalized execution records from RuntimeAudit.
    Frontend owns grouping into Active, Completed, Failed.
    """
    query = db.query(RuntimeAudit, ContentPackage, Channel).outerjoin(
        ContentPackage, RuntimeAudit.package_id == ContentPackage.id
    ).outerjoin(
        Channel, ContentPackage.channel_id == Channel.id
    )

    if channel_id:
        query = query.filter(ContentPackage.channel_id == channel_id)

    # Filter status based on runtime audit status mapping
    # pending -> active, success -> completed, failed -> failed
    if status:
        if status == "active":
            query = query.filter(RuntimeAudit.status == "pending")
        elif status == "completed":
            query = query.filter(RuntimeAudit.status == "success")
        elif status == "failed":
            query = query.filter(RuntimeAudit.status == "failed")
        else:
            query = query.filter(RuntimeAudit.status == status)

    records = query.order_by(desc(RuntimeAudit.executed_at)).limit(100).all()

    tasks = []
    for ra, cp, ch in records:
        tasks.append({
            "package_generation_id": ra.id,
            "package_id": cp.id if cp else ra.package_id,
            "channel_name": ch.name if ch else "Global",
            "channel_slug": ch.slug if ch else "shared",
            "package_number": cp.package_number if cp else "N/A",
            "execution_type": ra.execution_type,
            "status": "pending" if ra.status == "pending" else "completed" if ra.status == "success" else "failed",
            "source_type": "Generated"
        })

    return tasks

@router.get("/traces")
def get_execution_traces(
    db: Session = Depends(get_db)
):
    """
    Returns global runtime audits to populate the Traces feed.
    """
    query = db.query(RuntimeAudit, ContentPackage, Channel).outerjoin(
        ContentPackage, RuntimeAudit.package_id == ContentPackage.id
    ).outerjoin(
        Channel, ContentPackage.channel_id == Channel.id
    ).order_by(desc(RuntimeAudit.executed_at)).limit(100) # Limit to recent 100 for performance
    
    results = []
    for ra, cp, ch in query.all():
        results.append({
            "id": ra.id,
            "execution_id": ra.execution_id,
            "package_id": ra.package_id,
            "execution_type": ra.execution_type,
            "status": ra.status,
            "error_message": ra.error_message,
            "executed_at": ra.executed_at,
            "channel_name": ch.name if ch else "Global",
            "channel_slug": ch.slug if ch else "shared",
            "package_number": cp.package_number if cp else "N/A"
        })

    return results

@router.get("/workbox")
def get_workbox_packages(
    channel_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns a package-centric view for the Global Execution Workbox.
    Evaluates Production Gaps and Assembly Readiness dynamically.
    """
    query = db.query(PackageGeneration, ContentPackage, Channel).join(
        ContentPackage, PackageGeneration.package_id == ContentPackage.id
    ).join(
        Channel, ContentPackage.channel_id == Channel.id
    )

    if channel_id:
        query = query.filter(ContentPackage.channel_id == channel_id)

    records = query.all()
    gen_ids = [pg.id for pg, cp, ch in records]
    
    variants = []
    assets = []
    if gen_ids:
        variants = db.query(MetadataVariant).filter(MetadataVariant.package_generation_id.in_(gen_ids)).all()
        assets = db.query(GenerationAsset).filter(GenerationAsset.package_generation_id.in_(gen_ids)).all()
        
    variant_map = {}
    for v in variants:
        if v.package_generation_id not in variant_map:
            variant_map[v.package_generation_id] = []
        variant_map[v.package_generation_id].append(v)
        
    asset_map = {}
    for a in assets:
        if a.package_generation_id not in asset_map:
            asset_map[a.package_generation_id] = []
        asset_map[a.package_generation_id].append(a)

    workbox_packages = []
    REQUIRED_ASSET_TYPES = ['Metadata', 'Thumbnail']
    
    for pg, cp, ch in records:
        asset_statuses = {
            "Metadata": pg.metadata_status,
            "Thumbnail": pg.thumbnail_status
        }
        
        vs = variant_map.get(pg.id, [])
        ths = [a for a in asset_map.get(pg.id, []) if a.asset_type == 'thumbnail']
        
        has_mapped_metadata = any(v.is_selected for v in vs)
        has_mapped_thumbnail = any(t.is_selected for t in ths)
        
        mapped_assets = {
            "Metadata": has_mapped_metadata,
            "Thumbnail": has_mapped_thumbnail
        }
        
        is_ready = True
        has_partial = False
        for req_asset in REQUIRED_ASSET_TYPES:
            if not mapped_assets.get(req_asset):
                is_ready = False
            else:
                has_partial = True
                
        if is_ready:
            assembly_readiness = "READY"
        elif has_partial or any(s in ["completed", "pending", "processing"] for s in asset_statuses.values()):
            assembly_readiness = "PARTIAL"
        else:
            assembly_readiness = "BLOCKED"
            
        production_gaps = []
        for req_asset in REQUIRED_ASSET_TYPES:
            if not mapped_assets.get(req_asset):
                production_gaps.append(req_asset)
                
        production_sources = {}
        md_source = "Unknown"
        if pg.metadata_status == "completed":
            vs = variant_map.get(pg.id, [])
            if any(v.source_combo == "Library" for v in vs):
                md_source = "Library"
            elif any(v.source_combo for v in vs):
                md_source = "Generated"
            
        production_sources["Metadata"] = md_source
        production_sources["Thumbnail"] = "Unknown"
        
        workbox_packages.append({
            "package_generation_id": pg.id,
            "package_id": cp.id,
            "channel_id": ch.id,
            "channel_name": ch.name,
            "channel_slug": ch.slug,
            "package_number": cp.package_number,
            "package_status": cp.status,
            "assembly_readiness": assembly_readiness,
            "production_gaps": production_gaps,
            "asset_statuses": asset_statuses,
            "production_sources": production_sources
        })
        
    workbox_packages.sort(key=lambda x: str(x["package_generation_id"]), reverse=True)
    return workbox_packages

@router.post("/generate")
def generate_global_assets(
    request: GlobalGenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Triggers global asset generation (Metadata, Thumbnail, or Footage)
    independent of any Package.
    """
    # 1. Fetch Combo
    combo = db.query(GenerationCombo).filter(GenerationCombo.id == request.combo_id).first()
    if not combo:
        raise HTTPException(status_code=404, detail="Generation Combo not found.")
        
    # 2. Fetch Prompts to verify they exist and match the asset_type
    prompts = db.query(PromptContext).filter(PromptContext.id.in_(request.prompt_ids)).all()
    if len(prompts) != len(request.prompt_ids):
        found_ids = {p.id for p in prompts}
        missing_ids = [pid for pid in request.prompt_ids if pid not in found_ids]
        raise HTTPException(status_code=404, detail=f"Prompt context(s) not found: {', '.join(missing_ids)}")

    # Strict Prompt Type Isolation check
    expected_prompt_type = request.asset_type.lower()
    for p in prompts:
        if p.prompt_type != expected_prompt_type:
            raise HTTPException(
                status_code=400,
                detail=f"Prompt '{p.title}' type '{p.prompt_type}' does not match asset type '{expected_prompt_type}'"
            )

    # 3. Create Runtime Audit with package_id = "GLOBAL_WORKBOX"
    execution_id = str(uuid.uuid4())
    
    # Generate prompt chain text
    prompt_map = {p.id: p for p in prompts}
    ordered_prompts = [prompt_map[pid] for pid in request.prompt_ids if pid in prompt_map]
    chain_parts = []
    for idx, prompt in enumerate(ordered_prompts, start=1):
        chain_parts.append(f"=== PROMPT {idx}: {prompt.title.upper()} ===")
        if prompt.topic: chain_parts.append(f"Topic: {prompt.topic}")
        if prompt.keywords: chain_parts.append(f"Keywords: {prompt.keywords}")
        if prompt.notes: chain_parts.append(f"Notes: {prompt.notes}")
        if prompt.description: chain_parts.append(f"Description: {prompt.description}")
    
    prompt_chain_text = "\n".join(chain_parts)
    user_message = prompt_chain_text
    if request.asset_type.lower() != "metadata":
        user_message += "\nGenerate a professional concept/image based on the above information."

    assigned_ids = [p.id for p in ordered_prompts]
    assigned_titles = [p.title for p in ordered_prompts]
    
    audit = RuntimeAudit(
        id=str(uuid.uuid4()),
        execution_id=execution_id,
        package_id="GLOBAL_WORKBOX",
        execution_type=request.asset_type,
        selected_prompt_id=ordered_prompts[0].id if ordered_prompts else None,
        selected_prompt_title=ordered_prompts[0].title if ordered_prompts else None,
        assigned_prompt_ids=json.dumps(assigned_ids),
        assigned_prompt_titles=json.dumps(assigned_titles),
        prompt_preview=user_message[:1000],
        combo_used=combo.name,
        status="pending",
        error_message=None,
        executed_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)

    # 4. Trigger background task
    background_tasks.add_task(
        run_global_generation,
        request.asset_type,
        request.combo_id,
        request.prompt_ids,
        request.output_count,
        execution_id
    )

    return {"message": "Global asset generation started.", "execution_id": execution_id}


def run_global_generation(
    asset_type: str,
    combo_id: str,
    prompt_ids: List[str],
    output_count: int,
    execution_id: str
):
    db = SessionLocal()
    try:
        # 1. Fetch Combo
        combo = db.query(GenerationCombo).filter(GenerationCombo.id == combo_id).first()
        if not combo:
            raise ValueError(f"Combo '{combo_id}' not found.")

        # 2. Fetch Prompt Contexts
        prompt_contexts = db.query(PromptContext).filter(PromptContext.id.in_(prompt_ids)).all()
        prompt_map = {p.id: p for p in prompt_contexts}
        ordered_prompts = [prompt_map[pid] for pid in prompt_ids if pid in prompt_map]

        # 3. Build Prompt Chain
        chain_parts = []
        for idx, prompt in enumerate(ordered_prompts, start=1):
            chain_parts.append(f"=== PROMPT {idx}: {prompt.title.upper()} ===")
            if prompt.topic: chain_parts.append(f"Topic: {prompt.topic}")
            if prompt.keywords: chain_parts.append(f"Keywords: {prompt.keywords}")
            if prompt.notes: chain_parts.append(f"Notes: {prompt.notes}")
            if prompt.description: chain_parts.append(f"Description: {prompt.description}")
        
        prompt_chain_text = "\n".join(chain_parts)

        # Build runtime payload without package context
        is_metadata = asset_type.lower() == "metadata"
        user_message = prompt_chain_text
        if not is_metadata:
            user_message += "\nGenerate a professional concept/image based on the above information."

        # Fetch Audit
        audit = db.query(RuntimeAudit).filter(RuntimeAudit.execution_id == execution_id).first()

        # Execute generation loop based on output_count
        for i in range(output_count):
            if is_metadata:
                # Call LLM via 9Router
                payload = {
                    "model": combo.name,
                    "stream": False,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a YouTube metadata generator. "
                                "Based on the provided information, generate a compelling YouTube video title and description. "
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

                from services.runtime_core_service import sanitize_9router_payload
                payload, timeout_sec = sanitize_9router_payload(db, payload)

                api_url = f"{settings.NINE_ROUTER_URL.rstrip('/')}/v1/chat/completions"
                response = requests.post(api_url, json=payload, headers=headers, timeout=timeout_sec)
                response.raise_for_status()
                
                try:
                    data = response.json()
                except Exception as json_err:
                    content_type = response.headers.get("content-type", "unknown")
                    snippet = response.text[:500]
                    raise ValueError(f"Expecting JSON response from 9Router, but got Content-Type: '{content_type}' and body snippet: '{snippet}' (parsing error: {json_err})")

                raw_text = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )
                if not raw_text:
                    raise ValueError("No content returned in chat completion choices.")
                
                # Parse title and description
                from services.generation_service import _parse_title_description
                title, description = _parse_title_description(raw_text)

                # Save directly to MetadataLibrary
                tags_list = [p.keywords for p in ordered_prompts if p.keywords]
                tags_str = ", ".join(tags_list) if tags_list else None
                
                lib_item = MetadataLibrary(
                    id=str(uuid.uuid4()),
                    title=title,
                    description=description,
                    category=combo.category,
                    tags=tags_str,
                    source_variant_id=None,
                    is_active=True
                )
                db.add(lib_item)
                db.commit()
            else:
                # Image/Footage generation
                model_name = combo.name or "gemini/gemini-2.5-flash-image"
                
                if asset_type.lower() == "thumbnail":
                    output_path = generate_thumbnail(db, user_message, None, model_name)
                    # Register in Asset table for thumbnail only
                    asset = Asset(
                        id=str(uuid.uuid4()),
                        channel_id=None,
                        asset_type=asset_type.lower(),
                        filename=os.path.basename(output_path),
                        file_path=output_path,
                        file_size=os.path.getsize(output_path) if os.path.exists(output_path) else 0,
                        mime_type="image/png"
                    )
                    db.add(asset)
                    db.commit()
                else:
                    # Footage is only saved on disk and NOT registered in Asset table
                    output_path = generate_footage(db, user_message, None, model_name)

        # Update Audit to success
        if audit:
            audit.status = "success"
            db.commit()

    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger(__name__).error(f"Global generation failed: {str(e)}", exc_info=True)
        # Update Audit to failed
        if audit:
            audit.status = "failed"
            audit.error_message = str(e)[:1000]
            db.commit()
    finally:
        db.close()


