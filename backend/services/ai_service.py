import os
import uuid
import requests
from sqlalchemy.orm import Session
from fastapi import HTTPException
from database.models import Prompt
from repositories import prompt_repository
from services import channel_service
from app.config import settings

def generate_prompt(db: Session, channel_id: str, theme: str, mood: str) -> Prompt:
    channel = channel_service.get_channel(db, channel_id)
    
    if not settings.NINE_ROUTER_URL or not settings.NINE_ROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="9Router API not configured")
        
    system_prompt = f"You are a helpful AI creating prompts for a YouTube channel named {channel.name}. The theme is {theme} and the mood is {mood}."
    
    payload = {
        "model": settings.NINE_ROUTER_MODEL or "YT_Research",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Generate a creative prompt for the channel."}
        ]
    }
    
    headers = {
        "Authorization": f"Bearer {settings.NINE_ROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        base_url = settings.NINE_ROUTER_URL.rstrip('/')
        if not base_url.endswith('/v1'):
            base_url = f"{base_url}/v1"
        api_url = f"{base_url}/chat/completions"
        response = requests.post(api_url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        generated_text = data.get("choices", [{}])[0].get("message", {}).get("content", "Failed to generate text")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
        
    prompt_id = str(uuid.uuid4())
    
    # Save to file
    base_dir = os.path.join(settings.DATA_PATH, "channels", channel.slug, "assets", "prompts")
    os.makedirs(base_dir, exist_ok=True)
    filepath = os.path.join(base_dir, f"{prompt_id}.txt")
    
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(generated_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write prompt file: {str(e)}")
        
    db_prompt = Prompt(
        id=prompt_id,
        channel_id=channel.id,
        title=theme,
        prompt=generated_text,
        category=mood
    )
    
    return prompt_repository.create_prompt(db, db_prompt)

from database.models import MetadataTemplate

def generate_metadata(db: Session, channel_id: str, theme: str, content_type: str) -> MetadataTemplate:
    channel = channel_service.get_channel(db, channel_id)
    
    if not settings.NINE_ROUTER_URL or not settings.NINE_ROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="9Router API not configured")
        
    system_prompt = f"You are a YouTube metadata generator for {channel.name}. Create metadata for a {content_type} about {theme}. Output should be structured with Title, Description, and Tags on new lines."
    
    payload = {
        "model": settings.NINE_ROUTER_MODEL or "YT_Research",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Generate metadata."}
        ]
    }
    
    headers = {
        "Authorization": f"Bearer {settings.NINE_ROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        base_url = settings.NINE_ROUTER_URL.rstrip('/')
        if not base_url.endswith('/v1'):
            base_url = f"{base_url}/v1"
        api_url = f"{base_url}/chat/completions"
        response = requests.post(api_url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        generated_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
        
    title_template = "Generated Title"
    desc_template = generated_text
    tags_template = "tag1, tag2"
    
    lines = generated_text.split('\n')
    for line in lines:
        if line.lower().startswith("title:"):
            title_template = line.split(":", 1)[1].strip()
        elif line.lower().startswith("tags:"):
            tags_template = line.split(":", 1)[1].strip()

    template_id = str(uuid.uuid4())
    db_template = MetadataTemplate(
        id=template_id,
        channel_id=channel.id,
        title_template=title_template,
        description_template=desc_template,
        tags_template=tags_template
    )
    
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template
