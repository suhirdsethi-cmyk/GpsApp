from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sharer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    viewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="PENDING", index=True)  # PENDING, ACCEPTED, REJECTED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sharer = relationship("User", foreign_keys=[sharer_id])
    viewer = relationship("User", foreign_keys=[viewer_id])
