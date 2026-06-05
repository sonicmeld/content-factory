import os
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from api.channels import router as channels_router
from api.gcp_profiles import router as gcp_profiles_router
from api.oauth import router as oauth_router
from api.assets import router as assets_router
from api.prompts import router as prompts_router
from api.uploads import router as uploads_router
from api import health
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Base directories setup
    os.makedirs(settings.DATA_PATH, exist_ok=True)
    os.makedirs(os.path.join(settings.DATA_PATH, "shared-assets"), exist_ok=True)
    os.makedirs(os.path.join(settings.DATA_PATH, "temp"), exist_ok=True)
    
    yield
    # Shutdown logic if any

app = FastAPI(title="Content Factory API", version="1.0.0", lifespan=lifespan)

app.include_router(channels_router)
app.include_router(gcp_profiles_router)
app.include_router(oauth_router)
app.include_router(assets_router)
app.include_router(prompts_router)
app.include_router(uploads_router)
app.include_router(health.router)


@app.get("/api/assets")
async def get_assets():
    return JSONResponse(content={"message": "Placeholder for GET /api/assets"})

@app.post("/api/assets")
async def create_asset():
    return JSONResponse(content={"message": "Placeholder for POST /api/assets"})

@app.post("/api/prompts/generate")
async def generate_prompts():
    return JSONResponse(content={"message": "Placeholder for POST /api/prompts/generate"})

@app.post("/api/uploads")
async def create_upload():
    return JSONResponse(content={"message": "Placeholder for POST /api/uploads"})

@app.post("/api/oauth/connect")
async def oauth_connect():
    return JSONResponse(content={"message": "Placeholder for POST /api/oauth/connect"})

@app.get("/api/gcp-profiles")
async def get_gcp_profiles():
    return JSONResponse(content={"message": "Placeholder for GET /api/gcp-profiles"})
