from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
import os

db_url = settings.DATABASE_PATH
if not db_url.startswith("sqlite:///"):
    # Convert path to absolute to avoid working directory issues
    # If it's a relative path, we assume it's relative to the backend directory
    if not os.path.isabs(db_url):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_url = os.path.join(base_dir, db_url)
    db_url = f"sqlite:///{db_url}"

engine = create_engine(
    db_url, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
