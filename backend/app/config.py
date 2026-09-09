import os
from pydantic import ConfigDict
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./gpsapp.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_jwt_key_change_me_in_production_123456789")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
    DEFAULT_GPS_UPDATE_INTERVAL: int = int(os.getenv("DEFAULT_GPS_UPDATE_INTERVAL", "10"))

    model_config = ConfigDict(env_file=".env", extra="ignore")

settings = Settings()
