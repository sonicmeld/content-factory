import hashlib
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database.database import get_db
from database.models import CompanionRuntime

security = HTTPBearer()

def get_current_runtime(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    x_client_id: str = Header(..., alias="X-Client-Id"),
    db: Session = Depends(get_db)
) -> CompanionRuntime:
    api_key = credentials.credentials
    
    # Hash incoming API key using SHA256
    api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    # Fetch runtime matching client_id and API key hash
    runtime = db.query(CompanionRuntime).filter(
        CompanionRuntime.client_id == x_client_id,
        CompanionRuntime.api_key_hash == api_key_hash
    ).first()

    if not runtime:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Client ID or API Key"
        )

    # Refuse access if the runtime has been explicitly revoked
    if runtime.is_revoked == 1:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This Companion Runtime has been revoked"
        )

    return runtime
