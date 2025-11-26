from datetime import datetime
from typing import Optional
from .common import MongoModel, PyObjectId


class UserQuestion(MongoModel):
    user_id: PyObjectId
    question_id: PyObjectId
    solved: bool = False
    solved_at: Optional[datetime] = None
    legacy_id: Optional[int] = None


