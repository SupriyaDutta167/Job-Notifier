from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.auth.dependencies import get_current_user
from app.db.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.scanning import scan_query_service

router = APIRouter()

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return scan_query_service.get_dashboard_summary(db, user_id=current_user.id)
