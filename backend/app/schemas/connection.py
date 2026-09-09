from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class InviteCreate(BaseModel):
    expires_in_minutes: Optional[int] = Field(default=30, ge=5, le=1440)

class InviteRedeem(BaseModel):
    code: str = Field(..., min_length=6, max_length=10)

class InviteResponse(BaseModel):
    id: int
    code: str
    creator_id: int
    creator_name: str
    expires_at: datetime
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConnectionResponse(BaseModel):
    id: int
    sharer_id: int
    sharer_name: str
    sharer_email: str
    viewer_id: int
    viewer_name: str
    viewer_email: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
