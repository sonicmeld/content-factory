import json
import uuid
import datetime
import httpx
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database.database import get_db
from database.models import PromptExpertDraft, GenerationCombo, PromptContext
from api.schemas import DraftGenerateRequest, DraftResponse, DraftApproveRequest, PromptContextResponse
from app.config import settings
from services import prompt_context_service

router = APIRouter(prefix="/api/prompt-experts", tags=["prompt-experts"])

METADATA_RULES = """
You are the Metadata Expert. Your sole purpose is to build the prompt context for a YouTube Metadata Generator.
Strictly adhere to the following rules:
1. You MUST generate ONLY the following three fields in a valid JSON format:
   - "topic": A refined and structured explanation of the video's core theme or topic.
   - "keywords": A JSON list of 5-10 semantic keywords or concept tags (do NOT include hashtags or final SEO tags).
   - "notes": Guidelines on target audience demographics, general tone of voice, style constraints, or specific angles to cover.
2. Under no circumstances should you generate:
   - YouTube Video Titles
   - Video Descriptions
   - SEO Tag list / Hashtag list
   - Final SEO metadata output
   - Thumbnail prompt ideas or Footage queries
3. You must respond with a raw, valid JSON object matching this schema exactly:
{
  "topic": "string",
  "keywords": ["string"],
  "notes": "string"
}
"""

THUMBNAIL_RULES = """
You are the Thumbnail Expert. Your sole purpose is to build the prompt context for a YouTube Thumbnail Generator.
Strictly adhere to the following rules:
1. You MUST generate ONLY the following three fields in a valid JSON format:
   - "topic": A refined explanation of the thumbnail's core visual theme and main focal point.
   - "keywords": A JSON list of 5-8 visual elements, objects, or entities that should appear (do NOT include image generator parameters like --ar, aspect ratio, or style names).
   - "notes": Visual guidelines, focus areas on CTR opportunities, emotional triggers (e.g., curiosity, shock), text overlay suggestions, and composition positioning.
2. Under no circumstances should you generate:
   - Image prompts for Midjourney, Flux, SDXL, or Google Flow
   - Prompt weights or parameters
   - Image download links or actual generated images
3. You must respond with a raw, valid JSON object matching this schema exactly:
{
  "topic": "string",
  "keywords": ["string"],
  "notes": "string"
}
"""

FOOTAGE_RULES = """
You are the Footage Expert. Your sole purpose is to build the prompt context for a YouTube Footage Generator.
Strictly adhere to the following rules:
1. You MUST generate ONLY the following three fields in a valid JSON format:
   - "topic": A refined explanation of the video's footage B-roll theme and visual narrative.
   - "keywords": A JSON list of 5-10 B-roll categories, scene types, or visual styles (do NOT include search query syntax or operators).
   - "notes": Visual themes, scene expansion guidelines, cinematic camera movement guidelines, and supporting visual context.
2. Under no circumstances should you generate:
   - Direct footage search queries (like Pexels search strings)
   - Asset search commands or scripts
   - Video URLs, download links, or actual generated footage
3. You must respond with a raw, valid JSON object matching this schema exactly:
{
  "topic": "string",
  "keywords": ["string"],
  "notes": "string"
}
"""

def parse_json_from_response(text: str) -> dict:
    text = text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    try:
        return json.loads(text)
    except Exception:
        raise ValueError("AI response is not valid JSON. Response snippet: " + text[:200])

def to_draft_response(draft: PromptExpertDraft) -> dict:
    try:
        keywords_list = json.loads(draft.keywords)
        if not isinstance(keywords_list, list):
            keywords_list = [str(keywords_list)]
    except Exception:
        keywords_list = [k.strip() for k in draft.keywords.split(",") if k.strip()]
        
    return {
        "id": draft.id,
        "workspace_id": draft.workspace_id,
        "expert_type": draft.expert_type,
        "combo_id": draft.combo_id,
        "input_text": draft.input_text,
        "topic": draft.topic,
        "keywords": keywords_list,
        "notes": draft.notes,
        "status": draft.status,
        "created_at": draft.created_at,
        "updated_at": draft.updated_at
    }

