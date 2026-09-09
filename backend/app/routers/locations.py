from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.models.user import User
from app.models.session import TrackingSession
from app.models.location import LocationUpdate
from app.models.connection import Connection
from app.schemas.location import LocationCreate, LocationResponse
from app.auth.jwt import get_current_user
from app.websocket.connection_manager import manager

router = APIRouter(prefix="/locations", tags=["Locations"])

@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def submit_location_update(
    location_data: LocationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not location_data.session_id:
        # Try to find active session for user
        active_session = db.query(TrackingSession).filter(
            TrackingSession.sharer_id == current_user.id,
            TrackingSession.status == "ACTIVE"
        ).first()
        if not active_session:
            raise HTTPException(status_code=400, detail="No active tracking session specified or active.")
        session_id = active_session.id
    else:
        session_id = location_data.session_id

    # Verify session ownership & status
    session = db.query(TrackingSession).filter(TrackingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Tracking session not found.")

    if session.sharer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only submit location updates for your own tracking sessions.")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if session.status != "ACTIVE" or session.end_time <= now:
        if session.status == "ACTIVE":
            session.status = "EXPIRED"
            db.commit()
            await manager.broadcast_to_session(session_id, {
                "type": "SESSION_EXPIRED",
                "session_id": session_id,
                "message": "Location sharing has ended."
            })
        raise HTTPException(status_code=400, detail="Tracking session is expired or inactive. Location updates rejected.")

    # Create location record
    loc_timestamp = location_data.timestamp or datetime.now(timezone.utc)
    if loc_timestamp.tzinfo:
        loc_timestamp = loc_timestamp.replace(tzinfo=None)

    new_location = LocationUpdate(
        session_id=session_id,
        latitude=location_data.latitude,
        longitude=location_data.longitude,
        accuracy=location_data.accuracy,
        speed=location_data.speed or 0.0,
        heading=location_data.heading or 0.0,
        timestamp=loc_timestamp
    )
    db.add(new_location)
    db.commit()
    db.refresh(new_location)

    # Prepare response & WebSocket broadcast payload
    response_data = LocationResponse.model_validate(new_location)
    ws_payload = {
        "type": "LOCATION_UPDATE",
        "session_id": session_id,
        "location": {
            "id": new_location.id,
            "latitude": new_location.latitude,
            "longitude": new_location.longitude,
            "accuracy": new_location.accuracy,
            "speed": new_location.speed,
            "heading": new_location.heading,
            "timestamp": new_location.timestamp.isoformat() + "Z",
            "sharer_name": current_user.name
        }
    }
    await manager.broadcast_to_session(session_id, ws_payload)

    return response_data

@router.get("/latest/{session_id}", response_model=Optional[LocationResponse])
def get_latest_location(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(TrackingSession).filter(TrackingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Tracking session not found.")

    # Authorization
    if session.sharer_id != current_user.id:
        connection = db.query(Connection).filter(
            Connection.status == "ACCEPTED",
            or_(
                and_(Connection.sharer_id == session.sharer_id, Connection.viewer_id == current_user.id),
                and_(Connection.sharer_id == current_user.id, Connection.viewer_id == session.sharer_id)
            )
        ).first()
        if not connection:
            raise HTTPException(status_code=403, detail="Not authorized to view location for this session.")

    latest = db.query(LocationUpdate).filter(
        LocationUpdate.session_id == session_id
    ).order_by(LocationUpdate.timestamp.desc()).first()

    if not latest:
        return None

    return LocationResponse.model_validate(latest)

@router.get("/history/{session_id}", response_model=List[LocationResponse])
def get_location_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(TrackingSession).filter(TrackingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Tracking session not found.")

    if session.sharer_id != current_user.id:
        connection = db.query(Connection).filter(
            Connection.status == "ACCEPTED",
            or_(
                and_(Connection.sharer_id == session.sharer_id, Connection.viewer_id == current_user.id),
                and_(Connection.sharer_id == current_user.id, Connection.viewer_id == session.sharer_id)
            )
        ).first()
        if not connection:
            raise HTTPException(status_code=403, detail="Not authorized to view location history for this session.")

    history = db.query(LocationUpdate).filter(
        LocationUpdate.session_id == session_id
    ).order_by(LocationUpdate.timestamp.asc()).all()

    return [LocationResponse.model_validate(loc) for loc in history]
