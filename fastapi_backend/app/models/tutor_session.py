from datetime import datetime
from typing import Optional, List
from .common import MongoModel, PyObjectId


class TutorSession(MongoModel):
    """
    Model for tracking AI tutor sessions.
    
    A session represents a complete interaction between a user and the AI tutor
    for a specific question. Sessions track hints used, time spent, and outcomes.
    """
    user_id: PyObjectId
    question_id: PyObjectId
    session_start_time: datetime
    session_end_time: Optional[datetime] = None
    tutor_mode: str  # "socratic" | "eli5" | "interview"
    hints_used: int = 0
    messages_count: int = 0
    solved: bool = False
    time_spent_seconds: int = 0
    final_state: str  # "not_started" | "attempting" | "stuck" | "solved" | "review"
    ai_summary: Optional[str] = None  # Max 500 characters
    weaknesses_detected: List[str] = []
    recurring_mistakes: List[str] = []
    recommended_topics: List[str] = []
    recommended_questions: List[PyObjectId] = []
