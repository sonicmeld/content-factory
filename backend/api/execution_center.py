from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from database.database import get_db
from database.models import PackageGeneration, ContentPackage, Channel, RuntimeAudit, MetadataVariant, GenerationAsset

router = APIRouter(prefix="/api/execution-center", tags=["Execution Center"])

@router.get("/tasks")
def get_execution_tasks(
    status: Optional[str] = None,
    channel_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns normalized execution records.
    Frontend owns grouping into Active, Completed, Failed.
    """
    query = db.query(PackageGeneration, ContentPackage, Channel).join(
        ContentPackage, PackageGeneration.package_id == ContentPackage.id
    ).join(
        Channel, ContentPackage.channel_id == Channel.id
    )

    if channel_id:
        query = query.filter(ContentPackage.channel_id == channel_id)

    records = query.all()

    # Pre-fetch variants to determine Source Type for completed metadata tasks
    gen_ids = [pg.id for pg, cp, ch in records]
    
    variants = []
    if gen_ids:
        variants = db.query(MetadataVariant).filter(MetadataVariant.package_generation_id.in_(gen_ids)).all()
        
    variant_map = {}
    for v in variants:
        if v.package_generation_id not in variant_map:
            variant_map[v.package_generation_id] = []
        variant_map[v.package_generation_id].append(v)

    tasks = []
    
    for pg, cp, ch in records:
        # Metadata Task extraction
        md_status = pg.metadata_status
        
        # Source Type Unknown Fallback applied if not completed
        source_type = "Unknown"
        if md_status == "completed":
            source_type = "Generated" # Default for completed
            vs = variant_map.get(pg.id, [])
            if any(v.source_combo == "Library" for v in vs):
                source_type = "Library"
        elif md_status in ["pending", "processing", "failed"]:
            source_type = "Generated" # Execution in progress/failed usually means it's being generated
            
        tasks.append({
            "package_generation_id": pg.id,
            "package_id": cp.id,
            "channel_name": ch.name,
            "channel_slug": ch.slug,
            "package_number": cp.package_number,
            "execution_type": "Metadata",
            "status": md_status,
            "source_type": source_type
        })

        # Thumbnail Task extraction
        th_status = pg.thumbnail_status
        th_source_type = "Generated" if th_status in ["pending", "processing", "failed", "completed"] else "Unknown"
        
        tasks.append({
            "package_generation_id": pg.id,
            "package_id": cp.id,
            "channel_name": ch.name,
            "channel_slug": ch.slug,
            "package_number": cp.package_number,
            "execution_type": "Thumbnail",
            "status": th_status,
            "source_type": th_source_type
        })

    # If the API receives a status filter, apply it here
    if status:
        if status == "active":
            tasks = [t for t in tasks if t["status"] in ["pending", "processing"]]
        else:
            tasks = [t for t in tasks if t["status"] == status]

    # Sort descending by package generation id roughly equates to creation time
    # But for a stable UI, sort by package_id / generation_id
    tasks.sort(key=lambda x: str(x["package_generation_id"]), reverse=True)

    return tasks

@router.get("/traces")
def get_execution_traces(
    db: Session = Depends(get_db)
):
    """
    Returns global runtime audits to populate the Traces feed.
    """
    query = db.query(RuntimeAudit, ContentPackage, Channel).join(
        ContentPackage, RuntimeAudit.package_id == ContentPackage.id
    ).join(
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
            "channel_name": ch.name,
            "channel_slug": ch.slug,
            "package_number": cp.package_number
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
    
    Production Gaps are operational projections.
    Current implementation derives gaps from package_generations.
    Future implementations may derive gaps from Production Asset availability directly.
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
    
    # REQUIRED_ASSET_TYPES defines what mapped assets must exist for a package to be READY
    REQUIRED_ASSET_TYPES = ['Metadata', 'Thumbnail']
    
    for pg, cp, ch in records:
        # Generation execution status (for legacy reporting / history)
        asset_statuses = {
            "Metadata": pg.metadata_status,
            "Thumbnail": pg.thumbnail_status
        }
        
        # Mapped Status Evaluator (Opsi B)
        # Check if there is an explicit mapping (is_selected=True)
        vs = variant_map.get(pg.id, [])
        ths = [a for a in asset_map.get(pg.id, []) if a.asset_type == 'thumbnail']
        
        has_mapped_metadata = any(v.is_selected for v in vs)
        has_mapped_thumbnail = any(t.is_selected for t in ths)
        
        mapped_assets = {
            "Metadata": has_mapped_metadata,
            "Thumbnail": has_mapped_thumbnail
        }
        
        # 1. Evaluate Assembly Readiness based on Mapped Assets
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
            
        # 2. Evaluate Production Gaps
        # A gap exists if a REQUIRED asset is NOT mapped.
        production_gaps = []
        for req_asset in REQUIRED_ASSET_TYPES:
            if not mapped_assets.get(req_asset):
                production_gaps.append(req_asset)
                
        # 3. Evaluate Production Sources (with strict Unknown fallback)
        production_sources = {}
        
        # Metadata Source
        md_source = "Unknown"
        if pg.metadata_status == "completed":
            vs = variant_map.get(pg.id, [])
            if any(v.source_combo == "Library" for v in vs):
                md_source = "Library"
            elif any(v.source_combo for v in vs):
                md_source = "Generated"
            # If no variants or source_combo is empty, it stays Unknown
            
        production_sources["Metadata"] = md_source
        
        # Thumbnail Source
        production_sources["Thumbnail"] = "Unknown"
        
        workbox_packages.append({
            "package_generation_id": pg.id,
            "package_id": cp.id,
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

