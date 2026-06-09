from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from services import generation_service

router = APIRouter(prefix="/api/metadata-variants", tags=["metadata-variants"])

@router.delete("/{variant_id}")
def delete_metadata_variant(variant_id: str, db: Session = Depends(get_db)):
    """
    Delete a specific metadata variant.
    Selected variants cannot be deleted.
    """
    try:
        success = generation_service.delete_metadata_variant(db, variant_id)
        if not success:
            raise HTTPException(status_code=404, detail="Metadata Variant not found")
        return {"message": "Variant deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
