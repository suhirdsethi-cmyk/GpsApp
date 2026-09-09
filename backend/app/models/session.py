from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class TrackingSession(Base):
    __tablename__ = "tracking_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    sharer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(String(20), default="ACTIVE", index=True)  # ACTIVE, EXPIRED, STOPPED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    sharer = relationship("User", back_populates="sessions")
    location_updates = relationship("LocationUpdate", back_populates="session", cascade="all, delete-orphan")
