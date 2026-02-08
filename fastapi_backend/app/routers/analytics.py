"""
Analytics Router

Provides endpoints for user analytics including:
- Time spent by topic
- Time spent by difficulty
- Admin dashboard stats
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, UTC
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from bson import ObjectId

from ..auth import CurrentUser
from ..db import get_database

logger = logging.getLogger("uvicorn")
router = APIRouter(prefix="/analytics", tags=["analytics"])


# Response Models
class TimeByTopicItem(BaseModel):
    topic: str
    total_time_seconds: int
    total_time_formatted: str
    questions_solved: int
    avg_time_seconds: int
    avg_time_formatted: str
    fastest_time_seconds: int
    fastest_time_formatted: str
    slowest_time_seconds: int
    slowest_time_formatted: str


class TimeByDifficultyItem(BaseModel):
    difficulty: str
    total_time_seconds: int
    total_time_formatted: str
    questions_solved: int
    avg_time_seconds: int
    avg_time_formatted: str
    fastest_time_seconds: int
    fastest_time_formatted: str
    slowest_time_seconds: int
    slowest_time_formatted: str


class UserStatsResponse(BaseModel):
    total_questions_solved: int
    total_time_seconds: int
    total_time_formatted: str
    avg_time_per_question_seconds: int
    avg_time_per_question_formatted: str
    fastest_solve_seconds: int
    fastest_solve_formatted: str
    slowest_solve_seconds: int
    slowest_solve_formatted: str
    time_by_topic: List[TimeByTopicItem]
    time_by_difficulty: List[TimeByDifficultyItem]


class AdminDashboardStats(BaseModel):
    total_users: int
    total_questions_solved: int
    total_tutor_sessions: int
    total_api_requests_today: int
    active_users_today: int
    top_users: List[Dict[str, Any]]


class RecentSolvedCompany(BaseModel):
    """Response model for recent solved company"""
    company_id: str
    company_name: str
    company_slug: Optional[str] = None
    questions_solved: int
    last_solved_at: datetime
    total_questions: int


def format_time(seconds: int) -> str:
    """Format seconds into human-readable time"""
    if seconds < 60:
        return f"{seconds}s"
    elif seconds < 3600:
        mins = seconds // 60
        secs = seconds % 60
        return f"{mins}m {secs}s"
    else:
        hours = seconds // 3600
        mins = (seconds % 3600) // 60
        return f"{hours}h {mins}m"


@router.get(
    "/admin/dashboard",
    response_model=AdminDashboardStats,
    status_code=status.HTTP_200_OK
)
async def get_admin_dashboard(
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get admin dashboard statistics.
    Only accessible by admin users.
    """
    # Check if user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Get total users
    total_users = await db["users"].count_documents({})
    
    # Get total questions solved
    total_questions_solved = await db["user_questions"].count_documents({"solved": True})
    
    # Get total tutor sessions
    total_tutor_sessions = await db["tutor_sessions"].count_documents({})
    
    # Get today's API requests
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    total_api_requests_today = await db["rate_limits"].aggregate([
        {"$match": {"date": {"$gte": today_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$requests_made"}}}
    ]).to_list(1)
    total_api_requests_today = total_api_requests_today[0]["total"] if total_api_requests_today else 0
    
    # Get active users today (users who solved questions today)
    active_users_today = await db["user_questions"].distinct(
        "user_id",
        {"solved_at": {"$gte": today_start}}
    )
    active_users_today = len(active_users_today)
    
    # Get top 10 users by questions solved
    top_users_pipeline = [
        {"$match": {"solved": True}},
        {"$group": {
            "_id": "$user_id",
            "questions_solved": {"$sum": 1},
            "total_time_seconds": {"$sum": "$time_spent_seconds"}
        }},
        {"$sort": {"questions_solved": -1}},
        {"$limit": 10}
    ]
    
    top_users_data = await db["user_questions"].aggregate(top_users_pipeline).to_list(10)
    
    # Enrich with user details
    top_users = []
    for user_data in top_users_data:
        user = await db["users"].find_one({"_id": user_data["_id"]})
        if user:
            top_users.append({
                "email": user["email"],
                "questions_solved": user_data["questions_solved"],
                "total_time_formatted": format_time(user_data["total_time_seconds"]),
                "is_admin": user.get("role") == "admin"
            })
    
    return AdminDashboardStats(
        total_users=total_users,
        total_questions_solved=total_questions_solved,
        total_tutor_sessions=total_tutor_sessions,
        total_api_requests_today=total_api_requests_today,
        active_users_today=active_users_today,
        top_users=top_users
    )


@router.get(
    "/user/stats",
    response_model=UserStatsResponse,
    status_code=status.HTTP_200_OK
)
async def get_user_stats(
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get user's analytics including time spent by topic and difficulty.
    
    Returns:
    - Total questions solved
    - Total time spent
    - Time breakdown by topic
    - Time breakdown by difficulty
    """
    user_id = current_user.id
    
    # Get all solved questions with time spent
    solved_questions = await db["user_questions"].find({
        "user_id": ObjectId(user_id),
        "solved": True
    }).to_list(length=None)
    
    # Calculate total stats
    total_questions_solved = len(solved_questions)
    total_time_seconds = sum(q.get("time_spent_seconds", 0) for q in solved_questions)
    
    # Get question details for topic and difficulty analysis
    question_ids = [q["question_id"] for q in solved_questions]
    questions = await db["questions"].find({
        "_id": {"$in": question_ids}
    }).to_list(length=None)
    
    # Create lookup map
    question_map = {str(q["_id"]): q for q in questions}
    
    # Aggregate by topic
    topic_stats = {}
    for uq in solved_questions:
        question = question_map.get(str(uq["question_id"]))
        if not question:
            continue
        
        time_spent = uq.get("time_spent_seconds", 0)
        if time_spent == 0:  # Skip questions with no time data
            continue
            
        topics = question.get("topics", "")
        
        # Parse topics (comma-separated string)
        if isinstance(topics, str):
            topic_list = [t.strip() for t in topics.split(",") if t.strip()]
        else:
            topic_list = topics if isinstance(topics, list) else []
        
        for topic in topic_list:
            if topic not in topic_stats:
                topic_stats[topic] = {"times": [], "count": 0}
            topic_stats[topic]["times"].append(time_spent)
            topic_stats[topic]["count"] += 1
    
    # Aggregate by difficulty
    difficulty_stats = {}
    for uq in solved_questions:
        question = question_map.get(str(uq["question_id"]))
        if not question:
            continue
        
        time_spent = uq.get("time_spent_seconds", 0)
        if time_spent == 0:  # Skip questions with no time data
            continue
            
        difficulty = question.get("difficulty", "MEDIUM")
        
        if difficulty not in difficulty_stats:
            difficulty_stats[difficulty] = {"times": [], "count": 0}
        difficulty_stats[difficulty]["times"].append(time_spent)
        difficulty_stats[difficulty]["count"] += 1
    
    # Calculate overall stats
    all_times = [q.get("time_spent_seconds", 0) for q in solved_questions if q.get("time_spent_seconds", 0) > 0]
    avg_time_per_question = sum(all_times) // len(all_times) if all_times else 0
    fastest_solve = min(all_times) if all_times else 0
    slowest_solve = max(all_times) if all_times else 0
    
    # Format topic stats
    time_by_topic = [
        TimeByTopicItem(
            topic=topic,
            total_time_seconds=sum(stats["times"]),
            total_time_formatted=format_time(sum(stats["times"])),
            questions_solved=stats["count"],
            avg_time_seconds=sum(stats["times"]) // stats["count"] if stats["count"] > 0 else 0,
            avg_time_formatted=format_time(sum(stats["times"]) // stats["count"]) if stats["count"] > 0 else "0s",
            fastest_time_seconds=min(stats["times"]) if stats["times"] else 0,
            fastest_time_formatted=format_time(min(stats["times"])) if stats["times"] else "0s",
            slowest_time_seconds=max(stats["times"]) if stats["times"] else 0,
            slowest_time_formatted=format_time(max(stats["times"])) if stats["times"] else "0s"
        )
        for topic, stats in sorted(topic_stats.items(), key=lambda x: sum(x[1]["times"]), reverse=True)
    ]
    
    # Format difficulty stats
    difficulty_order = {"EASY": 1, "MEDIUM": 2, "HARD": 3}
    time_by_difficulty = [
        TimeByDifficultyItem(
            difficulty=difficulty,
            total_time_seconds=sum(stats["times"]),
            total_time_formatted=format_time(sum(stats["times"])),
            questions_solved=stats["count"],
            avg_time_seconds=sum(stats["times"]) // stats["count"] if stats["count"] > 0 else 0,
            avg_time_formatted=format_time(sum(stats["times"]) // stats["count"]) if stats["count"] > 0 else "0s",
            fastest_time_seconds=min(stats["times"]) if stats["times"] else 0,
            fastest_time_formatted=format_time(min(stats["times"])) if stats["times"] else "0s",
            slowest_time_seconds=max(stats["times"]) if stats["times"] else 0,
            slowest_time_formatted=format_time(max(stats["times"])) if stats["times"] else "0s"
        )
        for difficulty, stats in sorted(difficulty_stats.items(), key=lambda x: difficulty_order.get(x[0], 99))
    ]
    
    return UserStatsResponse(
        total_questions_solved=total_questions_solved,
        total_time_seconds=total_time_seconds,
        total_time_formatted=format_time(total_time_seconds),
        avg_time_per_question_seconds=avg_time_per_question,
        avg_time_per_question_formatted=format_time(avg_time_per_question),
        fastest_solve_seconds=fastest_solve,
        fastest_solve_formatted=format_time(fastest_solve),
        slowest_solve_seconds=slowest_solve,
        slowest_solve_formatted=format_time(slowest_solve),
        time_by_topic=time_by_topic,
        time_by_difficulty=time_by_difficulty
    )


@router.get(
    "/admin/dashboard",
    response_model=AdminDashboardStats,
    status_code=status.HTTP_200_OK
)
async def get_admin_dashboard_stats(
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get admin dashboard statistics.
    
    Only accessible by admin users.
    
    Returns:
    - Total users
    - Total questions solved
    - Total tutor sessions
    - API requests today
    - Active users today
    - Top users by questions solved
    """
    # Check if user is admin
    user = await db["users"].find_one({"_id": ObjectId(current_user.id)})
    if not user or user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Get total users
    total_users = await db["users"].count_documents({})
    
    # Get total questions solved (across all users)
    total_questions_solved = await db["user_questions"].count_documents({"solved": True})
    
    # Get total tutor sessions
    total_tutor_sessions = await db["tutor_sessions"].count_documents({})
    
    # Get API requests today
    today = datetime.now(UTC).date()
    today_start = datetime.combine(today, datetime.min.time())
    total_api_requests_today = await db["rate_limits"].count_documents({
        "date": today_start
    })
    
    # Get active users today (users who made requests today)
    active_users_today = len(await db["rate_limits"].distinct("user_id", {
        "date": today_start
    }))
    
    # Get top users by questions solved
    pipeline = [
        {"$match": {"solved": True}},
        {"$group": {
            "_id": "$user_id",
            "questions_solved": {"$sum": 1},
            "total_time_seconds": {"$sum": "$time_spent_seconds"}
        }},
        {"$sort": {"questions_solved": -1}},
        {"$limit": 10}
    ]
    
    top_users_data = await db["user_questions"].aggregate(pipeline).to_list(length=10)
    
    # Enrich with user details
    top_users = []
    for user_data in top_users_data:
        user_doc = await db["users"].find_one({"_id": user_data["_id"]})
        if user_doc:
            top_users.append({
                "user_id": str(user_data["_id"]),
                "username": user_doc.get("username", "Unknown"),
                "email": user_doc.get("email", ""),
                "questions_solved": user_data["questions_solved"],
                "total_time_seconds": user_data.get("total_time_seconds", 0),
                "total_time_formatted": format_time(user_data.get("total_time_seconds", 0)),
                "is_admin": user_doc.get("role") == "admin"
            })
    
    return AdminDashboardStats(
        total_users=total_users,
        total_questions_solved=total_questions_solved,
        total_tutor_sessions=total_tutor_sessions,
        total_api_requests_today=total_api_requests_today,
        active_users_today=active_users_today,
        top_users=top_users
    )


@router.post(
    "/user/time-spent",
    status_code=status.HTTP_200_OK
)
async def update_time_spent(
    question_id: str,
    time_spent_seconds: int,
    current_user: CurrentUser,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update time spent on a question.
    
    This endpoint is called when:
    - User marks question as solved
    - User exits focus mode
    - Timer is paused/stopped
    """
    try:
        question_obj_id = ObjectId(question_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid question_id format"
        )
    
    # Update or create user_question record
    result = await db["user_questions"].update_one(
        {
            "user_id": ObjectId(current_user.id),
            "question_id": question_obj_id
        },
        {
            "$set": {
                "time_spent_seconds": time_spent_seconds,
                "updated_at": datetime.now(UTC)
            },
            "$setOnInsert": {
                "solved": False,
                "created_at": datetime.now(UTC)
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "time_spent_seconds": time_spent_seconds,
        "time_formatted": format_time(time_spent_seconds)
    }


@router.get(
    "/user/recent-solved-companies",
    response_model=List[RecentSolvedCompany],
    status_code=status.HTTP_200_OK
)
async def get_recent_solved_companies(
    current_user: CurrentUser,
    limit: int = Query(default=5, ge=1, le=20),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get recently solved companies for the current user.
    
    Returns a list of companies where the user has solved questions,
    ordered by most recent solve date.
    
    Args:
        limit: Maximum number of companies to return (default: 5, max: 20)
    
    Returns:
        List of companies with solve statistics
    """
    user_id = ObjectId(current_user.id)
    
    # Aggregate recent solved questions by company
    pipeline = [
        # Match solved questions for this user
        {
            "$match": {
                "user_id": user_id,
                "solved": True
            }
        },
        # Sort by most recent solve
        {"$sort": {"solved_at": -1}},
        # Lookup question details to get company_id
        {
            "$lookup": {
                "from": "questions",
                "localField": "question_id",
                "foreignField": "_id",
                "as": "question"
            }
        },
        # Unwind question array
        {"$unwind": "$question"},
        # Group by company
        {
            "$group": {
                "_id": "$question.company_id",
                "questions_solved": {"$sum": 1},
                "last_solved_at": {"$max": "$solved_at"}
            }
        },
        # Sort by most recent solve
        {"$sort": {"last_solved_at": -1}},
        # Limit results
        {"$limit": limit}
    ]
    
    company_stats = await db["user_questions"].aggregate(pipeline).to_list(length=limit)
    
    # Enrich with company details
    result = []
    for stat in company_stats:
        company = await db["companies"].find_one({"_id": stat["_id"]})
        if company:
            # Get total questions for this company
            total_questions = await db["questions"].count_documents({
                "company_id": stat["_id"]
            })
            
            result.append(RecentSolvedCompany(
                company_id=str(stat["_id"]),
                company_name=company.get("name", "Unknown"),
                company_slug=company.get("slug"),
                questions_solved=stat["questions_solved"],
                last_solved_at=stat["last_solved_at"],
                total_questions=total_questions
            ))
    
    return result
