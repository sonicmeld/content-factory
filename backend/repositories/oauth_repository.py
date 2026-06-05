from sqlalchemy.orm import Session
from database.models import OAuthToken

def get_token_by_channel(db: Session, channel_id: str):
    return db.query(OAuthToken).filter(OAuthToken.channel_id == channel_id).first()

def create_or_update_token(db: Session, token_data: dict):
    channel_id = token_data.get("channel_id")
    token = get_token_by_channel(db, channel_id)
    if token:
        for key, value in token_data.items():
            if key != "id": # preserve existing ID
                setattr(token, key, value)
    else:
        token = OAuthToken(**token_data)
        db.add(token)
    db.commit()
    db.refresh(token)
    return token
