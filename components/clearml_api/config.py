import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    APP_NAME: str = "ClearML API"
    API_VERSION: str = "v1"
    DEBUG: bool = False

    # CORS settings
    CORS_ORIGINS: list = ["*"]
    CORS_METHODS: list = ["*"]
    CORS_HEADERS: list = ["*"]

    class Config:
        case_sensitive = True
        env_file = ".env"


def get_settings() -> Settings:
    """Get application settings"""
    return Settings()


settings = get_settings()
