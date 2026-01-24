from datetime import datetime
from typing import Optional, List
from .common import MongoModel, PyObjectId


class UserQuestion(MongoModel):
    user_id: PyObjectId
    question_id: PyObjectId
    solved: bool = False
    solved_at: Optional[datetime] = None
    legacy_id: Optional[int] = None
    attempts: int = 0
    time_spent_seconds: int = 0
    hints_unlocked: List[int] = []
    last_attempt_at: Optional[datetime] = None
    last_attempted_company: Optional[PyObjectId] = None  # NEW: Track company context
    timer_started_at: Optional[datetime] = None  # When timer was started
    timer_is_running: bool = False  # Whether timer is currently running


