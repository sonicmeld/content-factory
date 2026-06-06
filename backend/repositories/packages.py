from sqlalchemy.orm import Session
from database.models import ContentPackage
from api.schemas import ContentPackageCreate, ContentPackageUpdate
import uuid

def get_package(db: Session, package_id: str):
    return db.query(ContentPackage).filter(ContentPackage.id == package_id).first()

def get_packages(db: Session, channel_id: str = None, status: str = None, skip: int = 0, limit: int = 100):
    query = db.query(ContentPackage)
    if channel_id:
        query = query.filter(ContentPackage.channel_id == channel_id)
    if status:
        query = query.filter(ContentPackage.status == status)
    
    return query.order_by(ContentPackage.created_at.desc()).offset(skip).limit(limit).all()

def create_package(db: Session, package: ContentPackageCreate):
    db_package = ContentPackage(
        id=str(uuid.uuid4()),
        channel_id=package.channel_id,
        package_number=package.package_number,
        video_path=package.video_path,
        timestamp_path=package.timestamp_path,
        status=package.status
    )
    db.add(db_package)
    db.commit()
    db.refresh(db_package)
    return db_package

def update_package(db: Session, package_id: str, package_update: ContentPackageUpdate):
    db_package = get_package(db, package_id)
    if not db_package:
        return None
    
    update_data = package_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_package, key, value)
        
    db.commit()
    db.refresh(db_package)
    return db_package

def delete_package(db: Session, package_id: str):
    db_package = get_package(db, package_id)
    if db_package:
        db.delete(db_package)
        db.commit()
        return True
    return False
