from sqlalchemy.orm import Session
from database.models import UploadQueue, ContentPackage

def get_queue(db: Session, channel_id: str):
    return db.query(UploadQueue).filter(UploadQueue.channel_id == channel_id).order_by(UploadQueue.queue_position.asc()).all()

def get_queue_item(db: Session, package_id: str):
    return db.query(UploadQueue).filter(UploadQueue.package_id == package_id).first()

def add_to_queue(db: Session, channel_id: str, package_id: str):
    max_pos = db.query(UploadQueue).filter(UploadQueue.channel_id == channel_id).order_by(UploadQueue.queue_position.desc()).first()
    next_pos = 0 if not max_pos else max_pos.queue_position + 1
    
    item = UploadQueue(
        package_id=package_id,
        channel_id=channel_id,
        queue_position=next_pos
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

def remove_from_queue(db: Session, package_id: str):
    item = db.query(UploadQueue).filter(UploadQueue.package_id == package_id).first()
    if item:
        channel_id = item.channel_id
        db.delete(item)
        db.commit()
        # Reorder remaining
        remaining = db.query(UploadQueue).filter(UploadQueue.channel_id == channel_id).order_by(UploadQueue.queue_position.asc()).all()
        for idx, r in enumerate(remaining):
            r.queue_position = idx
        db.commit()

def reorder_queue(db: Session, channel_id: str, new_order: list[str]):
    items = db.query(UploadQueue).filter(UploadQueue.channel_id == channel_id).all()
    for item in items:
        try:
            new_pos = new_order.index(item.package_id)
            item.queue_position = new_pos
        except ValueError:
            pass
    db.commit()
