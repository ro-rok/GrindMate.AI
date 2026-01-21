from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from ..db import get_database
from ..services.streak_service import StreakService


router = APIRouter(prefix="/questions", tags=["questions"])


class SolveRequest(BaseModel):
    """Request body for solve endpoint"""
    time_spent_seconds: Optional[int] = 0


class SolveResponse(BaseModel):
    """Response for solve endpoint"""
    solved: bool
    question_id: str
    streak_updated: bool = False
    new_streak: int = 0
    milestone_reached: Optional[int] = None


@router.post("/{question_id}/solve", response_model=SolveResponse)
@router.post("/{question_id}/solve.json", response_model=SolveResponse)
async def solve_question(
    question_id: str,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Standalone solve endpoint at /questions/{id}/solve (not nested under companies)"""
    # Get user_id from query params (frontend sends it as query param)
    user_id = request.query_params.get("user_id")
    
    # Parse request body for time_spent_seconds
    time_spent_seconds = 0
    try:
        body = await request.json()
        if not user_id:
            user_id = body.get("user_id")
        time_spent_seconds = body.get("time_spent_seconds", 0)
    except Exception:
        pass
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing user_id",
        )
    try:
        user_obj_id = ObjectId(user_id)
        question_obj_id = ObjectId(question_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ids",
        )

    now = datetime.utcnow()

    # Get user and question to preserve legacy_id fields if they exist
    user_doc = await db["users"].find_one({"_id": user_obj_id}, {"legacy_id": 1, "timezone": 1})
    question_doc = await db["questions"].find_one({"_id": question_obj_id}, {"legacy_id": 1})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user_question already exists
    existing = await db["user_questions"].find_one(
        {"user_id": user_obj_id, "question_id": question_obj_id}
    )

    set_doc = {
        "user_id": user_obj_id,
        "question_id": question_obj_id,
        "solved": True,
        "solved_at": now,
        "updated_at": now,
    }
    
    # Add time_spent_seconds if provided
    if time_spent_seconds > 0:
        if existing and "time_spent_seconds" in existing:
            set_doc["time_spent_seconds"] = existing["time_spent_seconds"] + time_spent_seconds
        else:
            set_doc["time_spent_seconds"] = time_spent_seconds
    
    set_on_insert_doc = {"created_at": now}
    
    # Preserve legacy_id fields if they exist in existing record
    if existing:
        if "legacy_id" in existing:
            set_doc["legacy_id"] = existing["legacy_id"]
        if "user_legacy_id" in existing:
            set_doc["user_legacy_id"] = existing["user_legacy_id"]
        if "question_legacy_id" in existing:
            set_doc["question_legacy_id"] = existing["question_legacy_id"]
    else:
        # For new records, set legacy_id fields if user/question have them
        if user_doc and "legacy_id" in user_doc:
            set_on_insert_doc["user_legacy_id"] = user_doc["legacy_id"]
        if question_doc and "legacy_id" in question_doc:
            set_on_insert_doc["question_legacy_id"] = question_doc["legacy_id"]

    await db["user_questions"].update_one(
        {"user_id": user_obj_id, "question_id": question_obj_id},
        {
            "$set": set_doc,
            "$setOnInsert": set_on_insert_doc,
        },
        upsert=True,
    )
    
    # Update streak
    streak_service = StreakService(db)
    user_timezone = user_doc.get("timezone", "UTC")
    streak_info = await streak_service.update_streak_on_solve(
        user_id=user_obj_id,
        timezone=user_timezone
    )

    return SolveResponse(
        solved=True,
        question_id=question_id,
        streak_updated=streak_info["streak_updated"],
        new_streak=streak_info["new_streak"],
        milestone_reached=streak_info["milestone_reached"]
    )


@router.delete("/{question_id}/solve")
@router.delete("/{question_id}/solve.json")
async def unsolve_question(
    question_id: str,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Standalone unsolve endpoint at /questions/{id}/solve (not nested under companies)"""
    # Get user_id from query params (frontend sends it as query param)
    user_id = request.query_params.get("user_id")
    
    # If not in query params, try body
    if not user_id:
        try:
            body = await request.json()
            user_id = body.get("user_id")
        except Exception:
            pass
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing user_id",
        )
    try:
        user_obj_id = ObjectId(user_id)
        question_obj_id = ObjectId(question_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ids",
        )

    result = await db["user_questions"].update_one(
        {"user_id": user_obj_id, "question_id": question_obj_id},
        {"$set": {"solved": False}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    # Update streak after unsolving
    user_doc = await db["users"].find_one({"_id": user_obj_id}, {"timezone": 1})
    if user_doc:
        streak_service = StreakService(db)
        user_timezone = user_doc.get("timezone", "UTC")
        await streak_service.update_streak_on_unsolve(
            user_id=user_obj_id,
            timezone=user_timezone
        )

    return {"solved": False, "question_id": question_id}

