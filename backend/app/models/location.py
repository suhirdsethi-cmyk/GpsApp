from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class LocationUpdate(Base):
    __tablename__ = "location_updates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("tracking_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float, nullable=False)
    speed = Column(Float, nullable=True, default=0.0)
    heading = Column(Float, nullable=True, default=0.0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationship
    session = relationship("TrackingSession", back_populates="location_updates")
