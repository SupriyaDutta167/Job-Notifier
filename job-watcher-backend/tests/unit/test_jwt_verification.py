import pytest
import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch
import json
from app.core.exceptions import UnauthorizedError
from app.core.auth.jwt import verify_token, get_jwks_client
import app.core.auth.jwt as jwt_module

def generate_ec_keys():
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    
    # Get PEM format
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return private_pem, public_pem

PRIVATE_KEY, PUBLIC_KEY = generate_ec_keys()
PRIVATE_KEY_2, PUBLIC_KEY_2 = generate_ec_keys()
KID = "test-kid-123"

# We mock PyJWKClient completely so no network calls are made.
class MockSigningKey:
    def __init__(self, key):
        self.key = key

class MockJWKClient:
    def __init__(self, key_pem):
        self.key_pem = key_pem
        
    def get_signing_key_from_jwt(self, token):
        unverified_header = jwt.get_unverified_header(token)
        if unverified_header.get("kid") == KID:
            return MockSigningKey(self.key_pem)
        raise jwt.PyJWKClientError("Unknown kid")

@pytest.fixture(autouse=True)
def mock_jwks_client():
    # Reset singleton
    jwt_module._jwks_client = None
    
    mock_client = MockJWKClient(PUBLIC_KEY)
    with patch("app.core.auth.jwt.get_jwks_client", return_value=mock_client):
        yield

def create_token(private_key, payload, kid=KID, alg="ES256"):
    headers = {"kid": kid} if kid else {}
    return jwt.encode(payload, private_key, algorithm=alg, headers=headers)

def test_verify_valid_token():
    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "authenticated",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    token = create_token(PRIVATE_KEY, payload)
    decoded = verify_token(token)
    assert decoded["sub"] == payload["sub"]

def test_verify_invalid_signature():
    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "authenticated",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    # Sign with a different key
    token = create_token(PRIVATE_KEY_2, payload)
    with pytest.raises(UnauthorizedError, match="Invalid token signature"):
        verify_token(token)

def test_verify_expired_token():
    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "authenticated",
        "exp": datetime.utcnow() - timedelta(hours=1)
    }
    token = create_token(PRIVATE_KEY, payload)
    with pytest.raises(UnauthorizedError, match="Token has expired"):
        verify_token(token)

def test_verify_wrong_audience():
    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "wrong-audience",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    token = create_token(PRIVATE_KEY, payload)
    with pytest.raises(UnauthorizedError, match="Invalid token audience"):
        verify_token(token)

def test_missing_kid():
    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "authenticated",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    # No kid header
    token = create_token(PRIVATE_KEY, payload, kid=None)
    with pytest.raises(UnauthorizedError, match="Token missing 'kid' header"):
        verify_token(token)

def test_malformed_jwt():
    with pytest.raises(UnauthorizedError, match="Malformed token"):
        verify_token("not.a.jwt")

def test_unknown_kid():
    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "authenticated",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    token = create_token(PRIVATE_KEY, payload, kid="wrong-kid")
    with pytest.raises(UnauthorizedError, match="Unknown kid"):
        verify_token(token)

def test_unsupported_algorithm():
    # Test with HS256 instead of ES256
    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "authenticated",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    # Sign with HS256 using a symmetric key
    token = jwt.encode(payload, "symmetric-secret", algorithm="HS256", headers={"kid": KID})
    with pytest.raises(UnauthorizedError, match="Invalid token signature"):
        verify_token(token)
