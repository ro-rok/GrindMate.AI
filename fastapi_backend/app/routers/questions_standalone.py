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
        question_id=str(question_obj_id),
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

    return {"solved": False, "question_id": str(question_obj_id)}


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




@router.get("/{question_identifier}/leetcode-content")
async def get_leetcode_content(
    question_identifier: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Fetch LeetCode question content via GraphQL API.
    Automatically caches content in database for faster subsequent loads.
    
    Returns:
    - HTML description
    - Code snippets for multiple languages
    - Hints
    - Example test cases
    - Topic tags
    """
    import httpx
    
    # Find question by identifier
    question = await find_question_by_identifier(db, question_identifier)
    
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    
    question_obj_id = question["_id"]
    
    # Check if we have cached content
    cached_content = question.get("leetcode_content")
    cached_snippets = question.get("leetcode_code_snippets")
    
    if cached_content and cached_snippets:
        # Return cached content
        return {
            "questionId": question.get("leetcode_question_id"),
            "title": question.get("title"),
            "content": cached_content,
            "difficulty": question.get("difficulty"),
            "exampleTestcases": question.get("leetcode_example_testcases"),
            "hints": question.get("leetcode_hints", []),
            "topicTags": question.get("leetcode_topic_tags", []),
            "codeSnippets": cached_snippets,
            "stats": question.get("leetcode_stats"),
            "likes": question.get("leetcode_likes"),
            "dislikes": question.get("leetcode_dislikes"),
            "cached": True
        }
    
    # Extract titleSlug from link or use titleSlug field
    title_slug = question.get("titleSlug")
    
    if not title_slug and question.get("link"):
        # Try to extract from link
        link = question["link"]
        if "leetcode.com/problems/" in link:
            parts = link.split("/problems/")
            if len(parts) > 1:
                title_slug = parts[1].rstrip("/").split("/")[0]
    
    if not title_slug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question does not have a titleSlug or valid LeetCode link",
        )
    
    # GraphQL query
    graphql_query = {
        "query": """
            query getQuestionDetail($titleSlug: String!) {
                question(titleSlug: $titleSlug) {
                    questionId
                    title
                    content
                    difficulty
                    exampleTestcases
                    hints
                    topicTags {
                        name
                        slug
                    }
                    codeSnippets {
                        lang
                        langSlug
                        code
                    }
                    stats
                    likes
                    dislikes
                }
            }
        """,
        "variables": {"titleSlug": title_slug}
    }
    
    # Make request to LeetCode GraphQL API
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://leetcode.com/problems/",
        "Origin": "https://leetcode.com"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://leetcode.com/graphql",
                json=graphql_query,
                headers=headers
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"LeetCode API returned status {response.status_code}",
                )
            
            data = response.json()
            
            if not data.get("data") or not data["data"].get("question"):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Question content not found on LeetCode",
                )
            
            leetcode_question = data["data"]["question"]
            
            # Cache the content in database for future requests
            update_data = {
                "leetcode_question_id": leetcode_question.get("questionId"),
                "leetcode_content": leetcode_question.get("content"),
                "leetcode_hints": leetcode_question.get("hints", []),
                "leetcode_example_testcases": leetcode_question.get("exampleTestcases"),
                "leetcode_code_snippets": leetcode_question.get("codeSnippets", []),
                "leetcode_topic_tags": leetcode_question.get("topicTags", []),
                "leetcode_stats": leetcode_question.get("stats"),
                "leetcode_likes": leetcode_question.get("likes"),
                "leetcode_dislikes": leetcode_question.get("dislikes"),
                "leetcode_cached_at": datetime.utcnow()
            }
            
            # Update topics if available
            if leetcode_question.get("topicTags"):
                topics = [tag["name"] for tag in leetcode_question["topicTags"]]
                update_data["topics"] = ", ".join(topics)
            
            # Update the question in database
            await db["questions"].update_one(
                {"_id": question_obj_id},
                {"$set": update_data}
            )
            
            # Return the fresh content
            leetcode_question["cached"] = False
            return leetcode_question
            
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request to LeetCode API timed out",
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to LeetCode API: {str(e)}",
        )
