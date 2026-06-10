from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from database.database import get_db
from database.models import PackageGeneration, ContentPackage, Channel, RuntimeAudit, MetadataVariant

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
