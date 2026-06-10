from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import Channel, PromptContext, GenerationCombo, ChannelPromptAssignment
from services.generation_combo_service import validate_metadata_ready, validate_thumbnail_ready, validate_footage_ready
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/diagnostics",
    tags=["diagnostics"]
)

class GenerationReadinessResponse(BaseModel):
    metadata_ready: bool
    thumbnail_ready: bool
    footage_ready: bool
    active_prompt_contexts: int
    active_combos: int

@router.get("/generation-readiness/{channel_id}", response_model=GenerationReadinessResponse)
def get_generation_readiness(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        return GenerationReadinessResponse(
            metadata_ready=False,
            thumbnail_ready=False,
            footage_ready=False,
            active_prompt_contexts=0,
            active_combos=0
        )
    
    metadata_ready = validate_metadata_ready(db, channel)
    thumbnail_ready = validate_thumbnail_ready(db, channel)
    footage_ready = validate_footage_ready(db, channel)
    
    active_assignments = db.query(ChannelPromptAssignment).filter(
        ChannelPromptAssignment.channel_id == channel_id,
        ChannelPromptAssignment.is_active == 1
    ).count()

    if active_assignments > 0:
        active_prompt_contexts = active_assignments
    else:
        # Legacy fallback
        active_prompt_contexts = db.query(PromptContext).filter(
            PromptContext.channel_id == channel_id,
            PromptContext.is_active == 1
        ).count()
    
    active_combos = db.query(GenerationCombo).filter(
        GenerationCombo.is_active == 1
    ).count()
    
    return GenerationReadinessResponse(
        metadata_ready=metadata_ready,
        thumbnail_ready=thumbnail_ready,
        footage_ready=footage_ready,
        active_prompt_contexts=active_prompt_contexts,
        active_combos=active_combos
    )
