from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class SessionCreate(BaseModel):
    duration_type: str = Field(..., description="15m, 30m, 1h, 2h, 4h, 8h, 12h, 24h, custom_duration, custom_time, until_stop")
    custom_hours: Optional[int] = Field(default=0, ge=0)
    custom_minutes: Optional[int] = Field(default=0, ge=0)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class SessionResponse(BaseModel):
    id: str
    sharer_id: int
    sharer_name: str
    start_time: datetime
    end_time: datetime
    status: str
    created_at: datetime
    remaining_seconds: float

    model_config = ConfigDict(from_attributes=True)
