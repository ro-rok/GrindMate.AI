"""
AI Tutor Router V2 - Focus Mode Enhancement

Provides endpoints for enhanced AI tutor with automatic question context injection,
session tracking, feedback collection, and smart random selection.

Requirements: 4.1-4.5, 6.5, 7.2-7.4, 8.3-8.4, 9.1-9.11, 13.1-13.8
"""

from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from bson import ObjectId

from ..auth import CurrentUser
from ..db import get_database
from ..services.tutor_service import get_tutor_service, TutorService
from ..services.session_service import get_session_service, SessionService
from ..services.feedback_service import get_feedback_service, FeedbackService
from ..services.smart_random import get_smart_random_service, SmartRandomService


router = APIRouter(prefix="/tutor", tags=["tutor-v2"])


# Request/Response Models for POST /api/tutor/chat
class TutorChatRequest(BaseModel):
    question_id: str = Field(..., description="Question ID")
    message: str = Field(..., description="User's message to the AI tutor")
    tutor_mode: str = Field(..., description="Tutoring mode: socratic, eli5, or interview")
    user_code: Optional[str] = Field(default=None, description="Optional user code")
    language: Optional[str] = Field(default=None, description="Programming language")


class TutorChatResponse(BaseModel):
    response_text: str
    hints_used_count: int
    session_id: str
    tokens_remaining: int
    requests_remaining: int


class TutorChatErrorResponse(BaseModel):
    error_message: str
    invalid_fields: Optional[List[str]] = None
    reset_time_unix: Optional[int] = None
    requests_remaining: Optional[int] = None


# Request/Response Models for POST /api/tutor/feedback
class TutorFeedbackRequest(BaseModel):
    session_id: str = Field(..., description="Session ID")
    rating: str = Field(..., description="Rating: positive or negative")
    feedback_text: Optional[str] = Field(default=None, description="Optional feedback text")


class TutorFeedbackResponse(BaseModel):
    feedback_id: str
    message: str


# Request/Response Models for POST /api/tutor/reset
class TutorResetRequest(BaseModel):
    question_id: str = Field(..., description="Question ID to reset conversation for")


class TutorResetResponse(BaseModel):
    message: str


# Response Models for GET /api/tutor/sessions
class RecommendedQuestion(BaseModel):
    id: str
    title: str
    difficulty: str
    link: str


class TutorSessionItem(BaseModel):
    session_id: str
    question_id: str
    question_title: str
    question_difficulty: str
    date: str
    tutor_mode: str
    hints_used: int
    solved: bool
    time_spent_seconds: int
    ai_summary: Optional[str] = None
    weaknesses_detected: List[str] = []
    recurring_mistakes: List[str] = []
    recommended_topics: List[str] = []
    recommended_questions: List[RecommendedQuestion] = []


class TutorSessionsResponse(BaseModel):
    sessions: List[TutorSessionItem]


# Response Models for GET /api/questions/random/smart
class SmartRandomResponse(BaseModel):
    question_id: str
    title: str
    difficulty: str
    company_tags: List[str] = []
    topic_tags: List[str] = []
    selection_reason: str
    priority_score: float
    link: str
    frequency: Optional[int] = None


