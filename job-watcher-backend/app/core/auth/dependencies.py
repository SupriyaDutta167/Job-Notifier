from typing import Annotated, Optional
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.db.models.user import User
from app.core.auth.jwt import verify_token
from app.core.exceptions import UnauthorizedError
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise UnauthorizedError("Missing authorization header")
    
    if credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Invalid authentication scheme. Expected Bearer.")
        
    token = credentials.credentials
    if not token:
        raise UnauthorizedError("Empty token")
        
    # Verify JWT
    payload = verify_token(token)
    
    # Extract auth_user_id (sub)
    sub = payload.get("sub")
    if not sub:
        raise UnauthorizedError("Token missing 'sub' claim")
        
    try:
        auth_user_id = uuid.UUID(sub)
    except ValueError:
        raise UnauthorizedError("Invalid 'sub' format")
        
    # Find or provision user
    user = db.query(User).filter(User.auth_user_id == auth_user_id).first()
    
    if not user:
        # Provision new user
        email = payload.get("email")
        user = User(
            auth_user_id=auth_user_id,
            email=email
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"Provisioned new internal User {user.id} for auth_user_id {auth_user_id}")
        
    return user

# Optional variant if you want to support internal fallback? The prompt states:
# "The old development mechanism may temporarily remain behind an explicitly disabled development-only path if absolutely necessary for existing tests, but production endpoints MUST use verified identity."
# I will just use `get_current_user` securely. For tests, we'll override `get_current_user`.
