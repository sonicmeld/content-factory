import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from contextlib import asynccontextmanager
from api.channels import router as channels_router
from api.gcp_profiles import router as gcp_profiles_router
from api.oauth import router as oauth_router
from api.assets import router as assets_router
from api.prompts import router as prompts_router
from api.uploads import router as uploads_router
from api.packages import router as packages_router
from api.queue import router as queue_router
from api.jobs import router as jobs_router
from api.publisher import router as publisher_router
from api.generation import router as generation_router
from api.prompt_contexts import router as prompt_contexts_router
from api.generation_combos import router as generation_combos_router
from api.diagnostics import router as diagnostics_router
from api import health
from app.config import settings

from database.database import init_db

from fastapi.staticfiles import StaticFiles

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create required directories on startup
    data_dir = os.path.abspath(settings.DATA_PATH)
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(os.path.join(data_dir, "channels"), exist_ok=True)
    os.makedirs(os.path.join(data_dir, "temp"), exist_ok=True)
    os.makedirs(os.path.join(data_dir, "assets"), exist_ok=True)
    
    # Initialize database
    init_db()
    
    yield
    # Shutdown logic if any

app = FastAPI(title="Content Factory API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173", 
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/data", StaticFiles(directory=os.path.abspath(settings.DATA_PATH)), name="data")

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    detail = getattr(exc, "detail", "Not Found")
    return JSONResponse(status_code=404, content={"error": detail})

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": "Validation Error", "details": exc.errors()})

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "Internal Server Error", "details": str(exc)})

from api.metadata_variants import router as metadata_variants_router
from api.generation_assets import router as generation_assets_package_router
from api.generation_assets import asset_router as generation_assets_router

app.include_router(channels_router)
app.include_router(gcp_profiles_router)
app.include_router(oauth_router)
app.include_router(assets_router)
app.include_router(prompts_router)
app.include_router(uploads_router)
app.include_router(packages_router)
app.include_router(queue_router)
app.include_router(jobs_router)
app.include_router(publisher_router)
app.include_router(generation_router)
app.include_router(prompt_contexts_router)
app.include_router(generation_combos_router)
app.include_router(diagnostics_router)
app.include_router(metadata_variants_router)
app.include_router(generation_assets_package_router)
app.include_router(generation_assets_router)
app.include_router(health.router)

@app.get("/api/config")
def get_public_config():
    return {
        "nine_router_url": settings.NINE_ROUTER_URL,
        "nine_router_model": settings.NINE_ROUTER_MODEL or "YT_Research"
    }
