from sqlalchemy.orm import Session
from fastapi import HTTPException
from repositories import queue_repository
from repositories.packages import get_package
from database.models import ContentPackage

def get_queue(db: Session, channel_id: str):
    items = queue_repository.get_queue(db, channel_id)
    # Return enriched with package details
    results = []
    for item in items:
        pkg = get_package(db, item.package_id)
        if pkg:
            results.append({
                "package_id": item.package_id,
                "channel_id": item.channel_id,
                "queue_position": item.queue_position,
                "created_at": item.created_at,
                "package_number": pkg.package_number,
                "status": pkg.status,
                "video_path": pkg.video_path
            })
    return results

def add_to_queue(db: Session, package_id: str):
    pkg = get_package(db, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    
    if pkg.status != 'ready':
        raise HTTPException(status_code=400, detail="Only 'ready' packages can be queued")
        
    existing = queue_repository.get_queue_item(db, package_id)
    if existing:
        raise HTTPException(status_code=400, detail="Package is already in queue")
        
    # Set status
    pkg.status = 'queued'
    db.commit()
    
    item = queue_repository.add_to_queue(db, pkg.channel_id, pkg.id)
    return {"message": "Added to queue"}

def remove_from_queue(db: Session, package_id: str):
    pkg = get_package(db, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    
    existing = queue_repository.get_queue_item(db, package_id)
    if existing:
        queue_repository.remove_from_queue(db, package_id)
    
    if pkg.status == 'queued':
        pkg.status = 'ready'
        db.commit()
        
    return {"message": "Removed from queue"}

def reorder_queue(db: Session, channel_id: str, new_order: list[str]):
    queue_repository.reorder_queue(db, channel_id, new_order)
    return {"message": "Queue reordered successfully"}
