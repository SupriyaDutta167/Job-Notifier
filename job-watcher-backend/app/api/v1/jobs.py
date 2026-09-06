from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.job import JobResponse
from app.services.jobs import job_service
from app.core.exceptions import NotFoundError

router = APIRouter()

@router.get("", response_model=list[JobResponse])
def list_jobs(
    company_id: UUID | None = Query(None, description="Filter jobs by company"),
    is_active: bool | None = Query(None, description="Filter jobs by active status"),
    db: Session = Depends(get_db)
):
    return job_service.list_jobs(db, company_id=company_id, is_active=is_active)

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    try:
        return job_service.get_job(db, job_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
