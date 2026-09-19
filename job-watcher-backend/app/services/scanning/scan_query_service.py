import re
from typing import Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, func, distinct

from app.db.models.scan_run import ScanRun
from app.db.models.scan_error import ScanError
from app.db.models.watch_profile import WatchProfile
from app.db.models.watch_profile_company import WatchProfileCompany
from app.db.models.company import Company
from app.db.models.job import Job
from app.db.models.job_match import JobMatch
from app.db.models.notification import Notification
from app.schemas.scan import (
    ScanRunResponse,
    ScanErrorResponse,
    CompanyScanStatusItem,
    ScanDetailResponse,
)
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    NotificationSummary,
)
from app.core.exceptions import NotFoundError

# Sanitization regexes to prevent credential leakage
SENSITIVE_PATTERNS = [
    re.compile(r"(Bearer\s+)[A-Za-z0-9\-_.]+", re.IGNORECASE),
    re.compile(r"(bot\d+:)[A-Za-z0-9\-_]+", re.IGNORECASE),
    re.compile(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+:)[^@\s]+@", re.IGNORECASE),
    re.compile(r"(password|token|secret|key|authorization)=['\"][^'\"]+['\"]", re.IGNORECASE),
]

def sanitize_message(msg: str | None) -> str | None:
    if not msg:
        return msg
    sanitized = msg
    for pattern in SENSITIVE_PATTERNS:
        sanitized = pattern.sub(r"\1[REDACTED]", sanitized)
    return sanitized

def sanitize_details(details: dict[str, Any] | None) -> dict[str, Any] | None:
    if not details or not isinstance(details, dict):
        return details
    cleaned: dict[str, Any] = {}
    for k, v in details.items():
        if isinstance(v, str):
            cleaned[k] = sanitize_message(v)
        elif isinstance(v, list):
            cleaned[k] = [sanitize_message(item) if isinstance(item, str) else item for item in v]
        elif isinstance(v, dict):
            cleaned[k] = sanitize_details(v)
        else:
            cleaned[k] = v
    return cleaned

def list_scan_runs(
    db: Session,
    user_id: UUID,
    watch_profile_id: UUID | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0
) -> list[ScanRunResponse]:
    """
    List scan runs scoped to the user's watch profiles.
    """
    profile_query = select(WatchProfile).where(WatchProfile.user_id == user_id)
    if watch_profile_id:
        profile_query = profile_query.where(WatchProfile.id == watch_profile_id)
        
    profiles = db.execute(profile_query).scalars().all()
    if not profiles:
        return []
        
    profile_map = {p.id: p.name for p in profiles}
    user_profile_ids = list(profile_map.keys())
    
    # Active companies count per profile
    comp_counts = db.execute(
        select(WatchProfileCompany.watch_profile_id, func.count(WatchProfileCompany.id))
        .where(
            WatchProfileCompany.watch_profile_id.in_(user_profile_ids),
            WatchProfileCompany.is_active == True
        )
        .group_by(WatchProfileCompany.watch_profile_id)
    ).all()
    comp_count_map = {pid: count for pid, count in comp_counts}
    
    # Query scan runs
    scan_query = select(ScanRun).where(ScanRun.watch_profile_id.in_(user_profile_ids))
    if status:
        scan_query = scan_query.where(ScanRun.status == status)
    
    scan_query = scan_query.order_by(ScanRun.started_at.desc()).offset(offset).limit(limit)
    runs = db.execute(scan_query).scalars().all()
    
    if not runs:
        return []
        
    run_ids = [r.id for r in runs]
    
    # Error counts per run
    err_counts = db.execute(
        select(ScanError.scan_run_id, func.count(ScanError.id))
        .where(ScanError.scan_run_id.in_(run_ids))
        .group_by(ScanError.scan_run_id)
    ).all()
    err_count_map = {rid: count for rid, count in err_counts}
    
    responses: list[ScanRunResponse] = []
    for r in runs:
        responses.append(
            ScanRunResponse(
                id=r.id,
                watch_profile_id=r.watch_profile_id,
                watch_profile_name=profile_map.get(r.watch_profile_id),
                status=r.status,
                started_at=r.started_at,
                completed_at=r.completed_at,
                companies_checked=comp_count_map.get(r.watch_profile_id, 0),
                jobs_discovered=r.jobs_discovered,
                jobs_new=r.jobs_new,
                jobs_matched=r.jobs_matched,
                notifications_sent=r.notifications_sent,
                error_count=err_count_map.get(r.id, 0),
                created_at=r.created_at,
            )
        )
        
    return responses

