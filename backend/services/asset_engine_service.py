import os
import logging
from sqlalchemy.orm import Session
from repositories import generation_asset_repository
from database.models import GenerationAsset

logger = logging.getLogger(__name__)

def register_asset(db: Session, package_generation_id: str, asset_type: str, file_path: str, filename: str, mime_type: str, file_size: int, source_combo: str = None, source_context: str = None, status: str = "pending") -> GenerationAsset:
    """Registers a newly generated asset in the database."""
    asset_in = {
        "package_generation_id": package_generation_id,
        "asset_type": asset_type,
        "file_path": file_path,
        "filename": filename,
        "mime_type": mime_type,
        "file_size": file_size,
        "source_combo": source_combo,
        "source_context": source_context,
        "status": status
    }
    asset = generation_asset_repository.create_asset(db, asset_in)
    logger.info(f"generation_asset_created: id={asset.id} type={asset_type} file={filename}")
    return asset

def get_generation_assets(db: Session, package_generation_id: str):
    """Retrieve all assets for a generation run."""
    return generation_asset_repository.get_assets_by_generation(db, package_generation_id)

def get_generation_assets_by_type(db: Session, package_generation_id: str, asset_type: str):
    """Retrieve assets of a specific type for a generation run."""
    return generation_asset_repository.get_assets_by_type(db, package_generation_id, asset_type)

def update_asset_status(db: Session, asset_id: str, status: str):
    """Update the status of an asset."""
    asset = generation_asset_repository.update_asset_status(db, asset_id, status)
    if asset and status == "failed":
        logger.error(f"generation_asset_failed: id={asset.id} type={asset.asset_type}")
    return asset

def delete_asset(db: Session, asset_id: str) -> bool:
    """Deletes an asset record and removes the physical file from disk to prevent storage leaks."""
    from fastapi import HTTPException
    asset = generation_asset_repository.get_asset_by_id(db, asset_id)
    if not asset:
        return False
        
    # Sprint 7A-7: Protect selected assets from deletion
    if asset.is_selected:
        raise HTTPException(status_code=400, detail="Cannot delete an active selected asset")
        
    # Attempt to remove the physical file
    absolute_file_path = os.path.abspath(asset.file_path)
    try:
        if os.path.exists(absolute_file_path):
            os.remove(absolute_file_path)
            logger.info(f"physical_file_deleted: {absolute_file_path}")
        else:
            logger.warning(f"physical_file_not_found_during_deletion: {absolute_file_path}")
    except Exception as e:
        logger.error(f"failed_to_delete_physical_file: {absolute_file_path} - {str(e)}")
        # We still proceed to delete the DB record even if file deletion fails,
        # to ensure the system doesn't get stuck, though we logged the error.
        
    # Delete the database record
    success = generation_asset_repository.delete_asset(db, asset_id)
    if success:
        logger.info(f"generation_asset_deleted: id={asset_id} type={asset.asset_type}")
    
    return success

# Sprint 7A-7: Asset Variant Library
def select_asset_variant(db: Session, package_id: str, asset_id: str):
    """Select an asset candidate and promote it if applicable."""
    from fastapi import HTTPException
    from repositories import package_generation_repository
    
    asset = generation_asset_repository.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    gen = package_generation_repository.get_by_package_id(db, package_id)
    if not gen or gen.id != asset.package_generation_id:
        raise HTTPException(status_code=400, detail="Asset does not belong to this package generation")
        
    # Set selected in DB
    generation_asset_repository.set_selected(db, gen.id, asset.asset_type, asset.id)
    
    # Audit Log
    logger.info(f"[AUDIT] asset_variant_selected: Package {package_id}, Variant {asset_id}, Type {asset.asset_type}, Combo {asset.source_combo}")
    
    # Promotion Logic - Only for thumbnails currently
    if asset.asset_type == "thumbnail":
        package_generation_repository.update_generation(
            db,
            package_id,
            {
                "thumbnail_path": asset.file_path,
                "thumbnail_combo_used": asset.source_combo,
            }
        )
    
    # Reload the asset to return updated state
    return generation_asset_repository.get_asset_by_id(db, asset_id)
