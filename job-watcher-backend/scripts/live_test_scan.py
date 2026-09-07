import sys
import argparse
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.scanning.scan_service import ScanService
from app.services.matching.match_service import MatchService
from app.services.notifications.notification_service import NotificationService
from app.services.notifications.telegram import TelegramNotificationProvider
from app.core.config import settings
from app.db.models.company import Company
from app.db.models.watch_profile import WatchProfile
from app.db.models.watch_profile_company import WatchProfileCompany
from app.db.models.watch_rule import WatchRule
from app.db.models.user import User
import uuid

class DummyNotificationProvider(TelegramNotificationProvider):
    def send(self, destination: str, message: str):
        from app.services.notifications.interfaces import NotificationDeliveryResult
        safe_message = message.encode("ascii", "ignore").decode("ascii")
        print(f"[DRY-RUN] Would send Telegram notification to {destination}:\n{safe_message}\n")
        return NotificationDeliveryResult(success=True)

def setup_test_data(db: Session) -> uuid.UUID:
    """Sets up a synthetic user and WatchProfile targeting Figma for live testing."""
    user = db.query(User).filter_by(email="scan-live-test@example.com").first()
    if not user:
        user = User(
            email="scan-live-test@example.com",
            telegram_chat_id=settings.TELEGRAM_CHAT_ID or "dry-run-chat-id"
        )
        db.add(user)
        db.flush()

    profile = db.query(WatchProfile).filter_by(user_id=user.id, name="Figma Live Test").first()
    if not profile:
        profile = WatchProfile(
            user_id=user.id,
            name="Figma Live Test"
        )
        db.add(profile)
        db.flush()
        
        # Add a rule that will definitely match something
        rule = WatchRule(
            watch_profile_id=profile.id,
            role_keywords=["engineer", "designer", "manager", "software"]
        )
        db.add(rule)
        
    company = db.query(Company).filter_by(slug="figma").first()
    if not company:
        company = Company(
            name="Figma",
            slug="figma",
            website_url="https://figma.com"
        )
        db.add(company)
        db.flush()
        
    wp_company = db.query(WatchProfileCompany).filter_by(
        watch_profile_id=profile.id,
        company_id=company.id
    ).first()
    
    if not wp_company:
        wp_company = WatchProfileCompany(
            watch_profile_id=profile.id,
            company_id=company.id,
            career_url="https://boards.greenhouse.io/figma"
        )
        db.add(wp_company)
        
    db.commit()
    return profile.id

def main():
    parser = argparse.ArgumentParser(description="Live end-to-end scan test")
    parser.add_argument("--dry-run-notifications", action="store_true", help="Do not send real Telegram messages")
    args = parser.parse_args()
    
    print("Starting Live Scan Orchestration Test")
    print(f"Dry-run notifications: {args.dry_run_notifications}")
    
    db = SessionLocal()
    try:
        profile_id = setup_test_data(db)
        
        match_service = MatchService()
        if args.dry_run_notifications:
            provider = DummyNotificationProvider()
        else:
            provider = TelegramNotificationProvider()
            
        notification_service = NotificationService(provider=provider)
        scan_service = ScanService(match_service=match_service, notification_service=notification_service)
        
        print("\nRunning scan...")
        result = scan_service.run_scan_for_profile(db, profile_id)
        
        print("\n=== Scan Completed ===")
        print(f"Status: {result.status}")
        print(f"Profiles Scanned: {result.profiles_scanned}")
        print(f"Career URLs Scanned: {result.career_urls_scanned}")
        print(f"Jobs Discovered: {result.jobs_discovered}")
        print(f"New Jobs Persisted: {result.jobs_new}")
        print(f"Matches Identified: {result.jobs_matched}")
        print(f"Notifications Attempted/Sent: {result.notifications_sent}")
        print(f"Errors: {result.errors}")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
