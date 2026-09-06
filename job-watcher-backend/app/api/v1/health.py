from fastapi import APIRouter
from app.db.session import check_database_connection

router = APIRouter()

@router.get("/health")
def health_check():
    """
    Health check endpoint.
    Checks application and database connectivity.
    """
    db_status = "ok" if check_database_connection() else "error"
    return {
        "status": "ok",
        "database": db_status
    }
