from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.database import get_db
from services import queue_service
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/api/queue", tags=["queue"])

class ReorderRequest(BaseModel):
    new_order: List[str]

@router.get("/{channel_id}")
def get_queue(channel_id: str, db: Session = Depends(get_db)):
    return queue_service.get_queue(db, channel_id)

@router.post("/{package_id}")
def add_to_queue(package_id: str, db: Session = Depends(get_db)):
    return queue_service.add_to_queue(db, package_id)

@router.delete("/{package_id}")
def remove_from_queue(package_id: str, db: Session = Depends(get_db)):
    return queue_service.remove_from_queue(db, package_id)

@router.patch("/{channel_id}/reorder")
def reorder_queue(channel_id: str, request: ReorderRequest, db: Session = Depends(get_db)):
    return queue_service.reorder_queue(db, channel_id, request.new_order)
