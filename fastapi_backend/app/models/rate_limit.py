from datetime import datetime, date
from typing import Optional
from .common import MongoModel, PyObjectId


class RateLimit(MongoModel):
    user_id: PyObjectId
    date: date
    tokens_used: int = 0
    requests_made: int = 0
    expires_at: Optional[datetime] = None
