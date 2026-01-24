from datetime import datetime
from typing import Optional
from .common import MongoModel, PyObjectId


class TutorRateLimit(MongoModel):
    """
    Model for tracking AI tutor request rate limits with rolling 24-hour window
    
    Each document represents a single request made by a user.
    The rolling window is calculated by counting documents within the last 24 hours.
    """
    user_id: PyObjectId
    timestamp: datetime
    expires_at: Optional[datetime] = None  # For TTL index (auto-delete after 48 hours)
