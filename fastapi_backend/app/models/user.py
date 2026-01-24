from datetime import datetime, date
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from .common import MongoModel, PyObjectId


class UserInCreate(BaseModel):
    email: EmailStr
    password: str
    timezone: Optional[str] = "UTC"


class UserInLogin(BaseModel):
    email: EmailStr
    password: str


class UserPreferences(BaseModel):
    reduced_motion: bool = False
    theme: str = "dark"


class UserPublic(MongoModel):
    email: EmailStr
    role: str = "user"
    legacy_id: Optional[int] = None
    current_streak: int = 0
    longest_streak: int = 0
    last_solve_date: Optional[date] = None
    timezone: str = "UTC"
    rate_budget_tokens: int = 25000
    rate_budget_requests: int = 30
    rate_budget_reset_at: Optional[datetime] = None
    tutor_mode: str = "socratic"
    is_premium: bool = False
    preferences: UserPreferences = UserPreferences()


class UserInDB(MongoModel):
    email: EmailStr
    encrypted_password: str
    role: str = "user"
    legacy_id: Optional[int] = None
    current_streak: int = 0
    longest_streak: int = 0
    last_solve_date: Optional[date] = None
    timezone: str = "UTC"
    rate_budget_tokens: int = 25000
    rate_budget_requests: int = 30
    rate_budget_reset_at: Optional[datetime] = None
    byok_groq_key: Optional[str] = None
    tutor_mode: str = "socratic"
    is_premium: bool = False
    preferences: Dict[str, Any] = {"reduced_motion": False, "theme": "dark"}


