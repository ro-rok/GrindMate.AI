import os
from functools import lru_cache
from pydantic import AnyHttpUrl, field_validator, ConfigDict
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"  # Ignore extra fields from .env file
    )
    
    # MongoDB
    mongodb_uri: str = os.getenv(
        "MONGODB_URI",
        "mongodb://127.0.0.1:27017/leetcode_tracker_development",
    )
    mongodb_db: str = os.getenv("MONGODB_DB_NAME", "grindmate-db")

    # Auth / security
    secret_key: str = os.getenv("SECRET_KEY", "change-me-in-production")
    access_token_cookie_name: str = "session"
    refresh_token_cookie_name: str = "refresh_token"
    csrf_token_cookie_name: str = "csrf_token"
    access_token_expire_minutes: int = 15  # 15 minutes (short-lived)
    refresh_token_expire_days: int = 7  # 7 days sliding window

    # CORS
    backend_base_url: str = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")
    frontend_origins: str = os.getenv(
        "FRONTEND_ORIGINS",
        (
            "http://localhost:5173,"
            "http://localhost:3000,"
            "https://grindmate-ai.vercel.app,"
            "https://ro-port.vercel.app"
        ),
    )

    @property
    def frontend_origins_list(self) -> List[str]:
        """Parse comma-separated frontend origins string into a list"""
        if isinstance(self.frontend_origins, str):
            items = [i.strip() for i in self.frontend_origins.split(",") if i.strip()]
            return items if items else [
                "http://localhost:5173",
                "http://localhost:3000",
                "https://grindmate-ai.vercel.app",
                "https://ro-port.vercel.app",
            ]
        return [
            "http://localhost:5173",
            "http://localhost:3000",
            "https://grindmate-ai.vercel.app",
            "https://ro-port.vercel.app",
        ]

    # External APIs
    groq_api_key: str | None = os.getenv("GROQ_API_KEY")
    groq_api_key_2: str | None = os.getenv("GROQ_API_KEY_2")
    groq_api_url: str = "https://api.groq.com/openai/v1/chat/completions"
    
    def get_available_groq_keys(self) -> List[str]:
        """Get list of available Groq API keys (filters out None values)"""
        keys = []
        if self.groq_api_key:
            keys.append(self.groq_api_key)
        if self.groq_api_key_2:
            keys.append(self.groq_api_key_2)
        return keys


@lru_cache
def get_settings() -> Settings:
    return Settings()


