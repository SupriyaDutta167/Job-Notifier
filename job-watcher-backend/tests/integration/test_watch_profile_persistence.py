import pytest
import uuid
import os
from sqlalchemy.orm import Session
from app.db.models.user import User
from app.core.config import settings

pytestmark = pytest.mark.skipif(
    not settings.DATABASE_URL,
    reason="DATABASE_URL not set, skipping integration tests"
)
from sqlalchemy.orm import Session
from app.db.models.user import User
from app.schemas.company import CompanyCreate
from app.schemas.watch_profile import WatchProfileCreate
from app.schemas.watch_profile_company import WatchProfileCompanyCreate
from app.services.companies.company_service import create_company
from app.services.watch_profiles.watch_profile_service import create_watch_profile, add_company_to_watch_profile
from app.db.session import SessionLocal

@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

def test_add_company_to_watch_profile_persistence(db: Session):
    # 1. Create a dummy user
    user = User(id=uuid.uuid4(), auth_user_id=uuid.uuid4(), email=f"test-{uuid.uuid4().hex[:8]}@example.com")
    db.add(user)
    db.commit()
    
    # 2. Create a company
    company_name = f"NVIDIA-{uuid.uuid4().hex[:8]}"
    company_data = CompanyCreate(name=company_name)
    company = create_company(db, company_data)
    
    # 3. Create a watch profile
    profile_data = WatchProfileCreate(name="My Profile")
    profile = create_watch_profile(db, user.id, profile_data)
    
    # 4. Add company to watch profile using HttpUrl directly in the schema
    url_str = "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite"
    wpc_data = WatchProfileCompanyCreate(company_id=company.id, career_url=url_str)
    
    # 5. This should NOT raise psycopg.ProgrammingError
    wpc = add_company_to_watch_profile(db, user.id, profile.id, wpc_data)
    
    # 6. Verify persistence
    assert wpc.id is not None
    assert str(wpc.career_url) == url_str
