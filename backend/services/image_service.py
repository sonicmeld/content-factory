import os
import uuid
import base64
import requests
from sqlalchemy.orm import Session
from app.config import settings
from repositories.channel_repository import get_channel

def _generate_image(prompt: str, model: str, output_path: str):
    models_to_try = [
        model,
        "flux-1-schnell",
        "pollinations"
    ]

    for m in models_to_try:
        try:
            if m == "pollinations":
                url = f"https://image.pollinations.ai/prompt/{prompt}?width=1280&height=720&nologo=true"
                response = requests.get(url, timeout=60)
                response.raise_for_status()
                with open(output_path, "wb") as f:
                    f.write(response.content)
                return True
                
            headers = {
                "Authorization": f"Bearer {settings.NINE_ROUTER_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": m,
                "prompt": prompt,
                "response_format": "b64_json",
                "size": "1024x1024"
            }
            
            api_url = settings.NINE_ROUTER_IMAGE_URL.rstrip('/') + "/v1/images/generations"
            
            response = requests.post(api_url, json=payload, headers=headers, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            b64_img = data["data"][0]["b64_json"]
            
            with open(output_path, "wb") as f:
                f.write(base64.b64decode(b64_img))
            
            return True
        except Exception as e:
            print(f"Model {m} failed for image generation: {e}")
            continue
            
    raise Exception("All image generation fallback models failed.")

def generate_thumbnail(db: Session, prompt: str, channel_id: str) -> str:
    channel = get_channel(db, channel_id)
    slug = channel.slug if channel else "shared"
    
    filename = f"thumb_{uuid.uuid4().hex[:8]}.jpg"
    directory = os.path.join(settings.DATA_PATH, "channels", slug, "assets", "thumbnails")
    os.makedirs(directory, exist_ok=True)
    
    output_path = os.path.join(directory, filename)
    model = settings.NINE_ROUTER_IMAGE_MODEL_THUMB or "gemini/gemini-2.5-flash-image"
    
    _generate_image(prompt, model, output_path)
    return output_path

def generate_footage(db: Session, prompt: str, channel_id: str) -> str:
    channel = get_channel(db, channel_id)
    slug = channel.slug if channel else "shared"
    
    filename = f"footage_{uuid.uuid4().hex[:8]}.jpg"
    directory = os.path.join(settings.DATA_PATH, "channels", slug, "assets", "footage")
    os.makedirs(directory, exist_ok=True)
    
    output_path = os.path.join(directory, filename)
    model = settings.NINE_ROUTER_IMAGE_MODEL_FOOTAGE or "cf/@cf/black-forest-labs/flux-2-dev"
    
    _generate_image(prompt, model, output_path)
    return output_path
