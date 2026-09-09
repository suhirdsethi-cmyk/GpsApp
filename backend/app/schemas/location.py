from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class LocationCreate(BaseModel):
    session_id: Optional[str] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    accuracy: float = Field(..., ge=0.0)
    speed: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    timestamp: Optional[datetime] = None

class LocationResponse(BaseModel):
    id: int
    session_id: str
    latitude: float
    longitude: float
    accuracy: float
    speed: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
