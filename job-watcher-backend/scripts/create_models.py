import os

base_dir = r"."\app\db\models"
os.makedirs(base_dir, exist_ok=True)

models = {
    "user.py": """import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, Boolean, DateTime
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    watch_profiles: Mapped[list["WatchProfile"]] = relationship("WatchProfile", back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
""",
    "company.py": """import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, DateTime
from app.db.base import Base

class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    website_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="company")
    watch_profile_companies: Mapped[list["WatchProfileCompany"]] = relationship("WatchProfileCompany", back_populates="company")
""",
    "watch_profile.py": """import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, Boolean, DateTime, ForeignKey
from app.db.base import Base

class WatchProfile(Base):
    __tablename__ = "watch_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User", back_populates="watch_profiles")
    rules: Mapped["WatchRule"] = relationship("WatchRule", back_populates="watch_profile", cascade="all, delete-orphan", uselist=False)
    companies: Mapped[list["WatchProfileCompany"]] = relationship("WatchProfileCompany", back_populates="watch_profile", cascade="all, delete-orphan")
    job_matches: Mapped[list["JobMatch"]] = relationship("JobMatch", back_populates="watch_profile", cascade="all, delete-orphan")
    scan_runs: Mapped[list["ScanRun"]] = relationship("ScanRun", back_populates="watch_profile", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="watch_profile", cascade="all, delete-orphan")
""",
    "watch_profile_company.py": """import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, Boolean, DateTime, ForeignKey, UniqueConstraint
from app.db.base import Base

class WatchProfileCompany(Base):
    __tablename__ = "watch_profile_companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    watch_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("watch_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    career_url: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("watch_profile_id", "company_id", "career_url", name="uq_watch_profile_company_url"),
    )

    watch_profile: Mapped["WatchProfile"] = relationship("WatchProfile", back_populates="companies")
    company: Mapped["Company"] = relationship("Company", back_populates="watch_profile_companies")
    scan_errors: Mapped[list["ScanError"]] = relationship("ScanError", back_populates="watch_profile_company", cascade="all, delete-orphan")
""",
    "watch_rule.py": """import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy import String, DateTime, ForeignKey
from app.db.base import Base

class WatchRule(Base):
    __tablename__ = "watch_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    watch_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("watch_profiles.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    job_type: Mapped[str | None] = mapped_column(String, nullable=True)
    role_keywords: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    location_keywords: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    include_keywords: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    exclude_keywords: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    watch_profile: Mapped["WatchProfile"] = relationship("WatchProfile", back_populates="rules")
""",
    "job.py": """import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from app.db.base import Base

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    source: Mapped[str] = mapped_column(String, index=True, nullable=False)
    external_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    fingerprint: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    job_type: Mapped[str | None] = mapped_column(String, nullable=True)
    apply_url: Mapped[str | None] = mapped_column(String, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("company_id", "source", "external_id", name="uq_job_company_source_external"),
    )

    company: Mapped["Company"] = relationship("Company", back_populates="jobs")
    matches: Mapped[list["JobMatch"]] = relationship("JobMatch", back_populates="job", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="job", cascade="all, delete-orphan")
""",
    "job_match.py": """import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Float, UniqueConstraint
from app.db.base import Base

class JobMatch(Base):
    __tablename__ = "job_matches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), index=True, nullable=False)
    watch_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("watch_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    matched: Mapped[bool] = mapped_column(Boolean, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    match_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    matched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("job_id", "watch_profile_id", name="uq_job_match_job_profile"),
    )

    job: Mapped["Job"] = relationship("Job", back_populates="matches")
    watch_profile: Mapped["WatchProfile"] = relationship("WatchProfile", back_populates="job_matches")
""",
    "notification.py": """import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint
from app.db.base import Base

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    watch_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("watch_profiles.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, index=True, nullable=False)
    recipient: Mapped[str | None] = mapped_column(String, nullable=True)
    message: Mapped[str | None] = mapped_column(String, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        UniqueConstraint("user_id", "job_id", "watch_profile_id", "channel", name="uq_notification_user_job_profile_channel"),
    )

    user: Mapped["User"] = relationship("User", back_populates="notifications")
    job: Mapped["Job"] = relationship("Job", back_populates="notifications")
    watch_profile: Mapped["WatchProfile"] = relationship("WatchProfile", back_populates="notifications")
""",
    "scan_run.py": """import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, DateTime, ForeignKey, Integer
from app.db.base import Base

class ScanRun(Base):
    __tablename__ = "scan_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    watch_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("watch_profiles.id", ondelete="CASCADE"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String, index=True, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    jobs_discovered: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    jobs_new: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    jobs_matched: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notifications_sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    watch_profile: Mapped["WatchProfile"] = relationship("WatchProfile", back_populates="scan_runs")
    scan_errors: Mapped[list["ScanError"]] = relationship("ScanError", back_populates="scan_run", cascade="all, delete-orphan")
""",
    "scan_error.py": """import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import String, DateTime, ForeignKey
from app.db.base import Base

class ScanError(Base):
    __tablename__ = "scan_errors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("scan_runs.id", ondelete="CASCADE"), index=True, nullable=False)
    watch_profile_company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("watch_profile_companies.id", ondelete="SET NULL"), nullable=True)
    error_type: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str | None] = mapped_column(String, nullable=True)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    scan_run: Mapped["ScanRun"] = relationship("ScanRun", back_populates="scan_errors")
    watch_profile_company: Mapped["WatchProfileCompany"] = relationship("WatchProfileCompany", back_populates="scan_errors")
""",
    "__init__.py": """from app.db.models.user import User
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
"""
}

for filename, content in models.items():
    with open(os.path.join(base_dir, filename), "w", encoding="utf-8") as f:
        f.write(content)

print("Created all models successfully")
