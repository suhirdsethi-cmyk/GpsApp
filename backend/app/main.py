import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
import app.models  # Guarantees all SQLAlchemy models are registered for auto-creation
from app.routers import auth, tracking, locations, connections, websocket
from app.services.expiration_service import expiration_worker_loop

# Create Database tables automatically on startup
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start session expiration worker loop in background
    expiration_task = asyncio.create_task(expiration_worker_loop())
    yield
    # Shutdown: cancel task
    expiration_task.cancel()

app = FastAPI(
    title="GPS Phone Location Tracking API",
    description="API for explicit consensual real-time location sharing, connection invitations, and live map tracking.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if "*" not in origins:
    origins.extend(["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow cross-origin requests for web/mobile clients
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(tracking.router)
app.include_router(locations.router)
app.include_router(connections.router)
app.include_router(websocket.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "app": "GPS Phone Location Tracking API",
        "version": "1.0.0",
        "documentation": "/docs"
    }
