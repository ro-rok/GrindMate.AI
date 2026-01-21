from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from ..db import get_database
from ..auth import CurrentUser
from ..services.streak_service import StreakService


router = APIRouter(tags=["users"])


class StreakResponse(BaseModel):
    """Response model for streak endpoint"""
    current_streak: int
    longest_streak: int
    last_solve_date: Optional[date]
    calendar_heatmap: List[dict]  # [{"date": "2025-01-22", "count": 3}, ...]


@router.get("/users/me/streak", response_model=StreakResponse)
async def get_user_streak(
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Get current user's streak information.
    
    Returns:
        - current_streak: Number of consecutive days with at least one solve
        - longest_streak: Highest streak ever achieved
        - last_solve_date: Date of most recent solve
        - calendar_heatmap: Last 30 days of solve activity
    
    Requirements: 10.1-10.7
    """
    streak_service = StreakService(db)
    
    # Get calendar heatmap data (last 30 days)
    calendar_heatmap = await streak_service.get_calendar_heatmap_data(
        user_id=current_user.id,
        timezone=current_user.timezone,
        days=30
    )
    
    return StreakResponse(
        current_streak=current_user.current_streak,
        longest_streak=current_user.longest_streak,
        last_solve_date=current_user.last_solve_date,
        calendar_heatmap=calendar_heatmap
    )


@router.post("/users/reset_progress", status_code=status.HTTP_204_NO_CONTENT)
async def reset_progress(
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Mirrors UsersController#reset_progress:
    - Requires a valid user_id in the payload
    - Optional company_id to scope which questions are reset
    """
    user_id = body.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid user_id",
        )

    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid user_id",
        )

    company_id = body.get("company_id")

    if company_id:
        try:
            company_obj_id = ObjectId(company_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid company_id",
            )

        # Find all questions for this company
        q_cursor = db["questions"].find(
            {"company_id": company_obj_id}, {"_id": 1}
        )
        question_ids = [doc["_id"] async for doc in q_cursor]
        if question_ids:
            await db["user_questions"].delete_many(
                {"user_id": user_obj_id, "question_id": {"$in": question_ids}}
            )
    else:
        await db["user_questions"].delete_many({"user_id": user_obj_id})

    return


