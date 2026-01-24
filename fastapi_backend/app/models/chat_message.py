from datetime import datetime
from typing import Optional
from .common import MongoModel, PyObjectId


class ChatMessage(MongoModel):
    user_id: PyObjectId
    question_id: PyObjectId
    session_id: Optional[PyObjectId] = None  # NEW: Link to tutor session
    role: str  # "user" | "assistant"
    content: str
    hint_level: Optional[int] = None
    tutor_mode: str = "socratic"
    tokens_used: int = 0
    cached: bool = False
    code_hash: Optional[str] = None  # NEW: Hash of user code (not full code)
    expires_at: Optional[datetime] = None
