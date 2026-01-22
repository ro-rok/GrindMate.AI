"""
AI Tutor Router

Provides endpoints for hint ladder system and chat functionality.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from ..auth import CurrentUser
from ..db import get_database
from ..services.tutor_service import get_tutor_service, TutorService


router = APIRouter(prefix="/questions", tags=["tutor"])


# Request/Response Models
class HintUnlockRequest(BaseModel):
    override: bool = Field(default=False, description="Skip sequential unlock validation")


class HintUnlockResponse(BaseModel):
    hint_level: int
    hint_content: str
    tokens_used: int
    rate_budget_remaining: int


class ChatRequest(BaseModel):
    message: str = Field(..., description="User's message to the AI tutor")
    tutor_mode: str = Field(default="socratic", description="Tutoring mode: socratic, eli5, or interviewer")
    code: Optional[str] = Field(default=None, description="Optional code snippet from user")


class ChatResponse(BaseModel):
    response: str
    tokens_used: int
    rate_budget_remaining: int
    cached: bool
    misconception_detected: Optional[str] = None


class RateBudgetResponse(BaseModel):
    tokens_remaining: int
    requests_remaining: int
    reset_at: str


@router.post(
    "/{question_id}/hints/{level}/unlock",
    response_model=HintUnlockResponse,
    status_code=status.HTTP_200_OK
)
async def unlock_hint(
    question_id: str,
    level: int,
    request: HintUnlockRequest = Body(...),
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database),
    tutor_service: TutorService = Depends(get_tutor_service)
):
    """
    Unlock a hint level for a question.
    
    Validates sequential unlock (level N requires N-1 unlocked) unless override flag is set.
    Returns hint content and token usage.
    Updates user's hint_unlocks tracking.
    
    Requirements: 6.8, 6.9
    """
    # Validate hint level
    if level < 1 or level > 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hint level must be between 1 and 6"
        )
    
    try:
        # Unlock hint
        result = await tutor_service.unlock_hint(
            user_id=str(current_user.id),
            question_id=question_id,
            hint_level=level,
            override=request.override
        )
        
        # Get remaining rate budget
        rate_budget = await _get_rate_budget(str(current_user.id), db)
        
        return HintUnlockResponse(
            hint_level=level,
            hint_content=result["hint_content"],
            tokens_used=result["tokens_used"],
            rate_budget_remaining=rate_budget["tokens_remaining"]
        )
        
    except ValueError as e:
        # Sequential unlock validation failed
        if "Must unlock level" in str(e):
            # Get unlocked levels for error response
            unlocked_levels = await tutor_service.get_unlocked_hints(
                str(current_user.id), question_id
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": str(e),
                    "unlocked_levels": unlocked_levels
                }
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    except HTTPException:
        # Rate limit or other HTTP exceptions - re-raise
        raise
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unlock hint: {str(e)}"
        )


@router.post(
    "/{question_id}/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK
)
async def chat_with_tutor(
    question_id: str,
    request: ChatRequest,
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database),
    tutor_service: TutorService = Depends(get_tutor_service)
):
    """
    Chat with AI tutor about a question.
    
    Accepts message, tutor_mode, and optional code.
    Generates AI response with context from conversation history.
    Tracks conversation history and token usage.
    Returns response with token usage and cache status.
    
    Requirements: 6.1-6.9, 7.1-7.7
    """
    # Validate tutor mode
    valid_modes = ["socratic", "eli5", "interviewer"]
    if request.tutor_mode not in valid_modes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tutor_mode. Must be one of: {', '.join(valid_modes)}"
        )
    
    try:
        # Send chat message
        result = await tutor_service.chat(
            user_id=str(current_user.id),
            question_id=question_id,
            message=request.message,
            tutor_mode=request.tutor_mode,
            code=request.code
        )
        
        # Get remaining rate budget
        rate_budget = await _get_rate_budget(str(current_user.id), db)
        
        return ChatResponse(
            response=result["response"],
            tokens_used=result["tokens_used"],
            rate_budget_remaining=rate_budget["tokens_remaining"],
            cached=result["cached"],
            misconception_detected=result.get("misconception_detected")
        )
        
    except HTTPException:
        # Rate limit or other HTTP exceptions - re-raise
        raise
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat message: {str(e)}"
        )


@router.get(
    "/{question_id}/hints",
    response_model=dict,
    status_code=status.HTTP_200_OK
)
async def get_unlocked_hints(
    question_id: str,
    current_user: CurrentUser,
    tutor_service: TutorService = Depends(get_tutor_service)
):
    """
    Get list of unlocked hint levels for a question.
    
    Returns list of hint levels (1-6) that the user has unlocked.
    """
    try:
        unlocked_levels = await tutor_service.get_unlocked_hints(
            str(current_user.id), question_id
        )
        
        return {
            "question_id": question_id,
            "unlocked_levels": unlocked_levels
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get unlocked hints: {str(e)}"
        )


@router.get(
    "/rate-budget",
    response_model=RateBudgetResponse,
    status_code=status.HTTP_200_OK
)
async def get_rate_budget(
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get user's current rate budget (tokens and requests remaining).
    
    Returns remaining tokens, requests, and reset time.
    """
    try:
        budget = await _get_rate_budget(str(current_user.id), db)
        
        return RateBudgetResponse(
            tokens_remaining=budget["tokens_remaining"],
            requests_remaining=budget["requests_remaining"],
            reset_at=budget["reset_at"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get rate budget: {str(e)}"
        )


# Helper functions
async def _get_rate_budget(user_id: str, db: AsyncIOMotorDatabase) -> dict:
    """Get user's remaining rate budget"""
    from datetime import datetime, timedelta
    from bson import ObjectId
    
    # Check if user has BYOK
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if user and user.get("byok_groq_key"):
        # BYOK users have unlimited budget
        return {
            "tokens_remaining": 999999,
            "requests_remaining": 999999,
            "reset_at": (datetime.utcnow() + timedelta(days=1)).isoformat()
        }
    
    # Get today's rate limit record
    today = datetime.utcnow().date()
    rate_limit = await db["rate_limits"].find_one({
        "user_id": ObjectId(user_id),
        "date": today
    })
    
    tokens_used = rate_limit.get("tokens_used", 0) if rate_limit else 0
    requests_made = rate_limit.get("requests_made", 0) if rate_limit else 0
    
    # Calculate remaining (25k tokens, 30 requests per day)
    tokens_remaining = max(0, 25000 - tokens_used)
    requests_remaining = max(0, 30 - requests_made)
    
    # Calculate reset time (midnight UTC - TODO: use user's timezone)
    tomorrow = today + timedelta(days=1)
    reset_at = datetime.combine(tomorrow, datetime.min.time()).isoformat()
    
    return {
        "tokens_remaining": tokens_remaining,
        "requests_remaining": requests_remaining,
        "reset_at": reset_at
    }
