import pytest
import uuid
from unittest.mock import MagicMock
from sqlalchemy.exc import IntegrityError
from app.services.companies.company_service import create_company, delete_company
from app.schemas.company import CompanyCreate
from app.core.exceptions import ConflictError

def test_create_company_service():
    mock_db = MagicMock()
    data = CompanyCreate(name="Service Co", slug="service-co")
    
    company = create_company(mock_db, data)
    
    assert company.name == "Service Co"
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()

def test_create_company_service_integrity_error():
    mock_db = MagicMock()
    mock_db.commit.side_effect = IntegrityError("statement", "params", "orig")
    data = CompanyCreate(name="Service Co", slug="service-co")
    
    with pytest.raises(ConflictError) as exc_info:
        create_company(mock_db, data)
        
    assert "already exists" in str(exc_info.value)
    mock_db.rollback.assert_called_once()

def test_delete_company_with_dependencies():
    mock_db = MagicMock()
    # Mock get_company
    mock_db.execute.return_value.scalars.return_value.first.side_effect = [
        MagicMock(), # return company
        MagicMock()  # return dependent relationship
    ]
    
    with pytest.raises(ConflictError) as exc_info:
        delete_company(mock_db, uuid.uuid4())
        
    assert "monitored by one or more watch profiles" in str(exc_info.value)
