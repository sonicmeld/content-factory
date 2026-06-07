from sqlalchemy.orm import Session
from database.models import OAuthToken

def get_token_by_channel(db: Session, channel_id: str):
    return db.query(OAuthToken).filter(OAuthToken.channel_id == channel_id).first()

def create_or_update_token(db: Session, token_data: dict):
    channel_id = token_data.get("channel_id")
    token = get_token_by_channel(db, channel_id)
    if token:
        for key, value in token_data.items():
            if key == "id":
                continue  # Always preserve existing ID
            if key == "refresh_token" and value is None:
                continue  # CRITICAL: Never overwrite a valid refresh_token with NULL.
                           # Google only returns a refresh_token on first consent.
                           # Subsequent re-auths return NULL; preserving the old one is correct.
            setattr(token, key, value)
    else:
        token = OAuthToken(**token_data)
        db.add(token)
    db.commit()
    db.refresh(token)
    return token

def delete_token_by_channel(db: Session, channel_id: str):
    token = get_token_by_channel(db, channel_id)
    if token:
        db.delete(token)
        db.commit()
