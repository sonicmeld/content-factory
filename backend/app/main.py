from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="Content Factory API", version="1.0.0")

@app.get("/api/channels")
async def get_channels():
    return JSONResponse(content={"message": "Placeholder for GET /api/channels"})

@app.post("/api/channels")
async def create_channel():
    return JSONResponse(content={"message": "Placeholder for POST /api/channels"})

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
