from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database.database import get_db
from services import oauth_service

router = APIRouter(prefix="/api/oauth", tags=["oauth"])

class ConnectRequest(BaseModel):
    channel_id: str

@router.post("/connect")
def connect_youtube(request: ConnectRequest, db: Session = Depends(get_db)):
    try:
        url = oauth_service.generate_auth_url(db, request.channel_id)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/callback")
def oauth_callback(state: str, code: str, db: Session = Depends(get_db)):
    try:
        oauth_service.handle_callback(db, state=state, code=code)
        # Redirect to frontend channels page
        return RedirectResponse("http://localhost:5173/channels")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth callback failed: {str(e)}")
