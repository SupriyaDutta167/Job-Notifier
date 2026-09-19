import sys
import logging
from app.db.session import SessionLocal
from app.services.scanning.scan_service import ScanService
from app.services.matching.match_service import MatchService
from app.services.notifications.notification_service import NotificationService
from app.services.notifications.telegram import TelegramNotificationProvider

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run():
    """
    Worker entry point for scheduled scans.
    1. Loads DB Session
    2. Runs ScanService for all active profiles
    3. Exits with 0 for success/partial, non-zero for fatal error
    """
    logger.info("Starting scheduled scan worker...")
    
    db = SessionLocal()
    try:
        match_service = MatchService()
        notification_service = NotificationService(provider=TelegramNotificationProvider())
        scan_service = ScanService(match_service=match_service, notification_service=notification_service)
        
        results = scan_service.run_scan_for_all_profiles(db)
        
        fatal_errors = 0
        partial_errors = 0
        success = 0
        skipped_already_running = 0
        
        total_discovered = 0
        total_new = 0
        total_matches = 0
        total_notifications = 0
        
        for res in results:
            if res.status == "already_running":
                skipped_already_running += 1
                logger.warning(f"worker_scan_skipped_already_running: scan_id={res.scan_id}")
                continue

            total_discovered += res.jobs_discovered
            total_new += res.jobs_new
            total_matches += res.jobs_matched
            total_notifications += res.notifications_sent
            
            if res.status == "failed":
                fatal_errors += 1
            elif res.status == "partial":
                partial_errors += 1
            else:
                success += 1
                
        logger.info(f"Scan Completed. Profiles: {len(results)}. Success: {success}, Partial: {partial_errors}, Failed: {fatal_errors}, Skipped (Already Running): {skipped_already_running}")
        logger.info(f"Aggregated Stats - Discovered: {total_discovered}, New: {total_new}, Matches: {total_matches}, Notifications: {total_notifications}")
        
        if fatal_errors > 0:
            logger.error("Scan finished with fatal errors.")
            sys.exit(1)
        else:
            logger.info("Scan finished successfully.")
            sys.exit(0)
            
    except Exception as e:
        logger.exception(f"Unhandled worker exception: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run()
