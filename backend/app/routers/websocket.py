import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import SessionLocal
from app.models.session import TrackingSession
from app.models.connection import Connection
from app.models.location import LocationUpdate
from app.auth.jwt import get_user_from_token
from app.websocket.connection_manager import manager

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/tracking/{session_id}")
async def websocket_tracking_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = None
):
    db: Session = SessionLocal()
    try:
        if not token:
            await websocket.close(code=4001, reason="Authentication token missing.")
            return

        user = get_user_from_token(token, db)
        if not user:
            await websocket.close(code=4002, reason="Invalid or expired authentication token.")
            return

        session = db.query(TrackingSession).filter(TrackingSession.id == session_id).first()
        if not session:
            await websocket.close(code=4004, reason="Tracking session not found.")
            return

        # Check authorization (Must be sharer OR have accepted connection)
        if session.sharer_id != user.id:
            connection = db.query(Connection).filter(
                Connection.status == "ACCEPTED",
                or_(
                    and_(Connection.sharer_id == session.sharer_id, Connection.viewer_id == user.id),
                    and_(Connection.sharer_id == user.id, Connection.viewer_id == session.sharer_id)
                )
            ).first()
            if not connection:
                await websocket.close(code=4003, reason="Unauthorized to view this tracking session.")
                return

        # Accept connection
        await manager.connect(session_id, websocket)

        # Send initial status message
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        remaining = (session.end_time - now).total_seconds() if session.status == "ACTIVE" else 0
        if remaining < 0:
            remaining = 0

        await websocket.send_json({
            "type": "SESSION_INIT",
            "session": {
                "id": session.id,
                "sharer_id": session.sharer_id,
                "sharer_name": session.sharer.name if session.sharer else "Unknown",
                "status": session.status,
                "remaining_seconds": remaining
            }
        })

        try:
            while True:
                data = await websocket.receive_text()
                try:
                    payload = json.loads(data)
                    # If sharer sends location update over WS
                    if payload.get("type") == "LOCATION_UPDATE" and session.sharer_id == user.id:
                        if session.status == "ACTIVE" and session.end_time > datetime.now(timezone.utc).replace(tzinfo=None):
                            new_loc = LocationUpdate(
                                session_id=session_id,
                                latitude=float(payload["latitude"]),
                                longitude=float(payload["longitude"]),
                                accuracy=float(payload.get("accuracy", 10.0)),
                                speed=float(payload.get("speed", 0.0)),
                                heading=float(payload.get("heading", 0.0)),
                                timestamp=datetime.now(timezone.utc).replace(tzinfo=None)
                            )
                            db.add(new_loc)
                            db.commit()

                            # Broadcast to all connected clients
                            await manager.broadcast_to_session(session_id, {
                                "type": "LOCATION_UPDATE",
                                "session_id": session_id,
                                "location": {
                                    "id": new_loc.id,
                                    "latitude": new_loc.latitude,
                                    "longitude": new_loc.longitude,
                                    "accuracy": new_loc.accuracy,
                                    "speed": new_loc.speed,
                                    "heading": new_loc.heading,
                                    "timestamp": new_loc.timestamp.isoformat() + "Z",
                                    "sharer_name": user.name
                                }
                            })
                except Exception as parse_err:
                    pass

        except WebSocketDisconnect:
            manager.disconnect(session_id, websocket)

    finally:
        db.close()
