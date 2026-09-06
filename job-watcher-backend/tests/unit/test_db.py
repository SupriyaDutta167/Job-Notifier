import pytest
from unittest.mock import patch, MagicMock
from app.db.session import get_db, check_database_connection
from app.core.config import settings

def test_get_db_yields_session_and_closes():
    """
    Test that get_db yields a session and ensures it is closed afterwards.
    """
    with patch("app.db.session.SessionLocal") as mock_session_local:
        mock_session = MagicMock()
        mock_session_local.return_value = mock_session
        
        db_generator = get_db()
        db = next(db_generator)
        
        assert db == mock_session
        mock_session.close.assert_not_called()
        
        with pytest.raises(StopIteration):
            next(db_generator)
            
        mock_session.close.assert_called_once()

@patch("app.db.session.engine")
def test_check_database_connection_success(mock_engine):
    """
    Test check_database_connection returns True when database is reachable.
    """
    mock_conn = MagicMock()
    mock_engine.connect.return_value.__enter__.return_value = mock_conn
    
    result = check_database_connection()
    assert result is True
    mock_conn.execute.assert_called_once()

@patch("app.db.session.engine")
def test_check_database_connection_failure(mock_engine):
    """
    Test check_database_connection returns False when an exception occurs.
    """
    mock_engine.connect.side_effect = Exception("Connection refused")
    
    result = check_database_connection()
    assert result is False
