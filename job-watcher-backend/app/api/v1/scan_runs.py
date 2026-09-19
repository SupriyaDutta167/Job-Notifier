from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.auth.dependencies import get_current_user
from app.db.models.user import User
from app.schemas.scan import ScanRunResponse, ScanDetailResponse
from app.services.scanning import scan_query_service
from app.core.exceptions import NotFoundError

router = APIRouter()

@router.get("", response_model=list[ScanRunResponse])
def list_scan_runs(
    watch_profile_id: UUID | None = Query(None, description="Filter scan runs by watch profile"),
    status: str | None = Query(None, description="Filter scan runs by status (e.g. completed, partial, failed, running)"),
    limit: int = Query(50, ge=1, le=100, description="Max number of scan runs to return"),
    offset: int = Query(0, ge=0, description="Number of scan runs to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return scan_query_service.list_scan_runs(
        db,
        user_id=current_user.id,
        watch_profile_id=watch_profile_id,
        status=status,
        limit=limit,
        offset=offset
    )

@router.get("/{scan_run_id}", response_model=ScanDetailResponse)
def get_scan_run(
    scan_run_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return scan_query_service.get_scan_run_detail(db, user_id=current_user.id, scan_run_id=scan_run_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
