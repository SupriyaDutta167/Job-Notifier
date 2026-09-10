import jwt
from jwt import PyJWKClient, PyJWKClientError
from app.core.config import settings
from typing import Dict, Any
from app.core.exceptions import UnauthorizedError
import logging

logger = logging.getLogger(__name__)

# Initialize PyJWKClient lazily so it reads settings correctly
_jwks_client = None

def get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        url = settings.supabase_jwks_url
        if not url:
            raise UnauthorizedError(detail="Authentication is not configured (missing SUPABASE_URL).")
        # PyJWKClient has built-in caching
        _jwks_client = PyJWKClient(url)
    return _jwks_client

def verify_token(token: str) -> Dict[str, Any]:
    try:
        jwks_client = get_jwks_client()
        
        # Get the unverified header to extract the kid
        unverified_header = jwt.get_unverified_header(token)
        if "kid" not in unverified_header:
            raise UnauthorizedError(detail="Token missing 'kid' header")
            
        # Get the signing key from the JWKS
        try:
            signing_key = jwks_client.get_signing_key_from_jwt(token)
        except PyJWKClientError as e:
            logger.error(f"JWKS failure: {str(e)}")
            raise UnauthorizedError(detail="Unknown kid or JWKS unavailable")
            
        # Verify the token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError(detail="Token has expired")
    except jwt.InvalidAudienceError:
        raise UnauthorizedError(detail="Invalid token audience")
    except (jwt.InvalidSignatureError, jwt.exceptions.InvalidKeyError, jwt.exceptions.InvalidAlgorithmError):
        raise UnauthorizedError(detail="Invalid token signature")
    except jwt.DecodeError:
        raise UnauthorizedError(detail="Malformed token")
    except UnauthorizedError:
        raise
    except Exception as e:
        logger.error(f"Unexpected token verification error: {str(e)}")
        raise UnauthorizedError(detail="Could not validate credentials")
