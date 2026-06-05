from sqlalchemy.orm import Session
from database.models import Channel

def get_channels(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Channel).offset(skip).limit(limit).all()

def get_channel(db: Session, channel_id: str):
    return db.query(Channel).filter(Channel.id == channel_id).first()

def get_channel_by_slug(db: Session, slug: str):
    return db.query(Channel).filter(Channel.slug == slug).first()

def create_channel(db: Session, channel: Channel):
    db.add(channel)
    db.commit()
    db.refresh(channel)
    return channel

def update_channel(db: Session, channel: Channel, updates: dict):
    for key, value in updates.items():
        setattr(channel, key, value)
    db.commit()
    db.refresh(channel)
    return channel

def delete_channel(db: Session, channel: Channel):
    db.delete(channel)
    db.commit()
