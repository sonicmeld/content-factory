from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from database.models import ChannelPromptAssignment, PromptContext
import uuid

def get_assignments_by_channel(db: Session, channel_id: str, include_inactive: bool = False) -> List[ChannelPromptAssignment]:
    query = db.query(ChannelPromptAssignment).filter(ChannelPromptAssignment.channel_id == channel_id)
    if not include_inactive:
        query = query.filter(ChannelPromptAssignment.is_active == 1)
    
    return query.order_by(ChannelPromptAssignment.assignment_order.asc()).all()

def get_assignment(db: Session, channel_id: str, assignment_id: str) -> Optional[ChannelPromptAssignment]:
    return db.query(ChannelPromptAssignment).filter(
        ChannelPromptAssignment.id == assignment_id,
        ChannelPromptAssignment.channel_id == channel_id
    ).first()

def get_assignment_by_prompt(db: Session, channel_id: str, prompt_id: str) -> Optional[ChannelPromptAssignment]:
    return db.query(ChannelPromptAssignment).filter(
        ChannelPromptAssignment.channel_id == channel_id,
        ChannelPromptAssignment.prompt_id == prompt_id
    ).first()

def create_assignment(db: Session, channel_id: str, data: dict) -> Optional[ChannelPromptAssignment]:
    # Need to get max assignment_order
    max_order = db.query(db.query(ChannelPromptAssignment).filter(
        ChannelPromptAssignment.channel_id == channel_id
    ).exists()).scalar()
    
    order = 1
    if max_order:
        last_assignment = db.query(ChannelPromptAssignment).filter(
            ChannelPromptAssignment.channel_id == channel_id
        ).order_by(ChannelPromptAssignment.assignment_order.desc()).first()
        if last_assignment:
            order = last_assignment.assignment_order + 1

    if "assignment_order" in data:
        order = data["assignment_order"]

    db_assignment = ChannelPromptAssignment(
        id=str(uuid.uuid4()),
        channel_id=channel_id,
        prompt_id=data["prompt_id"],
        assignment_order=order,
        is_active=data.get("is_active", 1)
    )
    
    try:
        db.add(db_assignment)
        db.commit()
        db.refresh(db_assignment)
        return db_assignment
    except IntegrityError:
        db.rollback()
        return None

def update_assignment(db: Session, channel_id: str, assignment_id: str, updates: dict) -> Optional[ChannelPromptAssignment]:
    db_assignment = get_assignment(db, channel_id, assignment_id)
    if db_assignment:
        for key, value in updates.items():
            setattr(db_assignment, key, value)
        db.commit()
        db.refresh(db_assignment)
    return db_assignment

def delete_assignment(db: Session, channel_id: str, assignment_id: str) -> bool:
    db_assignment = get_assignment(db, channel_id, assignment_id)
    if db_assignment:
        db.delete(db_assignment)
        db.commit()
        return True
    return False
