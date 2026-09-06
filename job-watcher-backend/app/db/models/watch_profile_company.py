import uuid
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
