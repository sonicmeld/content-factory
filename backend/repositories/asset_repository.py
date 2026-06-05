from sqlalchemy.orm import Session
from database.models import Asset

def get_assets(db: Session, channel_id: str = None, asset_type: str = None, skip: int = 0, limit: int = 100):
    query = db.query(Asset)
    if channel_id:
        query = query.filter(Asset.channel_id == channel_id)
    if asset_type:
        query = query.filter(Asset.type == asset_type)
    return query.offset(skip).limit(limit).all()

def get_asset(db: Session, asset_id: str):
    return db.query(Asset).filter(Asset.id == asset_id).first()

def create_asset(db: Session, asset: Asset):
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset

def delete_asset(db: Session, asset: Asset):
    db.delete(asset)
    db.commit()
