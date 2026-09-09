from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(10), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="ACTIVE", index=True)  # ACTIVE, USED, EXPIRED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    creator = relationship("User", back_populates="created_invitations")
