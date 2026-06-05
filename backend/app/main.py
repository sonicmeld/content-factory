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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"error": "Not Found"})

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": "Validation Error", "details": exc.errors()})

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "Internal Server Error", "details": str(exc)})

app.include_router(channels_router)
app.include_router(gcp_profiles_router)
app.include_router(oauth_router)
app.include_router(assets_router)
app.include_router(prompts_router)
app.include_router(uploads_router)
app.include_router(health.router)
