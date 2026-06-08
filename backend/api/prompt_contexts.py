from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.database import get_db
from api.schemas import PromptContextCreate, PromptContextUpdate, PromptContextResponse
from services import prompt_context_service

router = APIRouter(tags=["prompt_contexts"])


@router.get("/api/channels/{channel_id}/prompt-contexts", response_model=List[PromptContextResponse])
def get_channel_prompt_contexts(channel_id: str, db: Session = Depends(get_db)):
    """Retrieve all Prompt Context records associated with a channel."""
    return prompt_context_service.get_prompt_contexts_by_channel(db, channel_id)


@router.post("/api/channels/{channel_id}/prompt-contexts", response_model=PromptContextResponse)
def create_channel_prompt_context(
    channel_id: str,
    context_in: PromptContextCreate,
    db: Session = Depends(get_db)
):
    """Create a new Prompt Context record for a channel."""
    return prompt_context_service.create_prompt_context(db, channel_id, context_in)


@router.put("/api/prompt-contexts/{id}", response_model=PromptContextResponse)
def update_prompt_context(
    id: str,
    context_in: PromptContextUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing Prompt Context record."""
    db_ctx = prompt_context_service.update_prompt_context(db, id, context_in)
    if not db_ctx:
        raise HTTPException(status_code=404, detail="Prompt context not found")
    return db_ctx


@router.delete("/api/prompt-contexts/{id}")
def delete_prompt_context(id: str, db: Session = Depends(get_db)):
    """Delete a Prompt Context record."""
    success = prompt_context_service.delete_prompt_context(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Prompt context not found")
    return {"message": "Prompt context deleted successfully"}
