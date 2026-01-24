from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from ..db import get_database
from ..services.streak_service import StreakService
from ..services.chat import scrape_question_text


router = APIRouter(prefix="/questions", tags=["questions"])


def slugify_question_title(title: str) -> str:
    """Convert question title to URL-friendly slug"""
    import re
    # Remove special characters and convert to lowercase
    slug = re.sub(r'[^\w\s-]', '', title.lower())
    # Replace spaces with hyphens
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug.strip('-')


async def find_question_by_identifier(db: AsyncIOMotorDatabase, identifier: str):
    """Find question by ID, titleSlug, or title"""
    # Try to find by ObjectId first
    try:
        question = await db["questions"].find_one({"_id": ObjectId(identifier)})
        if question:
            return question
    except:
        pass
    
    # Try to find by titleSlug
    question = await db["questions"].find_one({"titleSlug": identifier})
    if question:
        return question
    
    # Try to find by slugified title
    question = await db["questions"].find_one({
        "title": {"$regex": f"^{identifier.replace('-', ' ')}$", "$options": "i"}
    })
    if question:
        return question
    
    return None


class QuestionResponse(BaseModel):
    """Response for GET question endpoint"""
    id: str
    title: str
    difficulty: str
    link: str
    frequency: Optional[int] = None
    topics: Optional[str] = None
    content: Optional[str] = None
    hints: Optional[list] = None
    solved: bool = False
    company_name: Optional[str] = None
    titleSlug: Optional[str] = None


@router.get("/{question_identifier}", response_model=QuestionResponse)
async def get_question(
    question_identifier: str,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Get a single question by ID, titleSlug, or title"""
    # Get user_id from query params (optional)
    user_id = request.query_params.get("user_id")
    
    # Find question by identifier
    question = await find_question_by_identifier(db, question_identifier)
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Check if solved (if user_id provided)
    solved = False
    question_obj_id = question["_id"]
    if user_id:
        try:
            user_obj_id = ObjectId(user_id)
            user_question = await db["user_questions"].find_one({
                "user_id": user_obj_id,
                "question_id": question_obj_id
            })
            if user_question:
                solved = user_question.get("solved", False)
        except Exception:
            pass
    
    # Fetch company name if company_id exists
    company_name = None
    if question.get("company_id"):
        try:
            company = await db["companies"].find_one({"_id": question["company_id"]})
            if company:
                company_name = company.get("name")
        except Exception:
            pass
    
    # Generate titleSlug if not present
    title_slug = question.get("titleSlug")
    if not title_slug and question.get("title"):
        title_slug = slugify_question_title(question["title"])
    
    return QuestionResponse(
        id=str(question["_id"]),
        title=question.get("title", ""),
        difficulty=question.get("difficulty", ""),
        link=question.get("link", ""),
        frequency=question.get("frequency"),
        topics=question.get("topics"),
        content=question.get("content"),
        hints=question.get("hints", []),
        solved=solved,
        company_name=company_name,
        titleSlug=title_slug
    )


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


@router.post("/{question_identifier}/solve", response_model=SolveResponse)
@router.post("/{question_identifier}/solve.json", response_model=SolveResponse)
async def solve_question(
    question_identifier: str,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Standalone solve endpoint at /questions/{identifier}/solve (not nested under companies)"""
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
    
    # Find question by identifier
    question_doc = await find_question_by_identifier(db, question_identifier)
    if not question_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    try:
        user_obj_id = ObjectId(user_id)
        question_obj_id = question_doc["_id"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id",
        )
    
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


@router.delete("/{question_identifier}/solve")
@router.delete("/{question_identifier}/solve.json")
async def unsolve_question(
    question_identifier: str,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Standalone unsolve endpoint at /questions/{identifier}/solve (not nested under companies)"""
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
    
    # Find question by identifier
    question_doc = await find_question_by_identifier(db, question_identifier)
    if not question_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    try:
        user_obj_id = ObjectId(user_id)
        question_obj_id = question_doc["_id"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id",
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


@router.get("/{question_id}/content")
async def get_question_content(
    question_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Fetch question content from LeetCode"""
    try:
        question_obj_id = ObjectId(question_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid question_id",
        )
    
    # Fetch question
    question = await db["questions"].find_one({"_id": question_obj_id})
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    # Check if content is already cached in database
    if question.get("content"):
        return {
            "content": question["content"],
            "cached": True
        }
    
    # Fetch from LeetCode
    link = question.get("link")
    if not link:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question has no link"
        )
    
    try:
        content = await scrape_question_text(link)
        
        # Cache the content in database for future requests
        if content and content != "Please paste the question text here.":
            await db["questions"].update_one(
                {"_id": question_obj_id},
                {"$set": {"content": content}}
            )
        
        return {
            "content": content,
            "cached": False
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch content from LeetCode: {str(e)}"
        )

