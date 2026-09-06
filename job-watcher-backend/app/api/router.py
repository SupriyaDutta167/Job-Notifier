from fastapi import APIRouter
from app.api.v1 import health
from app.api.v1 import companies
from app.api.v1 import watch_profiles
from app.api.v1 import jobs

api_router = APIRouter()

api_router.include_router(health.router, prefix="/v1", tags=["health"])
api_router.include_router(companies.router, prefix="/v1/companies", tags=["companies"])
api_router.include_router(watch_profiles.router, prefix="/v1/watch-profiles", tags=["watch-profiles"])
api_router.include_router(jobs.router, prefix="/v1/jobs", tags=["jobs"])
