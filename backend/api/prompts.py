import os
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
        from repositories.channel_repository import get_channel
        channel = get_channel(db, request.channel_id)
        model = (channel.thumbnail_combo if channel else None) or "gemini/gemini-2.5-flash-image"
        output_path = image_service.generate_thumbnail(db, request.prompt, request.channel_id, model)
        
        asset = Asset(
            channel_id=request.channel_id,
            asset_type="thumbnail",
            filename=os.path.basename(output_path),
            file_path=output_path,
            file_size=os.path.getsize(output_path) if os.path.exists(output_path) else 0,
            mime_type="image/png"
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
