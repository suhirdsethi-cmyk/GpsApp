import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.models.user import User
from app.models.connection import Connection
from app.models.invitation import Invitation
from app.schemas.connection import InviteCreate, InviteRedeem, InviteResponse, ConnectionResponse
from app.auth.jwt import get_current_user

router = APIRouter(prefix="/connections", tags=["Connections & Invitations"])

def generate_short_code(length=6) -> str:
    chars = string.ascii_uppercase + string.digits
    # Remove ambiguous characters like O, 0, I, 1
    chars = chars.replace("O", "").replace("0", "").replace("I", "").replace("1", "")
    return ''.join(secrets.choice(chars) for _ in range(length))

def format_connection_response(conn: Connection) -> ConnectionResponse:
    return ConnectionResponse(
        id=conn.id,
        sharer_id=conn.sharer_id,
        sharer_name=conn.sharer.name if conn.sharer else "Unknown",
        sharer_email=conn.sharer.email if conn.sharer else "",
        viewer_id=conn.viewer_id,
        viewer_name=conn.viewer.name if conn.viewer else "Unknown",
        viewer_email=conn.viewer.email if conn.viewer else "",
        status=conn.status,
        created_at=conn.created_at
    )

@router.post("/invite", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
def create_invitation(
    data: InviteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Deactivate existing active invites for user
    existing = db.query(Invitation).filter(
        Invitation.creator_id == current_user.id,
        Invitation.status == "ACTIVE"
    ).all()
    for inv in existing:
        inv.status = "EXPIRED"

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expires_at = now + timedelta(minutes=data.expires_in_minutes or 30)
    code = generate_short_code()

    new_invite = Invitation(
        creator_id=current_user.id,
        code=code,
        expires_at=expires_at,
        status="ACTIVE"
    )
    db.add(new_invite)
    db.commit()
    db.refresh(new_invite)

    return InviteResponse(
        id=new_invite.id,
        code=new_invite.code,
        creator_id=new_invite.creator_id,
        creator_name=current_user.name,
        expires_at=new_invite.expires_at,
        status=new_invite.status,
        created_at=new_invite.created_at
    )

@router.post("/accept", response_model=ConnectionResponse)
def accept_invitation(
    data: InviteRedeem,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    code_upper = data.code.strip().upper()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    invitation = db.query(Invitation).filter(
        Invitation.code == code_upper,
        Invitation.status == "ACTIVE"
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation code.")

    if invitation.expires_at <= now:
        invitation.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="This invitation code has expired.")

    if invitation.creator_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot connect to yourself using your own code.")

    creator_id = invitation.creator_id

    # Check if connection already exists
    existing_conn = db.query(Connection).filter(
        or_(
            and_(Connection.sharer_id == creator_id, Connection.viewer_id == current_user.id),
            and_(Connection.sharer_id == current_user.id, Connection.viewer_id == creator_id)
        )
    ).first()

    if existing_conn:
        if existing_conn.status == "ACCEPTED":
            raise HTTPException(status_code=400, detail="You are already connected with this user.")
        elif existing_conn.status == "PENDING":
            raise HTTPException(status_code=400, detail="A connection request is already pending approval.")

    # Create connection request (Sharer is Creator, Viewer is Current User)
    new_conn = Connection(
        sharer_id=creator_id,
        viewer_id=current_user.id,
        status="PENDING"
    )
    invitation.status = "USED"
    db.add(new_conn)
    db.commit()
    db.refresh(new_conn)

    return format_connection_response(new_conn)

@router.post("/approve/{connection_id}", response_model=ConnectionResponse)
def approve_connection(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conn = db.query(Connection).filter(Connection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection request not found.")

    if conn.sharer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the location sharer can approve this connection request.")

    conn.status = "ACCEPTED"
    db.commit()
    db.refresh(conn)
    return format_connection_response(conn)

@router.post("/reject/{connection_id}", response_model=ConnectionResponse)
def reject_connection(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conn = db.query(Connection).filter(Connection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection request not found.")

    if conn.sharer_id != current_user.id and conn.viewer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this connection.")

    conn.status = "REJECTED"
    db.commit()
    db.refresh(conn)
    return format_connection_response(conn)

@router.get("", response_model=List[ConnectionResponse])
def list_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conns = db.query(Connection).filter(
        or_(
            Connection.sharer_id == current_user.id,
            Connection.viewer_id == current_user.id
        )
    ).order_by(Connection.created_at.desc()).all()

    return [format_connection_response(c) for c in conns]

@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connection(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conn = db.query(Connection).filter(Connection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found.")

    if conn.sharer_id != current_user.id and conn.viewer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this connection.")

    db.delete(conn)
    db.commit()
    return None
