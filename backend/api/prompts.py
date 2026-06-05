from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from api.schemas import PromptGenerateRequest, PromptResponse
from services import ai_service

router = APIRouter(prefix="/api/prompts", tags=["prompts"])

@router.post("/generate", response_model=PromptResponse)
def generate_prompt(request: PromptGenerateRequest, db: Session = Depends(get_db)):
    return ai_service.generate_prompt(db, request.channel_id, request.theme, request.mood)
