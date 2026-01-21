from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime

from ..db import get_database
from ..auth import CurrentUser
from ..services.streak_service import StreakService
from ..services.analytics_service import AnalyticsService


router = APIRouter(tags=["users"])


class StreakResponse(BaseModel):
    """Response model for streak endpoint"""
    current_streak: int
    longest_streak: int
    last_solve_date: Optional[date]
    calendar_heatmap: List[dict]  # [{"date": "2025-01-22", "count": 3}, ...]


class WeakTopicResponse(BaseModel):
    """Response model for weak topic"""
    topic: str
    solve_rate: float
    attempts: int
    solved: int


class PatternDistributionItem(BaseModel):
    """Response model for pattern distribution item"""
    solved: int
    total: int


class SolveStatsResponse(BaseModel):
    """Response model for solve statistics"""
    total_solved: int
    by_difficulty: Dict[str, int]
    solve_rate_last_10: float


class RateBudgetResponse(BaseModel):
    """Response model for rate budget information"""
    tokens_remaining: int
    requests_remaining: int
    reset_at: Optional[datetime]


class StreakInfo(BaseModel):
    """Streak information for analytics response"""
    current: int
    longest: int
    last_solve_date: Optional[date]


class AnalyticsResponse(BaseModel):
    """Response model for analytics endpoint"""
    streak: StreakInfo
    solve_stats: SolveStatsResponse
    weak_topics: List[WeakTopicResponse]
    pattern_distribution: Dict[str, PatternDistributionItem]
    rate_budget: RateBudgetResponse


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


@router.get("/users/me/analytics", response_model=AnalyticsResponse)
async def get_user_analytics(
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Get comprehensive analytics for the current user.
    
    Returns:
        - streak: Current and longest streak information
        - solve_stats: Total solved count, by difficulty, and recent solve rate
        - weak_topics: Topics with <50% solve rate and ≥3 attempts
        - pattern_distribution: Solve statistics for all patterns
        - rate_budget: Remaining AI usage budget
    
    Requirements: 11.1-11.7
    """
    analytics_service = AnalyticsService(db)
    
    # Calculate weak topics
    weak_topics = await analytics_service.calculate_weak_topics(current_user.id)
    weak_topics_response = [
        WeakTopicResponse(
            topic=wt.topic,
            solve_rate=wt.solve_rate,
            attempts=wt.attempts,
            solved=wt.solved
        )
        for wt in weak_topics
    ]
    
    # Calculate pattern distribution
    pattern_distribution = await analytics_service.calculate_pattern_distribution(current_user.id)
    pattern_distribution_response = {
        pattern: PatternDistributionItem(
            solved=stats.solved,
            total=stats.total
        )
        for pattern, stats in pattern_distribution.items()
    }
    
    # Calculate solve stats by difficulty
    by_difficulty = await analytics_service.calculate_solve_stats_by_difficulty(current_user.id)
    
    # Calculate total solved
    total_solved = sum(by_difficulty.values())
    
    # Calculate recent solve rate
    solve_rate_last_10 = await analytics_service.calculate_recent_solve_rate(current_user.id, last_n=10)
    
    # Build response
    return AnalyticsResponse(
        streak=StreakInfo(
            current=current_user.current_streak,
            longest=current_user.longest_streak,
            last_solve_date=current_user.last_solve_date
        ),
        solve_stats=SolveStatsResponse(
            total_solved=total_solved,
            by_difficulty=by_difficulty,
            solve_rate_last_10=solve_rate_last_10
        ),
        weak_topics=weak_topics_response,
        pattern_distribution=pattern_distribution_response,
        rate_budget=RateBudgetResponse(
            tokens_remaining=current_user.rate_budget_tokens,
            requests_remaining=current_user.rate_budget_requests,
            reset_at=current_user.rate_budget_reset_at
        )
    )


