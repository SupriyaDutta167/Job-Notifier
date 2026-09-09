import pytest
import uuid
import jwt
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.auth.dependencies import get_current_user
from unittest.mock import patch, MagicMock

client = TestClient(app)

@pytest.fixture(autouse=True)
def remove_override():
    app.dependency_overrides.pop(get_current_user, None)
    yield

def test_missing_token():
    response = client.get("/api/v1/me")
    assert response.status_code == 401
    assert "Missing authorization header" in response.json()["detail"] or "Not authenticated" in response.json()["detail"]

def test_invalid_scheme():
    response = client.get("/api/v1/me", headers={"Authorization": "Basic token"})
    assert response.status_code == 401

@patch("app.core.auth.dependencies.verify_token")
def test_valid_token_provisioning(mock_verify):
    # Mock JWT payload
    auth_user_id = str(uuid.uuid4())
    random_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
    mock_verify.return_value = {"sub": auth_user_id, "email": random_email}
    
    # We must also mock the DB call or use an override for DB if it hits a real one.
    # Since it's a test client, the real DB might be empty. It will create a user.
    response = client.get("/api/v1/me", headers={"Authorization": "Bearer fake_token"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == random_email
    assert "id" in data

def test_health_public():
    response = client.get("/api/v1/health")
    assert response.status_code == 200

@patch("app.core.auth.dependencies.verify_token")
def test_patch_me(mock_verify):
    auth_user_id = str(uuid.uuid4())
    random_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
    mock_verify.return_value = {"sub": auth_user_id, "email": random_email}
    
    # First provision user
    client.get("/api/v1/me", headers={"Authorization": "Bearer fake_token"})
    
    # Now patch
    response = client.patch(
        "/api/v1/me", 
        json={"telegram_chat_id": "123456789"},
        headers={"Authorization": "Bearer fake_token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["telegram_chat_id"] == "123456789"
    
    # Try to patch a secure field (should ignore or error depending on Pydantic extra='ignore' by default)
    # The Pydantic model UserUpdate only allows telegram_chat_id
    response2 = client.patch(
        "/api/v1/me", 
        json={"is_active": False, "telegram_chat_id": "987654"},
        headers={"Authorization": "Bearer fake_token"}
    )
    assert response2.status_code == 200
    assert response2.json()["telegram_chat_id"] == "987654"
    assert response2.json()["is_active"] is True  # Did not change
