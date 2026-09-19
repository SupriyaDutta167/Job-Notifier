from fastapi import APIRouter
from app.api.v1 import health
from app.api.v1 import companies
from app.api.v1 import watch_profiles
from app.api.v1 import jobs
from app.api.v1 import auth
from app.api.v1 import notifications
from app.api.v1 import scan_runs
from app.api.v1 import dashboard

api_router = APIRouter()

api_router.include_router(health.router, prefix="/v1", tags=["health"])
api_router.include_router(auth.router, prefix="/v1", tags=["auth"])
api_router.include_router(companies.router, prefix="/v1/companies", tags=["companies"])
api_router.include_router(watch_profiles.router, prefix="/v1/watch-profiles", tags=["watch-profiles"])
api_router.include_router(jobs.router, prefix="/v1/jobs", tags=["jobs"])
api_router.include_router(notifications.router, prefix="/v1/notifications", tags=["notifications"])
api_router.include_router(scan_runs.router, prefix="/v1/scan-runs", tags=["scan-runs"])
api_router.include_router(dashboard.router, prefix="/v1/dashboard", tags=["dashboard"])
