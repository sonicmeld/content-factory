from sqlalchemy.orm import Session
from database.models import Prompt

def get_prompts(db: Session, channel_id: str = None, skip: int = 0, limit: int = 100):
    query = db.query(Prompt)
    if channel_id:
        query = query.filter(Prompt.channel_id == channel_id)
    return query.offset(skip).limit(limit).all()

def get_prompt(db: Session, prompt_id: str):
    return db.query(Prompt).filter(Prompt.id == prompt_id).first()

def create_prompt(db: Session, prompt: Prompt):
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt
