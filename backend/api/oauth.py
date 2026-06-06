from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
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
        
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>OAuth Success</title>
            <meta charset="utf-8">
            <style>
                body{
                    font-family:sans-serif;
                    text-align:center;
                    margin-top:100px;
                }
            </style>
        </head>
        <body>
            <h2>✅ YouTube OAuth berhasil</h2>
            <p>Token telah tersimpan ke database.</p>
            <p>Anda dapat menutup tab ini.</p>

            <script>
                setTimeout(() => {
                    window.close();
                }, 1000);
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth callback failed: {str(e)}")