@router.post("/generate", response_model=DraftResponse)
async def generate_draft(req: DraftGenerateRequest, db: Session = Depends(get_db)):
    if not settings.NINE_ROUTER_URL or not settings.NINE_ROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="9Router API not configured")
        
    combo = db.query(GenerationCombo).filter(GenerationCombo.id == req.combo_id).first()
    if not combo:
        raise HTTPException(status_code=404, detail="Combo not found")
        
    rules_map = {
        "metadata": METADATA_RULES,
        "thumbnail": THUMBNAIL_RULES,
        "footage": FOOTAGE_RULES
    }
    
    rules = rules_map.get(req.expert_type.lower())
    if not rules:
        raise HTTPException(status_code=400, detail=f"Invalid expert_type: {req.expert_type}. Must be metadata, thumbnail, or footage")
        
    base_url = settings.NINE_ROUTER_URL.rstrip('/')
    if not base_url.endswith('/v1'):
        base_url = f"{base_url}/v1"
    api_url = f"{base_url}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {settings.NINE_ROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": combo.name,
        "messages": [
            {"role": "system", "content": rules},
            {"role": "user", "content": f"User Input: \"{req.input_text}\""}
        ],
        "response_format": {"type": "json_object"}
    }
    
    if combo.config_json:
        try:
            cfg = json.loads(combo.config_json)
            for k in ["temperature", "max_tokens", "top_p", "frequency_penalty", "presence_penalty"]:
                if k in cfg:
                    payload[k] = cfg[k]
        except Exception:
            pass
            
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(api_url, json=payload, headers=headers)
            
        if response.status_code != 200:
            raise Exception(f"AI returned status {response.status_code}: {response.text}")
            
        data = response.json()
        generated_content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        
        parsed_data = parse_json_from_response(generated_content)
        
        # Validate fields
        topic = parsed_data.get("topic", "").strip()
        keywords_raw = parsed_data.get("keywords", [])
        notes = parsed_data.get("notes", "").strip()
        
        if not topic or not notes:
            raise Exception("AI returned empty topic or notes fields.")
            
        if isinstance(keywords_raw, list):
            keywords_list = [str(k).strip() for k in keywords_raw if str(k).strip()]
        else:
            keywords_list = [str(keywords_raw).strip()]
            
        draft_id = str(uuid.uuid4())
        db_draft = PromptExpertDraft(
            id=draft_id,
            workspace_id=req.workspace_id,
            expert_type=req.expert_type.lower(),
            combo_id=req.combo_id,
            input_text=req.input_text,
            topic=topic,
            keywords=json.dumps(keywords_list),
            notes=notes,
            status="draft"
        )
        
        db.add(db_draft)
        db.commit()
        db.refresh(db_draft)
        
        return to_draft_response(db_draft)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Draft generation failed: {str(e)}")

@router.get("/drafts", response_model=List[DraftResponse])
def get_prompt_drafts(workspace_id: str = "default", db: Session = Depends(get_db)):
    drafts = db.query(PromptExpertDraft).filter(
        PromptExpertDraft.workspace_id == workspace_id,
        PromptExpertDraft.status == "draft"
    ).order_by(PromptExpertDraft.created_at.desc()).all()
    return [to_draft_response(d) for d in drafts]

@router.get("/drafts/{id}", response_model=DraftResponse)
def get_prompt_draft_detail(id: str, db: Session = Depends(get_db)):
    draft = db.query(PromptExpertDraft).filter(PromptExpertDraft.id == id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return to_draft_response(draft)

@router.post("/drafts/{id}/approve", response_model=PromptContextResponse)
def approve_prompt_draft(id: str, req: DraftApproveRequest, db: Session = Depends(get_db)):
    draft = db.query(PromptExpertDraft).filter(PromptExpertDraft.id == id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
        
    if draft.status != "draft":
        raise HTTPException(status_code=400, detail=f"Draft has already been {draft.status}")
        
    from api.schemas import PromptContextCreate
    context_in = PromptContextCreate(
        prompt_type=req.prompt_type,
        title=req.title,
        topic=req.topic,
        keywords=req.keywords,
        notes=req.notes,
        is_active=True
    )
    
    # Create prompt context
    ctx = prompt_context_service.create_prompt_context(db, req.channel_id, context_in)
    
    # Mark draft approved
    draft.status = "approved"
    db.commit()
    
    return ctx

@router.post("/drafts/{id}/discard")
def discard_prompt_draft(id: str, db: Session = Depends(get_db)):
    draft = db.query(PromptExpertDraft).filter(PromptExpertDraft.id == id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
        
    if draft.status != "draft":
        raise HTTPException(status_code=400, detail=f"Draft has already been {draft.status}")
        
    draft.status = "discarded"
    db.commit()
    return {"message": "Draft discarded successfully"}
