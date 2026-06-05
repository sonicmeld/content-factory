from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Channel(Base):
    __tablename__ = "channels"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    gcp_profile_id = Column(String)
    upload_frequency = Column(String)
    thumbnail_style = Column(String)
    metadata_style = Column(String)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())
