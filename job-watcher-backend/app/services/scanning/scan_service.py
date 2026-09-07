import logging
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

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

    def run_scan_for_profile(self, db: Session, watch_profile_id: uuid.UUID) -> ScanResult:
        """
        Orchestrates a complete scan for a single watch profile.
        1. Create ScanRun
        2. Get active WatchProfileCompanies for this profile
        3. For each: Crawl, Persist, Match, Notify
        4. Record stats and finalize ScanRun
        """
        now = datetime.now(timezone.utc)
        scan_run = ScanRun(
            id=uuid.uuid4(),
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
        
        result = ScanResult(scan_id=scan_run.id, status="running")
        
        try:
            profile = db.execute(
                select(WatchProfile).where(
                    (WatchProfile.id == watch_profile_id) & 
                    (WatchProfile.is_active == True)
                )
            ).scalars().first()
            
            if not profile:
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
            
            for wp_company in companies:
                result.career_urls_scanned += 1
                try:
                    # 1. Crawl and Persist
                    persistence_result = run_persistence_pipeline(
                        db=db,
                        career_url=wp_company.career_url,
                        company_id=wp_company.company_id
                    )
                    
                    if not persistence_result.crawler_success:
                        fail_count += 1
                        error = ScanError(
                            scan_run_id=scan_run.id,
                            watch_profile_company_id=wp_company.id,
                            error_type="CRAWLER_ERROR",
                            message="Crawler returned failure",
                            details={"errors": persistence_result.errors}
                        )
                        db.add(error)
                        db.commit()
                        result.errors += 1
                        continue
                        
                    success_count += 1
                    scan_run.jobs_discovered += persistence_result.jobs_processed
                    scan_run.jobs_new += persistence_result.new_jobs
                    
                    result.jobs_discovered += persistence_result.jobs_processed
                    result.jobs_new += persistence_result.new_jobs
                    
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
                                    logger.error(f"Notification failure for JobMatch {job_match.id}: {notify_exc}")
                                    # Don't fail the scan, notification failure is localized
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
                            logger.error(f"Match failure for Job {job_id}: {match_exc}")
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
                    logger.error(f"Unexpected failure for company {wp_company.company_id}: {company_exc}")
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
            else:
                scan_run.status = "completed"
                
        except Exception as e:
            logger.exception("Fatal orchestration failure")
            scan_run.status = "failed"
            error = ScanError(
                scan_run_id=scan_run.id,
                error_type="FATAL_ERROR",
                message=str(e)
            )
            db.add(error)
            db.commit()
            result.errors += 1
            
        finally:
            scan_run.completed_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(scan_run)
            result.status = scan_run.status
            
        return result

    def run_scan_for_all_profiles(self, db: Session) -> List[ScanResult]:
        """
        Iterates through all active watch profiles and runs scans.
        """
        profiles = db.execute(
            select(WatchProfile).where(WatchProfile.is_active == True)
        ).scalars().all()
        
        results = []
        for p in profiles:
            res = self.run_scan_for_profile(db, p.id)
            results.append(res)
            
        return results
