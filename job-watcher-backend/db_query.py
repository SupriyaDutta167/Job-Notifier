import sys, os
from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    res = conn.execute(text("""
        SELECT 
            SUM(jobs_discovered) as total_discovered, 
            SUM(jobs_new) as total_new, 
            SUM(jobs_matched) as total_matched, 
            SUM(notifications_sent) as total_notifications,
            MIN(started_at) as first_started,
            MAX(completed_at) as last_completed
        FROM scan_runs 
        WHERE started_at >= '2026-09-09 13:58:00' AND started_at <= '2026-09-09 14:07:00'
    """)).mappings().fetchone()
    
    print('Aggregate GH Actions Run:')
    print(dict(res))
    
    errors = conn.execute(text("""
        SELECT COUNT(*) as err_count
        FROM scan_errors e
        JOIN scan_runs r ON e.scan_run_id = r.id
        WHERE r.started_at >= '2026-09-09 13:58:00' AND r.started_at <= '2026-09-09 14:07:00'
    """)).mappings().fetchone()
    print('Errors:', dict(errors))
