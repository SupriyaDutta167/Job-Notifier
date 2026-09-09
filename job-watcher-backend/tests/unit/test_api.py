import pytest
import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.core.exceptions import NotFoundError, ConflictError
from app.core.auth.dependencies import get_current_user
from app.db.models.user import User

client = TestClient(app)
USER_ID = str(uuid.uuid4())

def override_get_current_user():
    user = User(id=uuid.UUID(USER_ID), auth_user_id=uuid.uuid4(), email="test@example.com")
    return user

@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    app.dependency_overrides.pop(get_current_user, None)

@patch("app.api.v1.companies.company_service")
def test_create_company(mock_service):
    mock_company = MagicMock()
    mock_company.id = uuid.uuid4()
    mock_company.name = "Test Co"
    mock_company.slug = "test-co"
    mock_company.website_url = "https://test.com/"
    mock_company.created_at = datetime.now()
    mock_company.updated_at = datetime.now()
    mock_service.create_company.return_value = mock_company
    
    response = client.post("/api/v1/companies", json={"name": "Test Co", "slug": "test-co", "website_url": "https://test.com"})
    assert response.status_code == 201
    assert response.json()["name"] == "Test Co"

@patch("app.api.v1.companies.company_service")
def test_create_company_conflict(mock_service):
    mock_service.create_company.side_effect = ConflictError("Conflict")
    response = client.post("/api/v1/companies", json={"name": "Test Co", "slug": "test-co"})
    assert response.status_code == 409

@patch("app.api.v1.companies.company_service")
def test_get_company_not_found(mock_service):
    mock_service.get_company.side_effect = NotFoundError("Not found")
    response = client.get(f"/api/v1/companies/{uuid.uuid4()}")
    assert response.status_code == 404

@patch("app.api.v1.watch_profiles.watch_profile_service")
def test_create_watch_profile(mock_service):
    mock_profile = MagicMock()
    mock_profile.id = uuid.uuid4()
    mock_profile.user_id = uuid.UUID(USER_ID)
    mock_profile.name = "Profile 1"
    mock_profile.is_active = True
    mock_profile.created_at = datetime.now()
    mock_profile.updated_at = datetime.now()
    mock_service.create_watch_profile.return_value = mock_profile
    
    response = client.post("/api/v1/watch-profiles", json={"name": "Profile 1"})
    assert response.status_code == 201
    assert response.json()["name"] == "Profile 1"

@patch("app.api.v1.watch_profiles.watch_profile_service")
def test_get_watch_profile_cross_user_rejection(mock_service):
    # Mock service throwing NotFoundError when access is denied (cross-user)
    mock_service.get_watch_profile.side_effect = NotFoundError("Access denied")
    response = client.get(f"/api/v1/watch-profiles/{uuid.uuid4()}")
    assert response.status_code == 404

@patch("app.api.v1.watch_profiles.watch_profile_service")
def test_add_company_to_watch_profile(mock_service):
    mock_wpc = MagicMock()
    mock_wpc.id = uuid.uuid4()
    mock_wpc.watch_profile_id = uuid.uuid4()
    mock_wpc.company_id = uuid.uuid4()
    mock_wpc.career_url = "https://example.com/careers"
    mock_wpc.is_active = True
    mock_wpc.created_at = datetime.now()
    mock_wpc.updated_at = datetime.now()
    mock_service.add_company_to_watch_profile.return_value = mock_wpc
    
    response = client.post(
        f"/api/v1/watch-profiles/{uuid.uuid4()}/companies", 
        json={"company_id": str(uuid.uuid4()), "career_url": "https://example.com/careers"}, 
        
    )
    assert response.status_code == 201
    assert response.json()["career_url"] == "https://example.com/careers"

@patch("app.api.v1.watch_profiles.watch_profile_service")
def test_create_watch_rule(mock_service):
    mock_rule = MagicMock()
    mock_rule.id = uuid.uuid4()
    mock_rule.watch_profile_id = uuid.uuid4()
    mock_rule.job_type = "internship"
    mock_rule.role_keywords = ["sde"]
    mock_rule.location_keywords = []
    mock_rule.include_keywords = []
    mock_rule.exclude_keywords = []
    mock_rule.created_at = datetime.now()
    mock_rule.updated_at = datetime.now()
    mock_service.create_watch_rule.return_value = mock_rule
    
    response = client.post(
        f"/api/v1/watch-profiles/{uuid.uuid4()}/rules", 
        json={"job_type": "internship", "role_keywords": ["sde"]}, 
        
    )
    assert response.status_code == 201
    assert response.json()["job_type"] == "internship"
