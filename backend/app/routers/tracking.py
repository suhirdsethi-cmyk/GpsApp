from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.models.user import User
from app.models.session import TrackingSession
from app.models.connection import Connection
from app.schemas.session import SessionCreate, SessionResponse
from app.auth.jwt import get_current_user
from app.websocket.connection_manager import manager

router = APIRouter(prefix="/tracking", tags=["Tracking Sessions"])

def calculate_session_times(data: SessionCreate):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    start_time = now

    if data.duration_type == "15m":
        end_time = start_time + timedelta(minutes=15)
    elif data.duration_type == "30m":
        end_time = start_time + timedelta(minutes=30)
    elif data.duration_type == "1h":
        end_time = start_time + timedelta(hours=1)
    elif data.duration_type == "2h":
        end_time = start_time + timedelta(hours=2)
    elif data.duration_type == "4h":
        end_time = start_time + timedelta(hours=4)
    elif data.duration_type == "8h":
        end_time = start_time + timedelta(hours=8)
    elif data.duration_type == "12h":
        end_time = start_time + timedelta(hours=12)
    elif data.duration_type == "24h":
        end_time = start_time + timedelta(hours=24)
    elif data.duration_type == "custom_duration":
        hrs = data.custom_hours or 0
        mins = data.custom_minutes or 0
        if hrs == 0 and mins == 0:
            raise HTTPException(status_code=400, detail="Custom duration must be greater than 0 minutes.")
        end_time = start_time + timedelta(hours=hrs, minutes=mins)
    elif data.duration_type == "custom_time":
        if not data.start_time or not data.end_time:
            raise HTTPException(status_code=400, detail="Custom start and end time pickers are required.")
        st = data.start_time.replace(tzinfo=None) if data.start_time.tzinfo else data.start_time
        et = data.end_time.replace(tzinfo=None) if data.end_time.tzinfo else data.end_time
        if et <= st:
            raise HTTPException(status_code=400, detail="End time must be after start time.")
        start_time = st
        end_time = et
    elif data.duration_type == "until_stop":
        # Default to 7 days max for indef until manual stop
        end_time = start_time + timedelta(days=7)
    else:
        raise HTTPException(status_code=400, detail=f"Invalid duration type: {data.duration_type}")

    return start_time, end_time

def format_session_response(session: TrackingSession) -> SessionResponse:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    remaining = (session.end_time - now).total_seconds() if session.status == "ACTIVE" else 0
    if remaining < 0:
        remaining = 0

    return SessionResponse(
        id=session.id,
        sharer_id=session.sharer_id,
        sharer_name=session.sharer.name if session.sharer else "Unknown",
        start_time=session.start_time,
        end_time=session.end_time,
        status=session.status,
        created_at=session.created_at,
        remaining_seconds=remaining
    )

@router.post("/start", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def start_tracking_session(
    data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Calculate start and end times
    start_time, end_time = calculate_session_times(data)

    # Deactivate any active session for this user first
    active_sessions = db.query(TrackingSession).filter(
        TrackingSession.sharer_id == current_user.id,
        TrackingSession.status == "ACTIVE"
    ).all()
    for active_sess in active_sessions:
        active_sess.status = "STOPPED"
        await manager.broadcast_to_session(active_sess.id, {
            "type": "SESSION_STOPPED",
            "session_id": active_sess.id,
            "message": "Location sharing stopped."
        })

    # Create new session
    new_session = TrackingSession(
        sharer_id=current_user.id,
        start_time=start_time,
        end_time=end_time,
        status="ACTIVE"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return format_session_response(new_session)

@router.post("/stop", response_model=SessionResponse)
async def stop_tracking_session(
    session_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(TrackingSession).filter(TrackingSession.sharer_id == current_user.id, TrackingSession.status == "ACTIVE")
    if session_id:
        query = query.filter(TrackingSession.id == session_id)
    
    session = query.first()
    if not session:
        raise HTTPException(status_code=404, detail="No active tracking session found for current user.")

    session.status = "STOPPED"
    db.commit()
    db.refresh(session)

    # Broadcast STOP message to all connected WS viewers
    await manager.broadcast_to_session(session.id, {
        "type": "SESSION_STOPPED",
        "session_id": session.id,
        "message": "Location sharing stopped by user."
    })

    return format_session_response(session)

@router.get("/sharer/active", response_model=Optional[SessionResponse])
def get_my_active_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    session = db.query(TrackingSession).filter(
        TrackingSession.sharer_id == current_user.id,
        TrackingSession.status == "ACTIVE",
        TrackingSession.end_time > now
    ).first()

    if not session:
        return None
    return format_session_response(session)

@router.get("/active", response_model=List[SessionResponse])
def get_active_sessions_for_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. User's own active session
    my_active = db.query(TrackingSession).filter(
        TrackingSession.sharer_id == current_user.id,
        TrackingSession.status == "ACTIVE",
        TrackingSession.end_time > now
    ).all()

    # 2. Sessions shared with user by accepted connections
    accepted_connections = db.query(Connection).filter(
        Connection.status == "ACCEPTED",
        or_(
            Connection.viewer_id == current_user.id,
            Connection.sharer_id == current_user.id
        )
    ).all()

    friend_ids = set()
    for conn in accepted_connections:
        friend_ids.add(conn.sharer_id if conn.viewer_id == current_user.id else conn.viewer_id)

    friend_active = []
    if friend_ids:
        friend_active = db.query(TrackingSession).filter(
            TrackingSession.sharer_id.in_(friend_ids),
            TrackingSession.status == "ACTIVE",
            TrackingSession.end_time > now
        ).all()

    all_active = my_active + friend_active
    return [format_session_response(s) for s in all_active]

@router.get("/session/{session_id}", response_model=SessionResponse)
def get_session_by_id(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(TrackingSession).filter(TrackingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Tracking session not found.")

    # Authorization check
    if session.sharer_id != current_user.id:
        # Check connection permission
        connection = db.query(Connection).filter(
            Connection.status == "ACCEPTED",
            or_(
                and_(Connection.sharer_id == session.sharer_id, Connection.viewer_id == current_user.id),
                and_(Connection.sharer_id == current_user.id, Connection.viewer_id == session.sharer_id)
            )
        ).first()
        if not connection:
            raise HTTPException(status_code=403, detail="You do not have permission to view this tracking session.")

    return format_session_response(session)

@router.get("/history", response_model=List[SessionResponse])
def get_tracking_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Sessions where current user was sharer or viewer
    accepted_connections = db.query(Connection).filter(
        Connection.status == "ACCEPTED",
        or_(Connection.viewer_id == current_user.id, Connection.sharer_id == current_user.id)
    ).all()

    allowed_sharer_ids = {current_user.id}
    for conn in accepted_connections:
        allowed_sharer_ids.add(conn.sharer_id if conn.viewer_id == current_user.id else conn.viewer_id)

    sessions = db.query(TrackingSession).filter(
        TrackingSession.sharer_id.in_(allowed_sharer_ids)
    ).order_by(TrackingSession.created_at.desc()).all()

    return [format_session_response(s) for s in sessions]

@router.delete("/history/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tracking_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(TrackingSession).filter(
        TrackingSession.id == session_id,
        TrackingSession.sharer_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or not owned by you.")

    db.delete(session)
    db.commit()
    return None
