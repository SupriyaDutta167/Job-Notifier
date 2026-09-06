import uuid
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