def get_scan_run_detail(db: Session, user_id: UUID, scan_run_id: UUID) -> ScanDetailResponse:
    """
    Get detailed information for a scan run, ensuring user ownership.
    """
    scan_run = db.get(ScanRun, scan_run_id)
    if not scan_run:
        raise NotFoundError("Scan run not found")
        
    # Check user ownership
    watch_profile = db.get(WatchProfile, scan_run.watch_profile_id)
    if not watch_profile or watch_profile.user_id != user_id:
        raise NotFoundError("Scan run not found")
        
    # Get associated companies for this profile
    wp_companies = db.execute(
        select(WatchProfileCompany, Company)
        .join(Company, WatchProfileCompany.company_id == Company.id)
        .where(WatchProfileCompany.watch_profile_id == scan_run.watch_profile_id)
    ).all()
    
    wpc_map = {wpc.id: (wpc, comp) for wpc, comp in wp_companies}
    
    # Get errors for this run
    errors = db.execute(
        select(ScanError).where(ScanError.scan_run_id == scan_run.id).order_by(ScanError.created_at.asc())
    ).scalars().all()
    
    error_items: list[ScanErrorResponse] = []
    error_by_wpc_id: dict[UUID, ScanError] = {}
    
    for err in errors:
        comp_name = None
        if err.watch_profile_company_id and err.watch_profile_company_id in wpc_map:
            comp_name = wpc_map[err.watch_profile_company_id][1].name
            error_by_wpc_id[err.watch_profile_company_id] = err
            
        error_items.append(
            ScanErrorResponse(
                id=err.id,
                scan_run_id=err.scan_run_id,
                watch_profile_company_id=err.watch_profile_company_id,
                company_name=comp_name,
                error_type=err.error_type,
                message=sanitize_message(err.message),
                details=sanitize_details(err.details),
                created_at=err.created_at,
            )
        )
        
    # Build per-company status breakdown
    company_statuses: list[CompanyScanStatusItem] = []
    for wpc, comp in wp_companies:
        err = error_by_wpc_id.get(wpc.id)
        if err:
            comp_status = "failed"
            err_type = err.error_type
            err_msg = sanitize_message(err.message)
        else:
            if scan_run.status in ("completed", "partial"):
                comp_status = "completed"
            elif scan_run.status == "running":
                comp_status = "running"
            else:
                comp_status = "failed"
            err_type = None
            err_msg = None
            
        company_statuses.append(
            CompanyScanStatusItem(
                company_id=comp.id,
                company_name=comp.name,
                status=comp_status,
                error_type=err_type,
                error_message=err_msg,
                career_url=wpc.career_url,
            )
        )
        
    return ScanDetailResponse(
        id=scan_run.id,
        watch_profile_id=scan_run.watch_profile_id,
        watch_profile_name=watch_profile.name,
        status=scan_run.status,
        started_at=scan_run.started_at,
        completed_at=scan_run.completed_at,
        companies_checked=len(wp_companies),
        jobs_discovered=scan_run.jobs_discovered,
        jobs_new=scan_run.jobs_new,
        jobs_matched=scan_run.jobs_matched,
        notifications_sent=scan_run.notifications_sent,
        error_count=len(errors),
        created_at=scan_run.created_at,
        errors=error_items,
        company_statuses=company_statuses,
    )

