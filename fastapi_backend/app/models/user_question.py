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


