from sqlalchemy.orm import Session
from typing import List, Optional
from repositories import prompt_context_repository
from api.schemas import PromptContextCreate, PromptContextUpdate
from fastapi import HTTPException
from database.models import PromptContext

def _validate_context_content(data: dict):
    topic = data.get("topic", "")
    keywords = data.get("keywords", "")
    notes = data.get("notes", "")
    if not (topic or keywords or notes):
        raise HTTPException(
            status_code=400,
            detail="Prompt Context must contain at least one of: Topic, Keywords, or Notes."
        )


def get_prompt_contexts_by_channel(db: Session, channel_id: str, include_inactive: bool = False) -> List[PromptContext]:
    """Get all prompt contexts for a specific channel."""
    return prompt_context_repository.get_by_channel(db, channel_id, include_inactive)


def create_prompt_context(db: Session, channel_id: str, context_in: PromptContextCreate) -> PromptContext:
    """Create a new prompt context for a channel."""
    data = context_in.model_dump()
    _validate_context_content(data)
    return prompt_context_repository.create_context(db, channel_id, data)


def update_prompt_context(db: Session, id: str, context_in: PromptContextUpdate) -> Optional[PromptContext]:
    """Update an existing prompt context."""
    updates = context_in.model_dump(exclude_unset=True)
    
    # Need to check the current db state or merged state
    current_ctx = prompt_context_repository.get_by_id(db, id)
    if current_ctx:
        merged_data = {
            "topic": updates.get("topic", current_ctx.topic),
            "keywords": updates.get("keywords", current_ctx.keywords),
            "notes": updates.get("notes", current_ctx.notes),
        }
        _validate_context_content(merged_data)

    return prompt_context_repository.update_context(db, id, updates)


def delete_prompt_context(db: Session, id: str) -> bool:
    """Delete a prompt context by ID."""
    return prompt_context_repository.delete_context(db, id)
