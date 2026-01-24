from datetime import datetime
from typing import Optional
from .common import MongoModel, PyObjectId


class TutorFeedback(MongoModel):
    """
    Model for storing user feedback on AI tutor sessions.
    
    Feedback is collected after each session to improve the tutor experience.
    """
    user_id: PyObjectId
    session_id: PyObjectId
    rating: str  # "positive" | "negative"
    feedback_text: Optional[str] = None
