from app.db.models.job import Job
from app.db.models.company import Company
from app.db.models.job_match import JobMatch
from app.db.models.watch_profile import WatchProfile

def build_job_match_message(
    job: Job,
    company: Company,
    job_match: JobMatch,
    profile: WatchProfile | None = None
) -> str:
    location = job.location if job.location else "Not specified"
    job_type = job.job_type if job.job_type else "Not specified"
    source = job.source if job.source else "Unknown"
    
    # We must have an apply url or some fallback
    apply_url = job.apply_url if job.apply_url else job.source_url
    if not apply_url:
        apply_url = "Apply link unavailable"
        
    reason = job_match.match_reason if job_match.match_reason else "Matched"
    profile_section = f"\nProfile: {profile.name}" if profile and profile.name else ""

    return f"""🚨 New Job Match

Company: {company.name}
Role: {job.title}{profile_section}
Location: {location}
Type: {job_type}

Why it matches:
{reason}

Apply:
{apply_url}

Source:
{source}
"""