@router.post(
    "/chat",
    response_model=TutorChatResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": TutorChatErrorResponse, "description": "Invalid input"},
        403: {"model": TutorChatErrorResponse, "description": "Authorization failure"},
        429: {"model": TutorChatErrorResponse, "description": "Rate limit exceeded"}
    }
)
async def chat_with_tutor(
    request: TutorChatRequest,
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Send a chat message to the AI tutor with automatic question context injection.
    
    Requirements: 4.1-4.5, 13.1-13.5
    
    Validates:
    - Required fields (question_id, message, tutor_mode)
    - Tutor mode is valid (socratic, eli5, interview)
    
    Returns:
    - HTTP 200: Successful response with AI message
    - HTTP 400: Invalid input (missing fields or invalid tutor_mode)
    - HTTP 403: Authorization failure
    - HTTP 429: Rate limit exceeded
    """
    # Create service instance
    tutor_service = TutorService(db)

    # Validate required fields (Requirement 13.1)
    invalid_fields = []
    
    if not request.question_id:
        invalid_fields.append("question_id")
    if not request.message:
        invalid_fields.append("message")
    if not request.tutor_mode:
        invalid_fields.append("tutor_mode")
    
    if invalid_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_message": "Invalid input",
                "invalid_fields": invalid_fields
            }
        )
    
    # Validate tutor_mode (Requirement 13.4)
    valid_modes = ["socratic", "eli5", "interview"]
    if request.tutor_mode not in valid_modes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_message": f"Invalid tutor_mode. Must be one of: {', '.join(valid_modes)}",
                "invalid_fields": ["tutor_mode"]
            }
        )
    
    # Validate question_id format
    try:
        question_obj_id = ObjectId(request.question_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_message": "Invalid question_id format",
                "invalid_fields": ["question_id"]
            }
        )
    
    # Extract user_id from JWT token (Requirement 13.1)
    user_id = current_user.id
    
    # Call TutorService.send_chat_message (Requirement 4.1-4.5)
    try:
        result = await tutor_service.send_chat_message(
            user_id=user_id,
            question_id=question_obj_id,
            message=request.message,
            user_code=request.user_code,
            language=request.language,
            tutor_mode=request.tutor_mode
        )
        
        # Return response with HTTP 200 (Requirement 13.2)
        return TutorChatResponse(
            response_text=result["response_text"],
            hints_used_count=result["hints_used_count"],
            session_id=result["session_id"],
            tokens_remaining=result["tokens_remaining"],
            requests_remaining=result["requests_remaining"]
        )
        
    except HTTPException as e:
        # Re-raise HTTP exceptions (rate limit, etc.)
        raise
    
    except ValueError as e:
        # Question not found or content unavailable
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_message": str(e)
            }
        )
    
    except Exception as e:
        # Internal server error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_message": f"Failed to process chat message: {str(e)}"
            }
        )


@router.get(
    "/sessions",
    response_model=TutorSessionsResponse,
    status_code=status.HTTP_200_OK
)
async def get_tutor_sessions(
    current_user: CurrentUser,
    limit: int = Query(default=20, ge=1, le=100, description="Number of sessions to return"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get recent tutor sessions for the current user.
    
    Requirements: 7.2, 7.3
    
    Returns:
    - Last N sessions (default 20)
    - Question title, date, mode, hints count, solved status, time spent
    - AI-generated insights (summary, weaknesses, mistakes)
    - Recommendations (3 topics + 5 questions)
    """
    # Extract user_id from JWT token
    user_id = current_user.id
    
    # Create service instance
    session_service = SessionService(db)
    
    try:
        # Call SessionService.get_user_sessions
        sessions = await session_service.get_user_sessions(
            user_id=user_id,
            limit=limit
        )
        
        # Convert to response model
        session_items = []
        for session in sessions:
            session_items.append(TutorSessionItem(
                session_id=session["session_id"],
                question_id=session["question_id"],
                question_title=session["question_title"],
                question_difficulty=session["question_difficulty"],
                date=session["date"],
                tutor_mode=session["tutor_mode"],
                hints_used=session["hints_used"],
                solved=session["solved"],
                time_spent_seconds=session["time_spent_seconds"],
                ai_summary=session.get("ai_summary"),
                weaknesses_detected=session.get("weaknesses_detected", []),
                recurring_mistakes=session.get("recurring_mistakes", []),
                recommended_topics=session.get("recommended_topics", []),
                recommended_questions=[
                    RecommendedQuestion(
                        id=q["id"],
                        title=q["title"],
                        difficulty=q["difficulty"],
                        link=q["link"]
                    )
                    for q in session.get("recommended_questions", [])
                ]
            ))
        
        return TutorSessionsResponse(sessions=session_items)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_message": f"Failed to get tutor sessions: {str(e)}"
            }
        )


@router.post(
    "/feedback",
    response_model=TutorFeedbackResponse,
    status_code=status.HTTP_200_OK
)
async def submit_tutor_feedback(
    request: TutorFeedbackRequest,
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Submit feedback for a tutor session.
    
    Requirements: 8.3, 8.4
    
    Validates:
    - Required fields (session_id, rating)
    - Rating is valid (positive or negative)
    - Session exists and belongs to user
    - No duplicate feedback
    """
    # Create service instance
    feedback_service = FeedbackService(db)
    
    # Validate required fields
    invalid_fields = []
    
    if not request.session_id:
        invalid_fields.append("session_id")
    if not request.rating:
        invalid_fields.append("rating")
    
    if invalid_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_message": "Invalid input",
                "invalid_fields": invalid_fields
            }
        )
    
    # Validate rating
    if request.rating not in ["positive", "negative"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_message": "Invalid rating. Must be 'positive' or 'negative'",
                "invalid_fields": ["rating"]
            }
        )
    
    # Validate session_id format
    try:
        session_obj_id = ObjectId(request.session_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_message": "Invalid session_id format",
                "invalid_fields": ["session_id"]
            }
        )
    
    # Extract user_id from JWT token
    user_id = current_user.id
    
    try:
        # Call FeedbackService.submit_feedback
        feedback_id = await feedback_service.submit_feedback(
            user_id=user_id,
            session_id=session_obj_id,
            rating=request.rating,
            feedback_text=request.feedback_text
        )
        
        # Return feedback_id with HTTP 200
        return TutorFeedbackResponse(
            feedback_id=str(feedback_id),
            message="Thank you for your feedback!"
        )
        
    except ValueError as e:
        # Session not found, doesn't belong to user, or duplicate feedback
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_message": str(e)
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_message": f"Failed to submit feedback: {str(e)}"
            }
        )


@router.post(
    "/reset",
    response_model=TutorResetResponse,
    status_code=status.HTTP_200_OK
)
async def reset_tutor_conversation(
    request: TutorResetRequest,
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Reset tutor conversation for a question.
    
    Requirements: 6.5
    
    Clears:
    - All chat messages for user + question pair
    - Session summary
    """
    # Create service instance
    tutor_service = TutorService(db)
    
    # Validate required field
    if not request.question_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_message": "Invalid input",
                "invalid_fields": ["question_id"]
            }
        )
    
    # Validate question_id format
    try:
        question_obj_id = ObjectId(request.question_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_message": "Invalid question_id format",
                "invalid_fields": ["question_id"]
            }
        )
    
    # Extract user_id from JWT token
    user_id = current_user.id
    
    try:
        # Call TutorService.reset_tutor_conversation
        await tutor_service.reset_tutor_conversation(
            user_id=user_id,
            question_id=question_obj_id
        )
        
        # Return success message with HTTP 200
        return TutorResetResponse(
            message="Tutor conversation reset successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_message": f"Failed to reset tutor conversation: {str(e)}"
            }
        )



