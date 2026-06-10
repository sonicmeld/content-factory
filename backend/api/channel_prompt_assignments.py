from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.database import get_db
from api.schemas import ChannelPromptAssignmentCreate, ChannelPromptAssignmentUpdate, ChannelPromptAssignmentResponse
from services import channel_prompt_assignment_service

router = APIRouter(tags=["channel_prompt_assignments"])

@router.get("/api/channels/{channel_id}/prompt-assignments", response_model=List[ChannelPromptAssignmentResponse])
def get_channel_prompt_assignments(channel_id: str, include_inactive: bool = False, db: Session = Depends(get_db)):
    """Retrieve all Prompt Assignments for a channel."""
    return channel_prompt_assignment_service.get_assignments(db, channel_id, include_inactive)

@router.post("/api/channels/{channel_id}/prompt-assignments", response_model=ChannelPromptAssignmentResponse)
def create_channel_prompt_assignment(
    channel_id: str,
    assignment_in: ChannelPromptAssignmentCreate,
    db: Session = Depends(get_db)
):
    """Create a new Prompt Assignment for a channel."""
    return channel_prompt_assignment_service.create_assignment(db, channel_id, assignment_in)

@router.put("/api/channels/{channel_id}/prompt-assignments/{assignment_id}", response_model=ChannelPromptAssignmentResponse)
def update_channel_prompt_assignment(
    channel_id: str,
    assignment_id: str,
    assignment_in: ChannelPromptAssignmentUpdate,
    db: Session = Depends(get_db)
):
    """Update a Prompt Assignment (e.g. reorder)."""
    db_assignment = channel_prompt_assignment_service.update_assignment(db, channel_id, assignment_id, assignment_in)
    if not db_assignment:
        raise HTTPException(status_code=404, detail="Prompt Assignment not found")
    return db_assignment

@router.delete("/api/channels/{channel_id}/prompt-assignments/{assignment_id}")
def delete_channel_prompt_assignment(channel_id: str, assignment_id: str, db: Session = Depends(get_db)):
    """Remove a Prompt Assignment."""
    success = channel_prompt_assignment_service.delete_assignment(db, channel_id, assignment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Prompt Assignment not found")
    return {"message": "Prompt Assignment removed successfully"}
