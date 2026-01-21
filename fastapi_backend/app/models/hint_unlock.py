from datetime import datetime
from .common import MongoModel, PyObjectId


class HintUnlock(MongoModel):
    user_id: PyObjectId
    question_id: PyObjectId
    hint_level: int
    unlocked_at: datetime
