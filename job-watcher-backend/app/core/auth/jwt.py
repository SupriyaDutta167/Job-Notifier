import jwt
from jwt import PyJWKClient, PyJWKClientError
from app.core.config import settings
from typing import Dict, Any
from app.core.exceptions import UnauthorizedError
import logging

import time
from datetime import datetime, timezone

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
            
        kid = unverified_header.get("kid")

        # Safely inspect unverified claims for diagnostics without printing token or secrets
        try:
            unverified_claims = jwt.decode(
                token,
                options={
                    "verify_signature": False,
                    "verify_exp": False,
                    "verify_iat": False,
                    "verify_aud": False,
                }
            )
            iat = unverified_claims.get("iat")
            exp = unverified_claims.get("exp")
            aud = unverified_claims.get("aud")
            sub = unverified_claims.get("sub")
            nbf = unverified_claims.get("nbf")
            now = time.time()
            now_utc = datetime.now(timezone.utc)
            iat_utc = datetime.fromtimestamp(iat, timezone.utc) if iat else None
            exp_utc = datetime.fromtimestamp(exp, timezone.utc) if exp else None
            nbf_utc = datetime.fromtimestamp(nbf, timezone.utc) if nbf else None
            skew_s = (iat - now) if iat is not None else 0.0
            logger.info(
                f"JWT Verification Diagnostic: kid={kid}, aud={aud}, sub={sub}, "
                f"iat={iat} ({iat_utc}), exp={exp} ({exp_utc}), nbf={nbf} ({nbf_utc}), "
                f"backend_now={now:.3f} ({now_utc}), skew(iat - now)={skew_s:+.3f}s, "
                f"leeway={settings.JWT_LEEWAY_SECONDS}s"
            )
        except Exception as diag_err:
            logger.debug(f"Failed to extract diagnostic claims: {diag_err}")

        # Get the signing key from the JWKS
        try:
            signing_key = jwks_client.get_signing_key_from_jwt(token)
        except PyJWKClientError as e:
            logger.error(f"JWKS failure: {str(e)}")
            raise UnauthorizedError(detail="Unknown kid or JWKS unavailable")
            
        # Verify the token
        # Algorithm remains strictly ES256, JWKS verified, aud='authenticated',
        # signature verified, exp verified, and bounded clock skew leeway applied.
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            leeway=settings.JWT_LEEWAY_SECONDS,
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": True,
            }
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError(detail="Token has expired")
    except jwt.ImmatureSignatureError:
        raise UnauthorizedError(detail="Token is not yet valid")
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
