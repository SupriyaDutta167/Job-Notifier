from pydantic import BaseModel
from app.schemas.scan import ScanRunResponse

class NotificationSummary(BaseModel):
    total: int = 0
    sent: int = 0
    pending: int = 0
    failed: int = 0

class DashboardSummaryResponse(BaseModel):
    active_watch_profiles: int
    monitored_companies: int
    available_jobs: int
    matched_jobs: int
    notifications: NotificationSummary
    latest_scan: ScanRunResponse | None = None
    schedule_info: str = "Scheduled every 2 hours via GitHub Actions"
