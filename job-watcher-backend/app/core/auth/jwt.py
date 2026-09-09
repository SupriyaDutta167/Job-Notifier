import jwt
from app.core.config import settings
from typing import Dict, Any
from app.core.exceptions import UnauthorizedError

def verify_token(token: str) -> Dict[str, Any]:
    if not settings.SUPABASE_JWT_SECRET:
        # If no secret is configured, reject all tokens
        raise UnauthorizedError(detail="Authentication is not configured.")

    try:
        # Supabase tokens typically use HS256 and the audience is 'authenticated'
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError(detail="Token has expired")
    except jwt.InvalidAudienceError:
        raise UnauthorizedError(detail="Invalid token audience")
    except jwt.InvalidSignatureError:
        raise UnauthorizedError(detail="Invalid token signature")
    except jwt.DecodeError:
        raise UnauthorizedError(detail="Malformed token")
    except Exception as e:
        raise UnauthorizedError(detail="Could not validate credentials")
