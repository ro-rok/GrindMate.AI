from datetime import datetime
from typing import Optional
from .common import MongoModel, PyObjectId


class SessionState(MongoModel):
    """
    Model for tracking user progress state within a Focus Mode session.
    
    Tracks the current state of a user's attempt at a question, including
    elapsed time, hints used, and code snapshots.
    """
    user_id: PyObjectId
    question_id: PyObjectId
    session_id: PyObjectId
    state: str  # "not_started" | "attempting" | "stuck" | "solved" | "review"
    elapsed_time_seconds: int = 0
    hints_used: int = 0
    attempts_count: int = 0
    last_code_snapshot: Optional[str] = None
    last_language: Optional[str] = None
