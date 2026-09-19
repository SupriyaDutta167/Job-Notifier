import logging
import uuid
import time
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import settings
from app.db.models.scan_run import ScanRun
from app.db.models.scan_error import ScanError
from app.db.models.watch_profile import WatchProfile
from app.db.models.watch_profile_company import WatchProfileCompany
from app.services.crawler.persistence_pipeline import run_persistence_pipeline
from app.services.matching.match_service import MatchService
from app.services.notifications.notification_service import NotificationService

logger = logging.getLogger(__name__)

class ScanResult(BaseModel):
    scan_id: uuid.UUID
    status: str
    profiles_scanned: int = 0
    career_urls_scanned: int = 0
    jobs_discovered: int = 0
    jobs_new: int = 0
    jobs_matched: int = 0
    notifications_sent: int = 0
    errors: int = 0

class ScanService:
    def __init__(self, match_service: MatchService, notification_service: NotificationService):
        self.match_service = match_service
        self.notification_service = notification_service

    def recover_stale_scans(self, db: Session, max_age_seconds: int = settings.MAX_SCAN_DURATION_SECONDS) -> int:
        """
        Recovers scans left stuck in 'running' state past the maximum scan duration budget.
        Transitions them to 'failed' and logs a diagnostic ScanError.
        """
        now = datetime.now(timezone.utc)
        stale_cutoff = now - timedelta(seconds=max_age_seconds)
        
        stale_runs = db.execute(
            select(ScanRun).where(
                (ScanRun.status == "running") &
                (ScanRun.started_at < stale_cutoff)
            )
        ).scalars().all()
        
        recovered_count = 0
        for sr in stale_runs:
            sr.status = "failed"
            sr.completed_at = now
            error = ScanError(
                scan_run_id=sr.id,
                error_type="STALE_RUN_TIMEOUT",
                message=f"Scan exceeded maximum execution budget of {max_age_seconds}s and was marked as abandoned/failed"
            )
            db.add(error)
            recovered_count += 1
            logger.warning(f"stale_scan_recovered: scan_id={sr.id}, profile_id={sr.watch_profile_id}, age_seconds={(now - sr.started_at).total_seconds():.1f}")
            
        if recovered_count > 0:
            db.commit()
            logger.info(f"stale_scans_recovery_summary: recovered={recovered_count}")
            
        return recovered_count

    def run_scan_for_profile(self, db: Session, watch_profile_id: uuid.UUID) -> ScanResult:
        """
        Orchestrates a complete scan for a single watch profile.
        1. Checks for active running scan (concurrency protection)
        2. Recovers stale runs if past maximum duration threshold
        3. Creates ScanRun with status='running'
        4. Crawls, Persists, Matches, and Notifies per company with transaction rollback isolation
        5. Finalizes ScanRun status and statistics
        """
        scan_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        stale_cutoff = now - timedelta(seconds=settings.MAX_SCAN_DURATION_SECONDS)
        result = ScanResult(scan_id=scan_id, status="running")
        scan_run: Optional[ScanRun] = None

        try:
            # Concurrency check: is there an active scan for this profile?
            active_run = db.execute(
                select(ScanRun).where(
                    (ScanRun.watch_profile_id == watch_profile_id) &
                    (ScanRun.status == "running")
                )
            ).scalars().first()
            
            if active_run and isinstance(active_run, ScanRun):
                started_at = getattr(active_run, "started_at", None)
                if isinstance(started_at, datetime) and started_at < stale_cutoff:
                    logger.warning(f"stale_active_scan_found: scan_id={active_run.id}, profile_id={watch_profile_id}. Marking failed before starting new scan.")
                    active_run.status = "failed"
                    active_run.completed_at = now
                    stale_err = ScanError(
                        scan_run_id=active_run.id,
                        error_type="STALE_RUN_TIMEOUT",
                        message=f"Scan exceeded maximum execution budget of {settings.MAX_SCAN_DURATION_SECONDS}s and was marked abandoned"
                    )
                    db.add(stale_err)
                    db.commit()
                else:
                    logger.warning(f"scan_concurrency_guard: active scan already running for profile {watch_profile_id} (scan_id={active_run.id}). Skipping duplicate execution.")
                    result.scan_id = active_run.id
                    result.status = "already_running"
                    return result

            scan_run = ScanRun(
                id=scan_id,
                watch_profile_id=watch_profile_id,
                status="running",
                started_at=now,
                jobs_discovered=0,
                jobs_new=0,
                jobs_matched=0,
                notifications_sent=0
            )
            db.add(scan_run)
            db.commit()
            db.refresh(scan_run)
            
            logger.info(f"scan_started: scan_id={scan_run.id}, profile_id={watch_profile_id}")

            profile = db.execute(
                select(WatchProfile).where(
                    (WatchProfile.id == watch_profile_id) & 
                    (WatchProfile.is_active == True)
                )
            ).scalars().first()
            
            if not profile:
                logger.warning(f"scan_aborted: watch profile {watch_profile_id} not found or inactive.")
                scan_run.status = "failed"
                scan_run.completed_at = datetime.now(timezone.utc)
                db.commit()
                result.status = "failed"
                return result
                
            result.profiles_scanned = 1
            
            companies = db.execute(
                select(WatchProfileCompany).where(
                    (WatchProfileCompany.watch_profile_id == watch_profile_id) &
                    (WatchProfileCompany.is_active == True)
                )
            ).scalars().all()
            
            success_count = 0
            fail_count = 0
            scan_start_time = time.monotonic()
            
            for wp_company in companies:
                if time.monotonic() - scan_start_time > settings.MAX_SCAN_DURATION_SECONDS:
                    logger.error(f"scan_budget_exceeded: profile_id={watch_profile_id}, scan_id={scan_run.id}, aborting remaining companies.")
                    error = ScanError(
                        scan_run_id=scan_run.id,
                        error_type="GLOBAL_BUDGET_EXCEEDED",
                        message="Scan duration exceeded budget"
                    )
                    db.add(error)
                    db.commit()
                    result.errors += 1
                    fail_count += 1
                    break
                    
                result.career_urls_scanned += 1
                logger.info(f"company_scan_started: scan_id={scan_run.id}, company_id={wp_company.company_id}, url={wp_company.career_url}")
                
                try:
                    # 1. Crawl and Persist
                    persistence_result = run_persistence_pipeline(
                        db=db,
                        career_url=wp_company.career_url,
                        company_id=wp_company.company_id
                    )
                    
                    if not persistence_result.crawler_success:
                        fail_count += 1
                        dur = getattr(persistence_result, "duration_ms", None)
                        reqs = getattr(persistence_result, "requests_made", None)
                        raw_errs = getattr(persistence_result, "errors", None)
                        clean_errs = [str(err) for err in raw_errs] if isinstance(raw_errs, (list, tuple)) else []
                        error = ScanError(
                            scan_run_id=scan_run.id,
                            watch_profile_company_id=wp_company.id,
                            error_type=str(persistence_result.error_category or "CRAWLER_ERROR"),
                            message="Crawler returned failure" if not clean_errs else clean_errs[0],
                            details={
                                "errors": clean_errs,
                                "duration_ms": int(dur) if isinstance(dur, (int, float)) else None,
                                "requests_made": int(reqs) if isinstance(reqs, (int, float)) else None
                            }
                        )
                        db.add(error)
                        db.commit()
                        result.errors += 1
                        logger.warning(f"company_scan_failed: scan_id={scan_run.id}, company_id={wp_company.company_id}, error={error.message}")
                        continue
                        
                    success_count += 1
                    scan_run.jobs_discovered += persistence_result.jobs_processed
                    scan_run.jobs_new += persistence_result.new_jobs
                    
                    result.jobs_discovered += persistence_result.jobs_processed
                    result.jobs_new += persistence_result.new_jobs
                    logger.info(f"company_scan_completed: scan_id={scan_run.id}, company_id={wp_company.company_id}, discovered={persistence_result.jobs_processed}, new={persistence_result.new_jobs}")
                    
                    # 2. Match and Notify only for NEW jobs
                    for job_id in persistence_result.new_job_ids:
                        try:
                            # Match
                            job_match = self.match_service.evaluate_job_for_profile(
                                db=db,
                                user_id=profile.user_id,
                                job_id=job_id,
                                watch_profile_id=profile.id
                            )
                            
                            if job_match.matched:
                                scan_run.jobs_matched += 1
                                result.jobs_matched += 1
                                
                                # Notify
                                try:
                                    notification = self.notification_service.send_job_match_notification(
                                        db=db,
                                        user_id=profile.user_id,
                                        job_match_id=job_match.id
                                    )
                                    if notification and notification.status == "sent":
                                        scan_run.notifications_sent += 1
                                        result.notifications_sent += 1
                                except Exception as notify_exc:
                                    db.rollback()
                                    logger.error(f"notification_failure: scan_id={scan_run.id}, match_id={job_match.id}: {notify_exc}")
                                    # Don't fail the scan, notification failure is isolated
                                    error = ScanError(
                                        scan_run_id=scan_run.id,
                                        watch_profile_company_id=wp_company.id,
                                        error_type="NOTIFICATION_ERROR",
                                        message=str(notify_exc)
                                    )
                                    db.add(error)
                                    db.commit()
                                    result.errors += 1
                                    
                        except Exception as match_exc:
                            db.rollback()
                            logger.error(f"match_failure: scan_id={scan_run.id}, job_id={job_id}: {match_exc}")
                            error = ScanError(
                                scan_run_id=scan_run.id,
                                watch_profile_company_id=wp_company.id,
                                error_type="MATCH_ERROR",
                                message=str(match_exc)
                            )
                            db.add(error)
                            db.commit()
                            result.errors += 1
                            
                    # Update DB after each company to save progress
                    db.commit()
                    
                except Exception as company_exc:
                    db.rollback()
                    logger.error(f"company_unexpected_failure: scan_id={scan_run.id}, company_id={wp_company.company_id}: {company_exc}")
                    fail_count += 1
                    error = ScanError(
                        scan_run_id=scan_run.id,
                        watch_profile_company_id=wp_company.id,
                        error_type="UNEXPECTED_ERROR",
                        message=str(company_exc)
                    )
                    db.add(error)
                    db.commit()
                    result.errors += 1
                    
            if fail_count > 0 and success_count > 0:
                scan_run.status = "partial"
            elif fail_count > 0 and success_count == 0:
                scan_run.status = "failed"
            elif result.errors > 0 and success_count > 0:
                scan_run.status = "partial"
            else:
                scan_run.status = "completed"
                
        except Exception as e:
            logger.exception(f"fatal_orchestration_failure: scan_id={scan_id}")
            result.status = "failed"
            result.errors += 1
            try:
                db.rollback()
                if scan_run:
                    scan_run.status = "failed"
                    scan_run.completed_at = datetime.now(timezone.utc)
                    error = ScanError(
                        scan_run_id=scan_run.id,
                        error_type="FATAL_ERROR",
                        message=str(e)
                    )
                    db.add(error)
                    db.commit()
            except Exception:
                pass
            
        finally:
            if scan_run:
                try:
                    if not scan_run.completed_at:
                        scan_run.completed_at = datetime.now(timezone.utc)
                    db.commit()
                    db.refresh(scan_run)
                    result.status = scan_run.status
                    logger.info(f"scan_finished: scan_id={scan_run.id}, status={scan_run.status}, discovered={scan_run.jobs_discovered}, new={scan_run.jobs_new}, matched={scan_run.jobs_matched}, notifications={scan_run.notifications_sent}, errors={result.errors}")
                except Exception as fin_err:
                    logger.error(f"scan_finalize_error: {fin_err}")
                    try:
                        db.rollback()
                    except Exception:
                        pass
            
        return result

    def run_scan_for_all_profiles(self, db: Session) -> List[ScanResult]:
        """
        Iterates through all active watch profiles and runs scans.
        Recovers any stale runs before launching new profile scans.
        """
        self.recover_stale_scans(db)
        
        profiles = db.execute(
            select(WatchProfile).where(WatchProfile.is_active == True)
        ).scalars().all()
        
        results = []
        for p in profiles:
            res = self.run_scan_for_profile(db, p.id)
            results.append(res)
            
        return results
