from sqlalchemy.orm import Session
from typing import List, Optional
from database.models import PromptContext
import uuid


def get_by_id(db: Session, id: str) -> Optional[PromptContext]:
    """Retrieve a PromptContext record by its ID."""
    return db.query(PromptContext).filter(PromptContext.id == id).first()


def get_by_channel(db: Session, channel_id: str) -> List[PromptContext]:
    """Retrieve all PromptContext records associated with a channel."""
    return (
        db.query(PromptContext)
        .filter(PromptContext.channel_id == channel_id)
        .order_by(PromptContext.created_at.desc())
        .all()
    )


def create_context(db: Session, channel_id: str, data: dict) -> PromptContext:
    """Create a new PromptContext record."""
    db_ctx = PromptContext(
        id=str(uuid.uuid4()),
        channel_id=channel_id,
        title=data["title"],
        topic=data.get("topic"),
        keywords=data.get("keywords"),
        notes=data.get("notes"),
    )
    db.add(db_ctx)
    db.commit()
    db.refresh(db_ctx)
    return db_ctx


def update_context(db: Session, id: str, updates: dict) -> Optional[PromptContext]:
    """Update an existing PromptContext record."""
    db_ctx = get_by_id(db, id)
    if db_ctx:
        for key, value in updates.items():
            setattr(db_ctx, key, value)
        db.commit()
        db.refresh(db_ctx)
    return db_ctx


def delete_context(db: Session, id: str) -> bool:
    """Delete a PromptContext record."""
    db_ctx = get_by_id(db, id)
    if db_ctx:
        db.delete(db_ctx)
        db.commit()
        return True
    return False
