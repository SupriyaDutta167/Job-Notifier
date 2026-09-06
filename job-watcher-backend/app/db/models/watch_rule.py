import uuid
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
