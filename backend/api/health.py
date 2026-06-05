from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import time
import os
from database.config import get_db
from app.config import settings

router = APIRouter(prefix="/health", tags=["Health"])

START_TIME = time.time()

@router.get("")
def health_check(db: Session = Depends(get_db)):
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    storage_status = "ok"
    if not os.path.exists(settings.DATA_PATH):
        storage_status = "error"

    return {
        "status": "ok" if db_status == "ok" and storage_status == "ok" else "degraded",
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "database": db_status,
        "storage": storage_status,
        "environment": settings.APP_ENV
    }
