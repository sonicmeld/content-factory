from sqlalchemy.orm import Session
from typing import Optional
from database.models import PackageGeneration


def create_generation(db: Session, generation_data: dict) -> PackageGeneration:
    """Create a new PackageGeneration record."""
    db_gen = PackageGeneration(**generation_data)
    db.add(db_gen)
    db.commit()
    db.refresh(db_gen)
    return db_gen


def get_by_package_id(db: Session, package_id: str) -> Optional[PackageGeneration]:
    """Retrieve the PackageGeneration record for a given package."""
    return (
        db.query(PackageGeneration)
        .filter(PackageGeneration.package_id == package_id)
        .first()
    )


def get_by_id(db: Session, generation_id: str) -> Optional[PackageGeneration]:
    """Retrieve a PackageGeneration record by its primary key."""
    return (
        db.query(PackageGeneration)
        .filter(PackageGeneration.id == generation_id)
        .first()
    )


def update_generation(db: Session, package_id: str, updates: dict) -> Optional[PackageGeneration]:
    """Apply a dict of updates to the PackageGeneration for a given package_id."""
    gen = get_by_package_id(db, package_id)
    if gen:
        for key, value in updates.items():
            setattr(gen, key, value)
        db.commit()
        db.refresh(gen)
    return gen


def delete_generation(db: Session, package_id: str) -> bool:
    """Delete the PackageGeneration record for a given package_id."""
    gen = get_by_package_id(db, package_id)
    if gen:
        db.delete(gen)
        db.commit()
        return True
    return False
