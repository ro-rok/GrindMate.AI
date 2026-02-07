"""
Timer Router

Provides endpoints for question timer management:
- Start timer when question is clicked
- Stop timer when user leaves or solves
- Get current timer state
- Save time spent
"""

from typing import Optional
from datetime import datetime, UTC
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from bson import ObjectId

from ..auth import CurrentUser
from ..db import get_database

logger = logging.getLogger("uvicorn")
router = APIRouter(prefix="/timer", tags=["timer"])


# Request/Response Models
class TimerStartRequest(BaseModel):
    question_id: str


class TimerStopRequest(BaseModel):
    question_id: str


class TimerStateResponse(BaseModel):
    question_id: str
    is_running: bool
    elapsed_seconds: int
    started_at: Optional[str] = None


class TimerSaveRequest(BaseModel):
    question_id: str
    time_spent_seconds: int


@router.post("/start", response_model=TimerStateResponse)
async def start_timer(
    request: TimerStartRequest,
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Start timer for a question.
    Creates or updates user_question record with timer state.
    """
    # Try to parse as ObjectId first, then try to find by titleSlug
    try:
        question_obj_id = ObjectId(request.question_id)
    except Exception:
        # Not a valid ObjectId, try to find by titleSlug
        question = await db["questions"].find_one({"titleSlug": request.question_id})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid question_id or question not found"
            )
        question_obj_id = question["_id"]
    
    try:
        user_obj_id = ObjectId(str(current_user.id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id"
        )
    
    now = datetime.now(UTC)
    
    # Check if timer is already running
    existing = await db["user_questions"].find_one({
        "user_id": user_obj_id,
        "question_id": question_obj_id
    })
    
    if existing and existing.get("timer_is_running"):
        # Timer already running, return current state
        elapsed = existing.get("time_spent_seconds", 0)
        started_at = existing.get("timer_started_at")
        
        # Calculate additional elapsed time since last update
        if started_at:
            # Ensure started_at is timezone-aware
            if started_at.tzinfo is None:
                started_at = started_at.replace(tzinfo=UTC)
            additional_time = int((now - started_at).total_seconds())
            elapsed += additional_time
        
        return TimerStateResponse(
            question_id=request.question_id,
            is_running=True,
            elapsed_seconds=elapsed,
            started_at=started_at.isoformat() if started_at else None
        )
    
    # Start new timer or restart stopped timer
    update_doc = {
        "$set": {
            "timer_is_running": True,
            "timer_started_at": now,
            "last_attempt_at": now,
            "updated_at": now
        },
        "$setOnInsert": {
            "user_id": user_obj_id,
            "question_id": question_obj_id,
            "solved": False,
            "attempts": 0,
            "time_spent_seconds": 0,
            "hints_unlocked": [],
            "created_at": now
        }
    }
    
    await db["user_questions"].update_one(
        {"user_id": user_obj_id, "question_id": question_obj_id},
        update_doc,
        upsert=True
    )
    
    elapsed = existing.get("time_spent_seconds", 0) if existing else 0
    
    return TimerStateResponse(
        question_id=request.question_id,
        is_running=True,
        elapsed_seconds=elapsed,
        started_at=now.isoformat()
    )


@router.post("/stop", response_model=TimerStateResponse)
async def stop_timer(
    request: TimerStopRequest,
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Stop timer for a question.
    Saves accumulated time to user_question record.
    """
    # Try to parse as ObjectId first, then try to find by titleSlug
    try:
        question_obj_id = ObjectId(request.question_id)
    except Exception:
        # Not a valid ObjectId, try to find by titleSlug
        question = await db["questions"].find_one({"titleSlug": request.question_id})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid question_id or question not found"
            )
        question_obj_id = question["_id"]
    
    try:
        user_obj_id = ObjectId(str(current_user.id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id"
        )
    
    now = datetime.now(UTC)
    
    # Get current timer state
    existing = await db["user_questions"].find_one({
        "user_id": user_obj_id,
        "question_id": question_obj_id
    })
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timer not found"
        )
    
    if not existing.get("timer_is_running"):
        # Timer already stopped
        return TimerStateResponse(
            question_id=request.question_id,
            is_running=False,
            elapsed_seconds=existing.get("time_spent_seconds", 0),
            started_at=None
        )
    
    # Calculate elapsed time since timer started
    started_at = existing.get("timer_started_at")
    current_time = existing.get("time_spent_seconds", 0)
    
    if started_at:
        # Ensure started_at is timezone-aware
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=UTC)
        additional_time = int((now - started_at).total_seconds())
        current_time += additional_time
    
    # Stop timer and save accumulated time
    await db["user_questions"].update_one(
        {"user_id": user_obj_id, "question_id": question_obj_id},
        {
            "$set": {
                "timer_is_running": False,
                "timer_started_at": None,
                "time_spent_seconds": current_time,
                "updated_at": now
            }
        }
    )
    
    return TimerStateResponse(
        question_id=request.question_id,
        is_running=False,
        elapsed_seconds=current_time,
        started_at=None
    )


@router.get("/{question_id}/state", response_model=TimerStateResponse)
async def get_timer_state(
    question_id: str,
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get current timer state for a question.
    """
    # Try to parse as ObjectId first, then try to find by titleSlug
    try:
        question_obj_id = ObjectId(question_id)
    except Exception:
        # Not a valid ObjectId, try to find by titleSlug
        question = await db["questions"].find_one({"titleSlug": question_id})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid question_id or question not found"
            )
        question_obj_id = question["_id"]
    
    try:
        user_obj_id = ObjectId(str(current_user.id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id"
        )
    
    existing = await db["user_questions"].find_one({
        "user_id": user_obj_id,
        "question_id": question_obj_id
    })
    
    if not existing:
        return TimerStateResponse(
            question_id=question_id,
            is_running=False,
            elapsed_seconds=0,
            started_at=None
        )
    
    is_running = existing.get("timer_is_running", False)
    elapsed = existing.get("time_spent_seconds", 0)
    started_at = existing.get("timer_started_at")
    
    # If timer is running, calculate current elapsed time
    if is_running and started_at:
        now = datetime.now(UTC)
        # Ensure started_at is timezone-aware
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=UTC)
        additional_time = int((now - started_at).total_seconds())
        elapsed += additional_time
    
    return TimerStateResponse(
        question_id=question_id,
        is_running=is_running,
        elapsed_seconds=elapsed,
        started_at=started_at.isoformat() if started_at and is_running else None
    )
