"""
Session Service for Focus Mode State Management

Manages user session states, tracking progress through:
- Not Started → Attempting → Stuck → Solved → Review

Requirements: 3.1-3.8, 7.1-7.4
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from ..db import get_database
from ..models.tutor_session import TutorSession
from ..models.session_state import SessionState


class SessionService:
    """Service for managing Focus Mode session states"""
    
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db if db is not None else get_database()
    
    async def initialize_session(
        self,
        user_id: ObjectId,
        question_id: ObjectId
    ) -> ObjectId:
        """
        Initialize a new session with state "not_started".
        If a session already exists, returns the existing session_id.
        
        Requirements: 3.1
        
        Args:
            user_id: User ID
            question_id: Question ID
            
        Returns:
            session_id: ObjectId of the created or existing session
        """
        # Check if session state already exists
        existing_state = await self.db["session_states"].find_one({
            "user_id": user_id,
            "question_id": question_id
        })
        
        if existing_state:
            # Return existing session_id
            return existing_state["session_id"]
        
        # Create new tutor session
        session = TutorSession(
            user_id=user_id,
            question_id=question_id,
            session_start_time=datetime.utcnow(),
            session_end_time=None,
            tutor_mode="socratic",  # Default mode
            hints_used=0,
            messages_count=0,
            solved=False,
            time_spent_seconds=0,
            final_state="not_started"
        )
        
        result = await self.db["tutor_sessions"].insert_one(
            session.model_dump(by_alias=True)
        )
        
        session_id = result.inserted_id
        
        # Create corresponding session state
        state = SessionState(
            user_id=user_id,
            question_id=question_id,
            session_id=session_id,
            state="not_started",
            elapsed_time_seconds=0,
            hints_used=0,
            attempts_count=0
        )
        
        try:
            await self.db["session_states"].insert_one(
                state.model_dump(by_alias=True)
            )
        except Exception as e:
            # If duplicate key error (race condition), find existing session
            if "duplicate key" in str(e).lower() or "E11000" in str(e):
                existing_state = await self.db["session_states"].find_one({
                    "user_id": user_id,
                    "question_id": question_id
                })
                if existing_state:
                    return existing_state["session_id"]
            # Re-raise if it's a different error
            raise
        
        return session_id
    
    async def update_session_state(
        self,
        session_id: ObjectId,
        new_state: Optional[str] = None,
        time_spent: Optional[int] = None,
        hints_used: Optional[int] = None,
        stuck_click: bool = False,
        elapsed_minutes: Optional[int] = None
    ) -> None:
        """
        Update session state and metrics.
        
        Requirements: 3.2-3.8
        
        State transition rules:
        - New sessions start in "not_started"
        - User interaction transitions to "attempting"
        - 2+ hints OR stuck_click OR 20+ minutes → "stuck"
        - Single hint in "attempting" increments counter but maintains state
        - Mark solved → "solved"
        - Reopen solved question → "review"
        
        Args:
            session_id: Session ID
            new_state: Explicit new state (optional)
            time_spent: Time spent in seconds (optional)
            hints_used: Number of hints used (optional)
            stuck_click: Whether user clicked "I'm stuck" button
            elapsed_minutes: Minutes elapsed since session start
        """
        # Get current session
        session = await self.db["tutor_sessions"].find_one({"_id": session_id})
        if not session:
            raise ValueError("Session not found")
        
        current_state = session.get("final_state", "not_started")
        current_hints = session.get("hints_used", 0)
        
        # Determine new state based on transition rules
        if new_state:
            # Explicit state provided
            target_state = new_state
        else:
            # Apply automatic transition rules
            target_state = current_state
            
            # Rule: User interaction transitions "not_started" to "attempting"
            if current_state == "not_started" and (time_spent or hints_used is not None):
                target_state = "attempting"
            
            # Rule: 2+ hints OR stuck_click OR 20+ minutes → "stuck"
            if current_state == "attempting":
                total_hints = hints_used if hints_used is not None else current_hints
                
                if total_hints >= 2:
                    target_state = "stuck"
                elif stuck_click:
                    target_state = "stuck"
                elif elapsed_minutes and elapsed_minutes >= 20:
                    target_state = "stuck"
        
        # Validate state transition
        valid_transitions = {
            "not_started": ["attempting", "solved"],
            "attempting": ["stuck", "solved", "attempting"],
            "stuck": ["solved", "stuck"],
            "solved": ["review", "solved"],
            "review": ["review", "solved"]
        }
        
        if target_state != current_state:
            if target_state not in valid_transitions.get(current_state, []):
                raise ValueError(
                    f"Invalid state transition: {current_state} → {target_state}"
                )
        
        # Build update document
        update_doc = {
            "final_state": target_state,
            "updated_at": datetime.utcnow()
        }
        
        if time_spent is not None:
            update_doc["time_spent_seconds"] = time_spent
        
        if hints_used is not None:
            update_doc["hints_used"] = hints_used
        
        # Update tutor session
        await self.db["tutor_sessions"].update_one(
            {"_id": session_id},
            {"$set": update_doc}
        )
        
        # Update session state
        state_update = {
            "state": target_state,
            "updated_at": datetime.utcnow()
        }
        
        if time_spent is not None:
            state_update["elapsed_time_seconds"] = time_spent
        
        if hints_used is not None:
            state_update["hints_used"] = hints_used
        
        await self.db["session_states"].update_one(
            {"session_id": session_id},
            {"$set": state_update}
        )
    
    async def get_session(
        self,
        user_id: ObjectId,
        question_id: ObjectId
    ) -> Optional[Dict[str, Any]]:
        """
        Query active session for user + question.
        
        Requirements: 3.6
        
        Args:
            user_id: User ID
            question_id: Question ID
            
        Returns:
            Session data dict or None if no active session
        """
        # Find active session (no end time)
        session = await self.db["tutor_sessions"].find_one({
            "user_id": user_id,
            "question_id": question_id,
            "session_end_time": None
        })
        
        if not session:
            return None
        
        # Convert ObjectId to string for JSON serialization
        session["_id"] = str(session["_id"])
        session["user_id"] = str(session["user_id"])
        session["question_id"] = str(session["question_id"])
        
        # Convert recommended_questions ObjectIds to strings
        if session.get("recommended_questions"):
            session["recommended_questions"] = [
                str(qid) for qid in session["recommended_questions"]
            ]
        
        return session
    
    async def end_session(
        self,
        session_id: ObjectId,
        final_state: str,
        total_time: int
    ) -> None:
        """
        Mark session as ended and persist final metrics.
        
        Requirements: 7.1, 7.4
        
        Generates AI summary of weaknesses and recommendations.
        
        Args:
            session_id: Session ID
            final_state: Final state (solved, stuck, etc.)
            total_time: Total time spent in seconds
        """
        # Get session data
        session = await self.db["tutor_sessions"].find_one({"_id": session_id})
        if not session:
            raise ValueError("Session not found")
        
        # Generate AI summary and recommendations
        summary_data = await self._generate_session_summary(session)
        
        # Update session with final data
        await self.db["tutor_sessions"].update_one(
            {"_id": session_id},
            {
                "$set": {
                    "session_end_time": datetime.utcnow(),
                    "final_state": final_state,
                    "time_spent_seconds": total_time,
                    "ai_summary": summary_data["summary"],
                    "weaknesses_detected": summary_data["weaknesses"],
                    "recurring_mistakes": summary_data["mistakes"],
                    "recommended_topics": summary_data["topics"],
                    "recommended_questions": summary_data["questions"],
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Update session state
        await self.db["session_states"].update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "state": final_state,
                    "elapsed_time_seconds": total_time,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    async def get_user_sessions(
        self,
        user_id: ObjectId,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Query recent sessions for user (last 20).
        
        Requirements: 7.2, 7.3
        
        Includes:
        - Question details (title, difficulty)
        - AI summaries and recommendations
        - Sorted by created_at descending
        
        Args:
            user_id: User ID
            limit: Maximum number of sessions to return
            
        Returns:
            List of session dicts with question details
        """
        # Get recent sessions
        cursor = self.db["tutor_sessions"].find({
            "user_id": user_id
        }).sort("created_at", -1).limit(limit)
        
        sessions = await cursor.to_list(length=limit)
        
        # Enrich with question details
        enriched_sessions = []
        for session in sessions:
            # Get question details
            question = await self.db["questions"].find_one({
                "_id": session["question_id"]
            })
            
            # Build enriched session object
            enriched = {
                "session_id": str(session["_id"]),
                "question_id": str(session["question_id"]),
                "question_title": question.get("title", "Unknown") if question else "Unknown",
                "question_difficulty": question.get("difficulty", "MEDIUM") if question else "MEDIUM",
                "date": session["session_start_time"].isoformat(),
                "tutor_mode": session.get("tutor_mode", "socratic"),
                "hints_used": session.get("hints_used", 0),
                "solved": session.get("solved", False),
                "time_spent_seconds": session.get("time_spent_seconds", 0),
                "ai_summary": session.get("ai_summary"),
                "weaknesses_detected": session.get("weaknesses_detected", []),
                "recurring_mistakes": session.get("recurring_mistakes", []),
                "recommended_topics": session.get("recommended_topics", []),
                "recommended_questions": []
            }
            
            # Get recommended question details
            if session.get("recommended_questions"):
                rec_cursor = self.db["questions"].find({
                    "_id": {"$in": session["recommended_questions"]}
                }).limit(5)
                
                rec_questions = await rec_cursor.to_list(length=5)
                enriched["recommended_questions"] = [
                    {
                        "id": str(q["_id"]),
                        "title": q.get("title", "Unknown"),
                        "difficulty": q.get("difficulty", "MEDIUM"),
                        "link": q.get("link", "")
                    }
                    for q in rec_questions
                ]
            
            enriched_sessions.append(enriched)
        
        return enriched_sessions
    
    async def _generate_session_summary(
        self,
        session: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate AI summary of session with weaknesses and recommendations.
        
        This is a simplified implementation. In production, this would call
        an AI service to analyze the session and generate insights.
        
        Returns:
            {
                "summary": str (max 500 chars),
                "weaknesses": List[str],
                "mistakes": List[str],
                "topics": List[str] (3 topics),
                "questions": List[ObjectId] (5 questions)
            }
        """
        # Get question details
        question = await self.db["questions"].find_one({
            "_id": session["question_id"]
        })
        
        # Simple heuristic-based summary
        hints_used = session.get("hints_used", 0)
        time_spent = session.get("time_spent_seconds", 0)
        final_state = session.get("final_state", "not_started")
        
        # Generate summary
        if final_state == "solved":
            if hints_used == 0:
                summary = "Solved independently without hints. Strong understanding demonstrated."
            elif hints_used <= 2:
                summary = f"Solved with {hints_used} hint(s). Good problem-solving approach."
            else:
                summary = f"Solved with {hints_used} hints. Consider reviewing core concepts."
        elif final_state == "stuck":
            summary = f"Got stuck after {hints_used} hints and {time_spent // 60} minutes. Review recommended."
        else:
            summary = "Session incomplete. Consider returning to complete the problem."
        
        # Detect weaknesses based on question topics and hints used
        weaknesses = []
        if question and hints_used >= 2:
            topics = question.get("topics", "")
            if isinstance(topics, str):
                topic_list = [t.strip() for t in topics.split(",") if t.strip()]
                weaknesses = topic_list[:2]  # Take first 2 topics as weaknesses
        
        # Detect recurring mistakes (simplified)
        mistakes = []
        if hints_used >= 3:
            mistakes.append("Difficulty identifying optimal approach")
        if time_spent > 1200:  # > 20 minutes
            mistakes.append("Time management")
        
        # Recommend topics (same as weaknesses for now)
        recommended_topics = weaknesses[:3] if weaknesses else []
        
        # Recommend similar questions
        recommended_questions = []
        if question:
            # Find questions with similar topics
            topics = question.get("topics", "")
            if topics:
                cursor = self.db["questions"].find({
                    "topics": {"$regex": topics.split(",")[0] if "," in topics else topics, "$options": "i"},
                    "_id": {"$ne": question["_id"]}
                }).limit(5)
                
                similar_questions = await cursor.to_list(length=5)
                recommended_questions = [q["_id"] for q in similar_questions]
        
        return {
            "summary": summary[:500],  # Truncate to 500 chars
            "weaknesses": weaknesses,
            "mistakes": mistakes,
            "topics": recommended_topics,
            "questions": recommended_questions
        }


# Singleton instance
_session_service: Optional[SessionService] = None


def get_session_service(db: Optional[AsyncIOMotorDatabase] = None) -> SessionService:
    """Get or create session service instance"""
    global _session_service
    if _session_service is None:
        _session_service = SessionService(db)
    return _session_service
