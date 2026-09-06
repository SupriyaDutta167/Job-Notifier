from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db.models.job import Job
from app.db.models.watch_profile import WatchProfile
from app.db.models.watch_rule import WatchRule
from app.db.models.job_match import JobMatch
from app.services.matching.matcher import evaluate_match
from app.core.exceptions import NotFoundError, ForbiddenError

class MatchService:
    def evaluate_job_for_profile(self, db: Session, user_id: UUID, job_id: UUID, watch_profile_id: UUID) -> JobMatch:
        """
        Evaluates a job against a specific watch profile.
        Creates or updates the JobMatch record.
        """
        # Ensure profile exists and belongs to the user
        profile = db.execute(select(WatchProfile).where(WatchProfile.id == watch_profile_id)).scalars().first()
        if not profile:
            raise NotFoundError("Watch Profile not found")
        if profile.user_id != user_id:
            raise ForbiddenError("Not authorized to access this Watch Profile")
            
        # Ensure job exists
        job = db.execute(select(Job).where(Job.id == job_id)).scalars().first()
        if not job:
            raise NotFoundError("Job not found")
            
        # Ensure rule exists
        rule = db.execute(select(WatchRule).where(WatchRule.watch_profile_id == watch_profile_id)).scalars().first()
        if not rule:
            raise NotFoundError("Watch Rule not configured for this profile")
            
        # Evaluate
        result = evaluate_match(job, rule)
        
        # Upsert JobMatch
        job_match = db.execute(
            select(JobMatch).where(
                (JobMatch.job_id == job_id) & 
                (JobMatch.watch_profile_id == watch_profile_id)
            )
        ).scalars().first()
        
        now = datetime.now(timezone.utc)
        
        if job_match:
            job_match.matched = result.matched
            job_match.score = result.score
            job_match.match_reason = result.match_reason
            job_match.matched_at = now
        else:
            job_match = JobMatch(
                job_id=job_id,
                watch_profile_id=watch_profile_id,
                matched=result.matched,
                score=result.score,
                match_reason=result.match_reason,
                matched_at=now
            )
            db.add(job_match)
            
        db.commit()
        db.refresh(job_match)
        
        return job_match
