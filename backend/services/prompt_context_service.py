from sqlalchemy.orm import Session
from typing import List, Optional
from repositories import prompt_context_repository
from api.schemas import PromptContextCreate, PromptContextUpdate
from database.models import PromptContext


def get_prompt_contexts_by_channel(db: Session, channel_id: str) -> List[PromptContext]:
    """Get all prompt contexts for a specific channel."""
    return prompt_context_repository.get_by_channel(db, channel_id)


def create_prompt_context(db: Session, channel_id: str, context_in: PromptContextCreate) -> PromptContext:
    """Create a new prompt context for a channel."""
    data = context_in.model_dump()
    return prompt_context_repository.create_context(db, channel_id, data)


def update_prompt_context(db: Session, id: str, context_in: PromptContextUpdate) -> Optional[PromptContext]:
    """Update an existing prompt context."""
    updates = context_in.model_dump(exclude_unset=True)
    return prompt_context_repository.update_context(db, id, updates)


def delete_prompt_context(db: Session, id: str) -> bool:
    """Delete a prompt context by ID."""
    return prompt_context_repository.delete_context(db, id)
