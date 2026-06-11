import uuid
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from database.models import MetadataLibrary
from api.schemas import MetadataLibraryCreate, MetadataLibraryUpdate

def get_library_items(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    search_query: Optional[str] = None,
    category: Optional[str] = None
) -> List[MetadataLibrary]:
    query = db.query(MetadataLibrary)
    
    if search_query:
        search_term = f"%{search_query}%"
        query = query.filter(
            or_(
                MetadataLibrary.title.ilike(search_term),
                MetadataLibrary.description.ilike(search_term),
                MetadataLibrary.tags.ilike(search_term)
            )
        )
        
    if category:
        query = query.filter(MetadataLibrary.category == category)
        
    return query.order_by(MetadataLibrary.created_at.desc()).offset(skip).limit(limit).all()

def get_library_item(db: Session, item_id: str) -> Optional[MetadataLibrary]:
    return db.query(MetadataLibrary).filter(MetadataLibrary.id == item_id).first()

def create_library_item(db: Session, item_data: MetadataLibraryCreate) -> MetadataLibrary:
    db_item = MetadataLibrary(
        id=str(uuid.uuid4()),
        title=item_data.title,
        description=item_data.description,
        category=item_data.category,
        tags=item_data.tags,
        source_variant_id=item_data.source_variant_id,
        is_active=True
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_library_item(db: Session, item_id: str, item_data: MetadataLibraryUpdate) -> Optional[MetadataLibrary]:
    db_item = get_library_item(db, item_id)
    if not db_item:
        return None
        
    update_data = item_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
        
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_library_item(db: Session, item_id: str) -> bool:
    db_item = get_library_item(db, item_id)
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False
