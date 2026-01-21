from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from .common import MongoModel, PyObjectId


class RefreshToken(MongoModel):
    """Refresh token stored in database for token rotation"""
    user_id: PyObjectId
    token_family_id: str  # UUID for rotation detection
    token_hash: str  # Hashed refresh token
    expires_at: datetime
    created_at: datetime = datetime.utcnow()
    revoked: bool = False
    revoked_at: Optional[datetime] = None


class RefreshTokenCreate(BaseModel):
    """Schema for creating a new refresh token"""
    user_id: str
    token_family_id: str
    token_hash: str
    expires_at: datetime
