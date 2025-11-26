import os
from functools import lru_cache
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # MongoDB
    mongodb_uri: str = os.getenv(
        "MONGODB_URI",
        "mongodb://127.0.0.1:27017/leetcode_tracker_development",
    )
    mongodb_db: str = os.getenv("MONGODB_DB_NAME", "grindmate-db")

    # Auth / security
    secret_key: str = os.getenv("SECRET_KEY", "change-me-in-production")
    access_token_cookie_name: str = "session"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # CORS
    backend_base_url: str = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")
    frontend_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://grindmate-ai.vercel.app"
    ]

    @field_validator("frontend_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            # Comma-separated list in env
            items = [i.strip() for i in v.split(",") if i.strip()]
            return items if items else [
                "http://localhost:5173",
                "http://localhost:3000",
                "https://grindmate-ai.vercel.app"
            ]
        if isinstance(v, list):
            return v
        return [
            "http://localhost:5173",
            "http://localhost:3000",
            "https://grindmate-ai.vercel.app"
        ]

    # External APIs
    groq_api_key: str | None = os.getenv("GROQ_API_KEY")
    groq_api_url: str = "https://api.groq.com/openai/v1/chat/completions"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8"
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()


