import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.session import TrackingSession
from app.websocket.connection_manager import manager

logger = logging.getLogger(__name__)

def check_and_expire_sessions_sync(db: Session):
    """
    Check all active sessions and mark expired ones.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    # Filter active sessions whose end_time has passed
    expired_sessions = db.query(TrackingSession).filter(
        TrackingSession.status == "ACTIVE",
        TrackingSession.end_time <= now
    ).all()

    expired_ids = []
    for session in expired_sessions:
        session.status = "EXPIRED"
        expired_ids.append(session.id)

    if expired_sessions:
        db.commit()

    return expired_ids

async def expiration_worker_loop():
    """
    Async background task that runs continuously in FastAPI lifetime.
    """
    logger.info("Starting Tracking Session Expiration Worker...")
    while True:
        try:
            db = SessionLocal()
            try:
                expired_ids = check_and_expire_sessions_sync(db)
                for session_id in expired_ids:
                    logger.info(f"Tracking session {session_id} has EXPIRED automatically.")
                    await manager.broadcast_to_session(session_id, {
                        "type": "SESSION_EXPIRED",
                        "session_id": session_id,
                        "message": "Location sharing has ended."
                    })
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in tracking expiration worker: {e}")
        await asyncio.sleep(5)  # Check every 5 seconds
