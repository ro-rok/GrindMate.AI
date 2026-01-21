from datetime import datetime
from typing import Optional
from .common import MongoModel, PyObjectId


class ChatMessage(MongoModel):
    user_id: PyObjectId
    question_id: PyObjectId
    role: str  # "user" | "assistant"
    content: str
    hint_level: Optional[int] = None
    tutor_mode: str = "socratic"
    tokens_used: int = 0
    cached: bool = False
    expires_at: Optional[datetime] = None
