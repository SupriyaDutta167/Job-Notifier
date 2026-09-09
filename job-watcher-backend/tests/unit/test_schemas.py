import pytest
import uuid
from datetime import datetime
from pydantic import ValidationError
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse
from app.schemas.watch_rule import WatchRuleCreate
from app.schemas.job import JobResponse
from app.schemas.watch_profile_company import WatchProfileCompanyCreate

def test_company_create_valid():
    data = {"name": "Test Co", "slug": "test-co", "website_url": "https://test.com"}
    company = CompanyCreate(**data)
    assert company.name == "Test Co"
    assert company.slug == "test-co"
    assert str(company.website_url) == "https://test.com/"

def test_company_create_invalid_empty_name():
    with pytest.raises(ValidationError):
        CompanyCreate(name="", slug="test-co")

def test_company_create_invalid_url():
    with pytest.raises(ValidationError):
        CompanyCreate(name="Test Co", slug="test-co", website_url="not-a-url")

def test_company_update_partial():
    update = CompanyUpdate(name="New Name")
    assert update.name == "New Name"
    assert update.slug is None

def test_watch_rule_keyword_cleaning():
    data = {
        "role_keywords": ["  software engineer  ", "", "sde"],
        "location_keywords": None
    }
    rule = WatchRuleCreate(**data)
    assert rule.role_keywords == ["software engineer", "sde"]
    assert rule.location_keywords is None

def test_orm_attributes_conversion():
    class DummyORM:
        def __init__(self):
            self.id = uuid.uuid4()
            self.name = "ORM Co"
            self.slug = "orm-co"
            self.website_url = "https://orm.com"
            self.created_at = datetime.now()
            self.updated_at = datetime.now()

    orm_instance = DummyORM()
    response = CompanyResponse.model_validate(orm_instance)
    
    assert response.id == orm_instance.id
    assert response.name == "ORM Co"
    assert str(response.website_url) == "https://orm.com/"

def test_watch_profile_company_url_validation():
    # Valid url
    wpc = WatchProfileCompanyCreate(company_id=uuid.uuid4(), career_url="https://careers.test.com")
    assert str(wpc.career_url) == "https://careers.test.com/"
    
    # Invalid url (localhost)
    with pytest.raises(ValidationError) as exc_info:
        WatchProfileCompanyCreate(company_id=uuid.uuid4(), career_url="http://localhost:8000/careers")
    assert "URL cannot point to localhost" in str(exc_info.value)
    
    with pytest.raises(ValidationError) as exc_info:
        WatchProfileCompanyCreate(company_id=uuid.uuid4(), career_url="http://127.0.0.1/jobs")
    assert "URL cannot point to localhost" in str(exc_info.value)
    
    # Invalid url schemes (ftp, etc are rejected by HttpUrl by default, but let's test)
    with pytest.raises(ValidationError):
        WatchProfileCompanyCreate(company_id=uuid.uuid4(), career_url="ftp://server/jobs")
