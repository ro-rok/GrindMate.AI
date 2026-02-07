"""
AI Tutor Router V2 - Focus Mode Enhancement

Provides endpoints for enhanced AI tutor with automatic question context injection,
session tracking, and smart random selection.

Requirements: 4.1-4.5, 6.5, 7.2-7.4, 9.1-9.11, 13.1-13.8
"""

from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from bson import ObjectId

from ..auth import CurrentUser
from ..db import get_database
from ..services.tutor_service import get_tutor_service, TutorService
from ..services.session_service import get_session_service, SessionService
from ..services.smart_random import get_smart_random_service, SmartRandomService


router = APIRouter(prefix="/tutor", tags=["tutor-v2"])


# Request/Response Models for POST /api/tutor/chat
class TutorChatRequest(BaseModel):
    question_id: str = Field(..., description="Question ID")
    message: str = Field(..., description="User's message to the AI tutor")
    tutor_mode: str = Field(..., description="Tutoring mode: socratic, eli5, interview, or code_review")
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
    - Tutor mode is valid (socratic, eli5, interview, code_review)
    
    Returns:
    - HTTP 200: Successful response with AI message
    - HTTP 400: Invalid input (missing fields or invalid tutor_mode)
    - HTTP 403: Authorization failure
    - HTTP 429: Rate limit exceeded
    """
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
    valid_modes = ["socratic", "eli5", "interview", "code_review"]
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
        # Not a valid ObjectId, try to find by titleSlug
        question = await db["questions"].find_one({"titleSlug": request.question_id})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_message": "Invalid question_id format or question not found",
                    "invalid_fields": ["question_id"]
                }
            )
        question_obj_id = question["_id"]
    
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
        logger = logging.getLogger("uvicorn")
        logger.error(f"ValueError in /tutor/chat: {str(e)}")
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
            logger = logging.getLogger("uvicorn")
            logger.error(f"ValidationError in /tutor/chat: {str(e)}")
            # This shouldn't happen with from_result, but handle it gracefully
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error_message": "Failed to format response. Please contact support."
                }
            )
        # Internal server error - log the full traceback for debugging
        logger = logging.getLogger("uvicorn")
        logger.error(f"ERROR in /tutor/chat: {str(e)}", exc_info=True)
        
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
        # Not a valid ObjectId, try to find by titleSlug
        question = await db["questions"].find_one({"titleSlug": request.question_id})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_message": "Invalid question_id format or question not found",
                    "invalid_fields": ["question_id"]
                }
            )
        question_obj_id = question["_id"]
    
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
        logger = logging.getLogger("uvicorn")
        logger.error(f"ERROR in /tutor/session/initialize: {str(e)}", exc_info=True)
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
        "updated_at": datetime.now(timezone.utc)
    }
    
    if request.state:
        update_data["final_state"] = request.state
    
    if request.hints_used is not None:
        update_data["hints_used"] = request.hints_used
    
    result = await db["tutor_sessions"].update_one(
        {"_id": session_obj_id, "user_id": ObjectId(current_user.id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied"
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
                "session_end_time": datetime.now(timezone.utc),
                "final_state": request.final_state,
                "time_spent_seconds": request.total_time,
                "solved": request.final_state == "solved",
                "updated_at": datetime.now(timezone.utc)
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
                    "solved_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
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
        # Not a valid ObjectId, try to find by titleSlug
        question = await db["questions"].find_one({"titleSlug": request.question_id})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error_message": "Invalid question_id format or question not found",
                    "invalid_fields": ["question_id"]
                }
            )
        question_obj_id = question["_id"]
    
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



