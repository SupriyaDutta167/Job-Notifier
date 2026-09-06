from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)

@patch("app.api.v1.health.check_database_connection")
def test_health_check(mock_check_db):
    mock_check_db.return_value = True
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
    
@patch("app.api.v1.health.check_database_connection")
def test_health_check_db_failure(mock_check_db):
    mock_check_db.return_value = False
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "error"}
