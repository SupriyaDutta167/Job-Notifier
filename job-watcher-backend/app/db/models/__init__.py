from app.db.models.user import User
from app.db.models.company import Company
from app.db.models.watch_profile import WatchProfile
from app.db.models.watch_profile_company import WatchProfileCompany
from app.db.models.watch_rule import WatchRule
from app.db.models.job import Job
from app.db.models.job_match import JobMatch
from app.db.models.notification import Notification
from app.db.models.scan_run import ScanRun
from app.db.models.scan_error import ScanError

# Import all models here so Alembic can discover them via Base.metadata
