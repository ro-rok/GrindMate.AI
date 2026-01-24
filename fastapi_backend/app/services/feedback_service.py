"""
Feedback Service for AI Tutor Session Feedback

Manages user feedback collection for tutor sessions to improve the AI experience.

Requirements: 8.1-8.5
"""

from datetime import datetime
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from ..db import get_database
from ..models.tutor_feedback import TutorFeedback


class FeedbackService:
    """Service for managing tutor session feedback"""
    
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db or get_database()
    
    async def submit_feedback(
        self,
        user_id: ObjectId,
        session_id: ObjectId,
        rating: str,
        feedback_text: Optional[str] = None
    ) -> ObjectId:
        """
        Store user feedback for a tutor session.
        
        Requirements: 8.3, 8.4
        
        Validates:
        - session_id exists
        - No duplicate feedback (prevents multiple submissions)
        
        Args:
            user_id: User ID
            session_id: Session ID to link feedback to
            rating: "positive" or "negative"
            feedback_text: Optional text feedback
            
        Returns:
            feedback_id: ObjectId of the created feedback
            
        Raises:
            ValueError: If session doesn't exist or duplicate feedback
        """
        # Validate session exists
        session = await self.db["tutor_sessions"].find_one({"_id": session_id})
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Verify session belongs to user
        if session["user_id"] != user_id:
            raise ValueError("Session does not belong to user")
        
        # Check for duplicate feedback
        existing_feedback = await self.db["tutor_feedback"].find_one({
            "session_id": session_id
        })
        
        if existing_feedback:
            raise ValueError(f"Feedback already exists for session {session_id}")
        
        # Validate rating
        if rating not in ["positive", "negative"]:
            raise ValueError(f"Invalid rating: {rating}. Must be 'positive' or 'negative'")
        
        # Create feedback document
        feedback = TutorFeedback(
            user_id=user_id,
            session_id=session_id,
            rating=rating,
            feedback_text=feedback_text
        )
        
        # Insert into database
        result = await self.db["tutor_feedback"].insert_one(
            feedback.model_dump(by_alias=True)
        )
        
        return result.inserted_id
    
    async def get_session_feedback(
        self,
        session_id: ObjectId
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve feedback for a specific session.
        
        Requirements: 8.3
        
        Args:
            session_id: Session ID
            
        Returns:
            Feedback data dict or None if no feedback exists
        """
        feedback = await self.db["tutor_feedback"].find_one({
            "session_id": session_id
        })
        
        if not feedback:
            return None
        
        # Convert ObjectIds to strings for JSON serialization
        feedback["_id"] = str(feedback["_id"])
        feedback["user_id"] = str(feedback["user_id"])
        feedback["session_id"] = str(feedback["session_id"])
        
        return feedback


# Singleton instance
_feedback_service: Optional[FeedbackService] = None


def get_feedback_service(db: Optional[AsyncIOMotorDatabase] = None) -> FeedbackService:
    """Get or create feedback service instance"""
    global _feedback_service
    if _feedback_service is None:
        _feedback_service = FeedbackService(db)
    return _feedback_service
