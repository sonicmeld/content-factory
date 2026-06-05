from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from api.schemas import PromptGenerateRequest, PromptResponse, GenerateThumbnailRequest, AssetResponse
from services import ai_service, image_service
from database.models import Asset

router = APIRouter(prefix="/api/prompts", tags=["prompts"])

@router.post("/generate", response_model=PromptResponse)
def generate_prompt(request: PromptGenerateRequest, db: Session = Depends(get_db)):
    return ai_service.generate_prompt(db, request.channel_id, request.theme, request.mood)

@router.post("/thumbnails/generate", response_model=AssetResponse)
def generate_thumbnail_api(request: GenerateThumbnailRequest, db: Session = Depends(get_db)):
    try:
        output_path = image_service.generate_thumbnail(db, request.prompt, request.channel_id)
        
        asset = Asset(
            channel_id=request.channel_id,
            type="thumbnail",
            path=output_path
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
