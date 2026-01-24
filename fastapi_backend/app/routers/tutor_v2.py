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
    
    @classmethod
    def from_result(cls, result: dict):
        """Create response from service result, handling infinity values"""
        tokens_remaining = result.get("tokens_remaining")
        requests_remaining = result.get("requests_remaining")
        
        # Convert infinity to a large number for API response
        # Also handle None or other edge cases
        if tokens_remaining == float('inf') or tokens_remaining is None:
            tokens_remaining = 999999999
        if requests_remaining == float('inf') or requests_remaining is None:
            requests_remaining = 999999999
        
        # Ensure we have valid integers
        try:
            tokens_remaining = int(tokens_remaining) if tokens_remaining != float('inf') else 999999999
            requests_remaining = int(requests_remaining) if requests_remaining != float('inf') else 999999999
        except (ValueError, TypeError):
            tokens_remaining = 999999999
            requests_remaining = 999999999
            
        return cls(
            response_text=result["response_text"],
            hints_used_count=result["hints_used_count"],
            session_id=result["session_id"],
            tokens_remaining=tokens_remaining,
            requests_remaining=requests_remaining
        )


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


@router.get("/test")
async def test_tutor_route():
    """Test endpoint to verify router is working"""
    return {"message": "Tutor router is working", "path": "/tutor/test"}

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
    print(f"DEBUG: /tutor/chat endpoint called with question_id={request.question_id}, tutor_mode={request.tutor_mode}")
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
        return TutorChatResponse.from_result(result)
        
    except HTTPException as e:
        # Re-raise HTTP exceptions (rate limit, etc.)
        raise
    
    except ValueError as e:
        # Question not found or content unavailable
        import traceback
        print(f"ValueError in /tutor/chat: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_message": str(e)
            }
        )
    
    except Exception as e:
        # Catch all other exceptions including Pydantic ValidationError
        from pydantic import ValidationError
        import traceback
        
        if isinstance(e, ValidationError):
            print(f"ValidationError in /tutor/chat: {str(e)}")
            print(traceback.format_exc())
            # This shouldn't happen with from_result, but handle it gracefully
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error_message": "Failed to format response. Please contact support."
                }
            )
        # Internal server error - log the full traceback for debugging
        import traceback
        print(f"ERROR in /tutor/chat: {str(e)}")
        print(traceback.format_exc())
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_message": f"Failed to process chat message: {str(e)}"
            }
        )


class SessionInitializeRequest(BaseModel):
    question_id: str = Field(..., description="Question ID")


class SessionInitializeResponse(BaseModel):
    session_id: str
    message: str = "Session initialized successfully"


@router.post(
    "/session/initialize",
    response_model=SessionInitializeResponse,
    status_code=status.HTTP_200_OK
)
async def initialize_session(
    request: SessionInitializeRequest,
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Initialize a new tutor session for a question.
    
    Creates a session record to track:
    - Start time
    - Question being worked on
    - User progress
    """
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
        # Create session service instance
        session_service = SessionService(db)
        
        # Create new session
        session_id = await session_service.initialize_session(
            user_id=user_id,
            question_id=question_obj_id
        )
        
        return SessionInitializeResponse(
            session_id=str(session_id)
        )
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"ERROR in /tutor/session/initialize: {str(e)}")
        print(error_traceback)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_message": f"Failed to initialize session: {str(e)}"
            }
        )


class SessionUpdateRequest(BaseModel):
    session_id: str = Field(..., description="Session ID")
    elapsed_time: int = Field(..., description="Elapsed time in seconds")
    state: Optional[str] = Field(default=None, description="Session state")
    hints_used: Optional[int] = Field(default=None, description="Number of hints used")


@router.post(
    "/session/update",
    status_code=status.HTTP_200_OK
)
async def update_session(
    request: SessionUpdateRequest,
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update session progress (time, state, hints).
    """
    try:
        session_obj_id = ObjectId(request.session_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_id format"
        )
    
    update_data = {
        "time_spent_seconds": request.elapsed_time,
        "updated_at": datetime.now(UTC)
    }
    
    if request.state:
        update_data["final_state"] = request.state
    
    if request.hints_used is not None:
        update_data["hints_used"] = request.hints_used
    
    await db["tutor_sessions"].update_one(
        {"_id": session_obj_id, "user_id": ObjectId(current_user.id)},
        {"$set": update_data}
    )
    
    return {"success": True}


class SessionEndRequest(BaseModel):
    session_id: str = Field(..., description="Session ID")
    final_state: str = Field(..., description="Final state: solved, unsolved, abandoned")
    total_time: int = Field(..., description="Total time spent in seconds")


@router.post(
    "/session/end",
    status_code=status.HTTP_200_OK
)
async def end_session(
    request: SessionEndRequest,
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    End a tutor session and record final stats.
    """
    try:
        session_obj_id = ObjectId(request.session_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session_id format"
        )
    
    # Update session
    session = await db["tutor_sessions"].find_one_and_update(
        {"_id": session_obj_id, "user_id": ObjectId(current_user.id)},
        {
            "$set": {
                "session_end_time": datetime.now(UTC),
                "final_state": request.final_state,
                "time_spent_seconds": request.total_time,
                "solved": request.final_state == "solved",
                "updated_at": datetime.now(UTC)
            }
        }
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Update user_question with time spent
    if request.final_state == "solved":
        await db["user_questions"].update_one(
            {
                "user_id": ObjectId(current_user.id),
                "question_id": session["question_id"]
            },
            {
                "$set": {
                    "time_spent_seconds": request.total_time,
                    "solved": True,
                    "solved_at": datetime.now(UTC),
                    "updated_at": datetime.now(UTC)
                }
            },
            upsert=True
        )
    
    return {"success": True, "message": "Session ended successfully"}


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