def get_dashboard_summary(db: Session, user_id: UUID) -> DashboardSummaryResponse:
    """
    Get aggregated overview statistics for the user's dashboard.
    """
    # 1. User's active watch profiles
    profiles = db.execute(
        select(WatchProfile).where(
            WatchProfile.user_id == user_id,
            WatchProfile.is_active == True
        )
    ).scalars().all()
    
    active_profile_ids = [p.id for p in profiles]
    active_profile_count = len(active_profile_ids)
    
    if active_profile_count == 0:
        return DashboardSummaryResponse(
            active_watch_profiles=0,
            monitored_companies=0,
            available_jobs=0,
            matched_jobs=0,
            notifications=NotificationSummary(total=0, sent=0, pending=0, failed=0),
            latest_scan=None,
            schedule_info="Scheduled every 2 hours via GitHub Actions",
        )
        
    # 2. Monitored companies count
    monitored_comp_ids = db.execute(
        select(distinct(WatchProfileCompany.company_id))
        .where(
            WatchProfileCompany.watch_profile_id.in_(active_profile_ids),
            WatchProfileCompany.is_active == True
        )
    ).scalars().all()
    monitored_companies_count = len(monitored_comp_ids)
    
    # 3. Available jobs count
    if monitored_comp_ids:
        available_jobs_count = db.execute(
            select(func.count(distinct(Job.id)))
            .where(Job.company_id.in_(monitored_comp_ids), Job.is_active == True)
        ).scalar() or 0
    else:
        available_jobs_count = 0
        
    # 4. Matched jobs count
    matched_jobs_count = db.execute(
        select(func.count(distinct(JobMatch.job_id)))
        .where(
            JobMatch.watch_profile_id.in_(active_profile_ids),
            JobMatch.matched == True
        )
    ).scalar() or 0
    
    # 5. Notifications breakdown
    notif_counts = db.execute(
        select(Notification.status, func.count(Notification.id))
        .where(Notification.user_id == user_id)
        .group_by(Notification.status)
    ).all()
    notif_dict = {status: count for status, count in notif_counts}
    notif_summary = NotificationSummary(
        total=sum(notif_dict.values()),
        sent=notif_dict.get("sent", 0),
        pending=notif_dict.get("pending", 0),
        failed=notif_dict.get("failed", 0),
    )
    
    # 6. Latest scan run for active profiles
    latest_run = db.execute(
        select(ScanRun)
        .where(ScanRun.watch_profile_id.in_(active_profile_ids))
        .order_by(ScanRun.started_at.desc())
    ).scalars().first()
    
    latest_scan_resp = None
    if latest_run:
        wp = next((p for p in profiles if p.id == latest_run.watch_profile_id), None)
        err_count = db.execute(
            select(func.count(ScanError.id)).where(ScanError.scan_run_id == latest_run.id)
        ).scalar() or 0
        
        comp_count = db.execute(
            select(func.count(WatchProfileCompany.id)).where(
                WatchProfileCompany.watch_profile_id == latest_run.watch_profile_id,
                WatchProfileCompany.is_active == True
            )
        ).scalar() or 0
        
        latest_scan_resp = ScanRunResponse(
            id=latest_run.id,
            watch_profile_id=latest_run.watch_profile_id,
            watch_profile_name=wp.name if wp else None,
            status=latest_run.status,
            started_at=latest_run.started_at,
            completed_at=latest_run.completed_at,
            companies_checked=comp_count,
            jobs_discovered=latest_run.jobs_discovered,
            jobs_new=latest_run.jobs_new,
            jobs_matched=latest_run.jobs_matched,
            notifications_sent=latest_run.notifications_sent,
            error_count=err_count,
            created_at=latest_run.created_at,
        )
        
    return DashboardSummaryResponse(
        active_watch_profiles=active_profile_count,
        monitored_companies=monitored_companies_count,
        available_jobs=available_jobs_count,
        matched_jobs=matched_jobs_count,
        notifications=notif_summary,
        latest_scan=latest_scan_resp,
        schedule_info="Scheduled every 2 hours via GitHub Actions",
    )
