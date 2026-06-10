from sqlalchemy.orm import Session
from typing import List, Optional
from repositories import channel_prompt_assignment_repository, prompt_context_repository
from api.schemas import ChannelPromptAssignmentCreate, ChannelPromptAssignmentUpdate
from database.models import ChannelPromptAssignment
from fastapi import HTTPException

def get_assignments(db: Session, channel_id: str, include_inactive: bool = False) -> List[dict]:
    assignments = channel_prompt_assignment_repository.get_assignments_by_channel(db, channel_id, include_inactive)
    result = []
    # Optionally enrich with prompt details
    for assignment in assignments:
        prompt = prompt_context_repository.get_by_id(db, assignment.prompt_id)
        if prompt:
            # We can return dicts or just the assignment objects based on needs
            result.append(assignment)
    return result

def create_assignment(db: Session, channel_id: str, data_in: ChannelPromptAssignmentCreate) -> ChannelPromptAssignment:
    # Verify prompt exists
    prompt = prompt_context_repository.get_by_id(db, data_in.prompt_id)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt context not found")
        
    assignment = channel_prompt_assignment_repository.create_assignment(db, channel_id, data_in.model_dump())
    if not assignment:
        raise HTTPException(status_code=400, detail="Assignment already exists or invalid data")
    return assignment

def update_assignment(db: Session, channel_id: str, assignment_id: str, updates: ChannelPromptAssignmentUpdate) -> Optional[ChannelPromptAssignment]:
    return channel_prompt_assignment_repository.update_assignment(db, channel_id, assignment_id, updates.model_dump(exclude_unset=True))

def delete_assignment(db: Session, channel_id: str, assignment_id: str) -> bool:
    return channel_prompt_assignment_repository.delete_assignment(db, channel_id, assignment_id)
