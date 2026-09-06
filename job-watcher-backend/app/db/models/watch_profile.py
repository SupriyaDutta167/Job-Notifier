import uuid
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
