import random
from datetime import date, datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db import get_database
from ..models.question import QuestionPublic, QuestionWithSolved, SmartRandomResponse, QuestionListResponse
from ..services.streak_service import StreakService
from ..services.smart_random import SmartRandomService


router = APIRouter(prefix="/companies/{company_identifier}/questions", tags=["questions"])


def slugify(text: str) -> str:
    """Convert company name to URL-friendly slug"""
    return text.lower().replace(" ", "-").replace(".", "").replace(",", "")


async def find_company_by_identifier(db: AsyncIOMotorDatabase, identifier: str):
    """Find company by ID, slug, or name"""
    # Try to find by ObjectId first
    try:
        company = await db["companies"].find_one({"_id": ObjectId(identifier)})
        if company:
            return company
    except:
        pass
    
    # Try to find by slug
    company = await db["companies"].find_one({"slug": identifier})
    if company:
        return company
    
    # Try to find by name (case-insensitive)
    company = await db["companies"].find_one({
        "name": {"$regex": f"^{identifier}$", "$options": "i"}
    })
    if company:
        return company
    
    # Try to find by slugified name
    slugified = slugify(identifier)
    company = await db["companies"].find_one({"slug": slugified})
    if company:
        return company
    
    return None


async def _current_user_solved_ids(
    db: AsyncIOMotorDatabase, user_id: Optional[str]
) -> set[ObjectId]:
    if not user_id:
        return set()
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        return set()

    cursor = db["user_questions"].find(
        {"user_id": user_obj_id, "solved": True}, {"question_id": 1}
    )
    return {doc["question_id"] async for doc in cursor}


def _build_topic_filters(topics_param: str) -> list[dict]:
    filters: list[dict] = []
    for topic in topics_param.split(","):
        topic = topic.strip()
        if not topic:
            continue
        filters.append({"topics": {"$regex": topic, "$options": "i"}})
    return filters


@router.get("", response_model=QuestionListResponse)
async def list_questions(
    company_identifier: str,
    timeframe: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
    topics: Optional[str] = Query(default=None),
    patterns: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None, description="Search query for question title"),
    sort: Optional[str] = Query(default="priority", description="Sort by: priority, recency, difficulty, title"),
    cursor: Optional[str] = Query(default=None, description="Pagination cursor (question ID)"),
    limit: int = Query(default=50, ge=1, le=100, description="Number of results per page"),
    user_id: Optional[str] = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    List questions with advanced filtering, search, sorting, and cursor pagination.
    
    Query Parameters:
    - timeframe: Filter by recency (30_days, 90_days, more_than_six_months, all_time)
    - difficulty: Filter by difficulty (EASY, MEDIUM, HARD)
    - topics: Comma-separated topics (OR logic)
    - patterns: Comma-separated patterns (OR logic)
    - q: Search query for question title (case-insensitive)
    - sort: Sort order (priority, recency, difficulty, title)
    - cursor: Pagination cursor (question ID from previous response)
    - limit: Number of results per page (1-100, default 50)
    
    Returns:
    - questions: List of questions with solved status
    - next_cursor: Cursor for next page (null if no more results)
    - has_more: Boolean indicating if more results exist
    - total_count: Total number of questions matching filters
    
    Requirements: 4.9, 4.10, 4.11
    """
    # Find company by identifier (ID, slug, or name)
    company = await find_company_by_identifier(db, company_identifier)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    company_obj_id = company["_id"]
    query: dict = {"company_id": company_obj_id}
    
    # Apply filters
    if timeframe:
        query["timeframe"] = timeframe

    if difficulty:
        query["difficulty"] = difficulty.upper()

    if topics:
        topic_filters = _build_topic_filters(topics)
        if topic_filters:
            query["$or"] = topic_filters

    if patterns:
        # Filter by patterns (OR logic)
        pattern_list = [p.strip() for p in patterns.split(",") if p.strip()]
        if pattern_list:
            query["patterns"] = {"$in": pattern_list}
    
    # Search by title (case-insensitive)
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    
    # Cursor pagination
    if cursor:
        try:
            cursor_obj_id = ObjectId(cursor)
            query["_id"] = {"$gt": cursor_obj_id}
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cursor"
            )
    
    # Get total count for current filters
    total_count = await db["questions"].count_documents(query)
    
    # Determine sort order
    sort_mapping = {
        "priority": [("frequency", -1), ("updated_at", -1)],  # Higher frequency = higher priority
        "recency": [("updated_at", -1)],
        "difficulty": [("difficulty", 1), ("title", 1)],  # EASY < HARD < MEDIUM alphabetically
        "title": [("title", 1)]
    }
    sort_order = sort_mapping.get(sort, sort_mapping["priority"])
    
    # Get solved question IDs for user
    solved_ids = await _current_user_solved_ids(db, user_id)

    # Fetch questions with limit + 1 to check if more results exist
    cursor_db = db["questions"].find(query).sort(sort_order).limit(limit + 1)
    
    results: list[QuestionWithSolved] = []
    docs = await cursor_db.to_list(length=limit + 1)
    
    # Check if more results exist
    has_more = len(docs) > limit
    if has_more:
        docs = docs[:limit]  # Remove the extra document
    
    # Determine next cursor
    next_cursor = None
    if has_more and docs:
        next_cursor = str(docs[-1]["_id"])
    
    # Convert documents to response models
    for doc in docs:
        is_solved = doc["_id"] in solved_ids
        doc["id"] = str(doc["_id"])
        doc.pop("_id", None)
        for key, value in list(doc.items()):
            if isinstance(value, ObjectId):
                doc[key] = str(value)
        q_obj = QuestionWithSolved(**doc, solved=is_solved)
        results.append(q_obj)
    
    return {
        "questions": results,
        "next_cursor": next_cursor,
        "has_more": has_more,
        "total_count": total_count
    }




@router.get("/random", response_model=SmartRandomResponse, status_code=status.HTTP_200_OK)
async def random_question(
    company_identifier: str,
    timeframe: Optional[str] = Query(default="30_days"),
    update: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
    topics: Optional[str] = Query(default=None),
    patterns: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Smart random question selection.
    
    Uses intelligent algorithm weighted by:
    - Timeframe (recent questions prioritized)
    - Weakness (weak patterns boosted)
    - Difficulty (adaptive based on recent solve rate)
    - Novelty (penalize recently selected questions)
    
    Requirements: 5.1-5.11
    """
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="user_id required for smart random selection"
        )
    
    # Find company by identifier (ID, slug, or name)
    company = await find_company_by_identifier(db, company_identifier)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    try:
        company_obj_id = company["_id"]
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id"
        )
    
    # Build filters
    filters: dict = {"company_id": company_obj_id}
    
    if timeframe:
        filters["timeframe"] = timeframe
    
    if update:
        # format like 'Jan 25'
        parts = update.split()
        if len(parts) == 2:
            month_name, year_suffix = parts
            year_str = "20" + year_suffix
            try:
                from calendar import month_abbr
                month_number = list(month_abbr).index(month_name.capitalize())
                year = int(year_str)
                if 2000 <= year <= 2099 and month_number > 0:
                    start = date(year, month_number, 1)
                    # crude end_of_month
                    if month_number == 12:
                        end = date(year + 1, 1, 1)
                    else:
                        end = date(year, month_number + 1, 1)
                    start_dt = datetime.combine(start, datetime.min.time())
                    end_dt = datetime.combine(end, datetime.min.time())
                    filters["updated_at"] = {"$gte": start_dt, "$lt": end_dt}
            except Exception:
                pass
    
    if difficulty:
        filters["difficulty"] = difficulty.upper()
    
    if topics:
        topic_filters = _build_topic_filters(topics)
        if topic_filters:
            filters["$or"] = topic_filters
    
    if patterns:
        # Filter by patterns (OR logic)
        pattern_list = [p.strip() for p in patterns.split(",") if p.strip()]
        if pattern_list:
            filters["patterns"] = {"$in": pattern_list}
    
    # Use smart random service
    smart_random_service = SmartRandomService(db)
    selected_question = await smart_random_service.select_smart_random(
        user_id=user_obj_id,
        filters=filters
    )
    
    if not selected_question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No unsolved questions matching filters"
        )
    
    # Convert ObjectIds to strings for serialization
    selected_question["id"] = str(selected_question["_id"])
    selected_question.pop("_id", None)
    if "company_id" in selected_question and selected_question["company_id"]:
        selected_question["company_id"] = str(selected_question["company_id"])
    
    return SmartRandomResponse(**selected_question)


@router.get("/random.json", response_model=SmartRandomResponse, status_code=status.HTTP_200_OK)
async def random_question_json(
    company_identifier: str,
    timeframe: Optional[str] = Query(default="30_days"),
    update: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
    topics: Optional[str] = Query(default=None),
    patterns: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Alias for /companies/{company_identifier}/questions/random with .json extension for frontend compatibility.
    
    Uses smart random selection algorithm.
    Requirements: 5.1-5.11
    """
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="user_id required for smart random selection"
        )
    
    # Find company by identifier (ID, slug, or name)
    company = await find_company_by_identifier(db, company_identifier)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    try:
        company_obj_id = company["_id"]
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id"
        )
    
    # Build filters
    filters: dict = {"company_id": company_obj_id}
    
    if timeframe:
        filters["timeframe"] = timeframe
    
    if update:
        # format like 'Jan 25'
        parts = update.split()
        if len(parts) == 2:
            month_name, year_suffix = parts
            year_str = "20" + year_suffix
            try:
                from calendar import month_abbr
                month_number = list(month_abbr).index(month_name.capitalize())
                year = int(year_str)
                if 2000 <= year <= 2099 and month_number > 0:
                    start = date(year, month_number, 1)
                    # crude end_of_month
                    if month_number == 12:
                        end = date(year + 1, 1, 1)
                    else:
                        end = date(year, month_number + 1, 1)
                    start_dt = datetime.combine(start, datetime.min.time())
                    end_dt = datetime.combine(end, datetime.min.time())
                    filters["updated_at"] = {"$gte": start_dt, "$lt": end_dt}
            except Exception:
                pass
    
    if difficulty:
        filters["difficulty"] = difficulty.upper()
    
    if topics:
        topic_filters = _build_topic_filters(topics)
        if topic_filters:
            filters["$or"] = topic_filters
    
    if patterns:
        # Filter by patterns (OR logic)
        pattern_list = [p.strip() for p in patterns.split(",") if p.strip()]
        if pattern_list:
            filters["patterns"] = {"$in": pattern_list}
    
    # Use smart random service
    smart_random_service = SmartRandomService(db)
    selected_question = await smart_random_service.select_smart_random(
        user_id=user_obj_id,
        filters=filters
    )
    
    if not selected_question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No unsolved questions matching filters"
        )
    
    # Convert ObjectIds to strings for serialization
    selected_question["id"] = str(selected_question["_id"])
    selected_question.pop("_id", None)
    if "company_id" in selected_question and selected_question["company_id"]:
        selected_question["company_id"] = str(selected_question["company_id"])
    
    return SmartRandomResponse(**selected_question)


@router.post("/{question_id}/solve")
async def solve_question(
    company_id: str,  # kept for route parity, not used directly
    question_id: str,
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Mark a question as solved.
    
    Accepts:
        - user_id: Required user identifier
        - time_spent_seconds: Optional time spent on the question (default: 0)
    
    Returns:
        - solved: Boolean confirmation
        - question_id: The question ID
        - streak_updated: Whether the streak was updated
        - new_streak: Current streak count
        - milestone_reached: Milestone if reached (7, 30, or 100), otherwise null
    
    Side effects:
        - Updates user_questions record (solved status, attempts, time_spent)
        - Updates user streak (current_streak, longest_streak, last_solve_date)
        - Weak topics are recalculated on-demand via analytics endpoint
    
    Requirements: 9.1-9.7, 10.1-10.7, 11.1-11.7
    """
    user_id = body.get("user_id")
    time_spent_seconds = body.get("time_spent_seconds", 0)
    
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
        "last_attempt_at": now,  # Track attempt on solve
    }
    
    # Increment attempts counter (Requirement 11.1)
    inc_doc = {"attempts": 1}
    
    # Add time_spent_seconds if provided (Requirement 9.1)
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
            "$inc": inc_doc,
            "$setOnInsert": set_on_insert_doc,
        },
        upsert=True,
    )
    
    # Update streak (Requirements 10.1-10.7)
    streak_service = StreakService(db)
    user_timezone = user_doc.get("timezone", "UTC")
    streak_info = await streak_service.update_streak_on_solve(
        user_id=user_obj_id,
        timezone=user_timezone
    )

    # Note: Weak topics are recalculated on-demand via the analytics endpoint
    # (Requirements 11.1-11.7). The updated solve status will be reflected
    # in the next analytics request.

    return {
        "solved": True,
        "question_id": question_id,
        "streak_updated": streak_info["streak_updated"],
        "new_streak": streak_info["new_streak"],
        "milestone_reached": streak_info["milestone_reached"]
    }


@router.delete("/{question_id}/solve")
async def unsolve_question(
    company_id: str,  # kept for route parity, not used
    question_id: str,
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Unmark a question as solved.
    
    Accepts:
        - user_id: Required user identifier
    
    Returns:
        - solved: Boolean confirmation (false)
        - question_id: The question ID
        - streak_updated: Whether the streak was recalculated
        - new_streak: Current streak count after recalculation
    
    Side effects:
        - Updates user_questions record (solved status set to false, attempts incremented)
        - Recalculates user streak based on remaining solved questions
        - Weak topics are recalculated on-demand via analytics endpoint
    
    Requirements: 9.1-9.7, 10.1-10.7, 11.1-11.7
    """
    user_id = body.get("user_id")
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
    
    result = await db["user_questions"].update_one(
        {"user_id": user_obj_id, "question_id": question_obj_id},
        {
            "$set": {
                "solved": False,
                "last_attempt_at": now,
                "updated_at": now
            },
            "$inc": {"attempts": 1}  # Track attempt on unsolve (Requirement 11.1)
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    # Update streak after unsolving (Requirements 10.1-10.7)
    user_doc = await db["users"].find_one({"_id": user_obj_id}, {"timezone": 1})
    if user_doc:
        streak_service = StreakService(db)
        user_timezone = user_doc.get("timezone", "UTC")
        streak_info = await streak_service.update_streak_on_unsolve(
            user_id=user_obj_id,
            timezone=user_timezone
        )
        
        # Note: Weak topics are recalculated on-demand via the analytics endpoint
        # (Requirements 11.1-11.7). The updated solve status will be reflected
        # in the next analytics request.
        
        return {
            "solved": False,
            "question_id": question_id,
            "streak_updated": streak_info["streak_updated"],
            "new_streak": streak_info["new_streak"]
        }

    return {"solved": False, "question_id": question_id}


@router.post("/{question_id}/track-focus")
async def track_focus_time(
    company_id: str,  # kept for route parity
    question_id: str,
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Track focus mode time for attempt counting.
    
    An attempt is recorded when user enters focus mode and stays ≥60 seconds.
    This endpoint should be called by the frontend when the user has been in
    focus mode for at least 60 seconds.
    
    Requirements: 11.1
    """
    user_id = body.get("user_id")
    time_spent_seconds = body.get("time_spent_seconds", 0)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing user_id",
        )
    
    # Only track if time spent is >= 60 seconds
    if time_spent_seconds < 60:
        return {
            "tracked": False,
            "message": "Focus time must be at least 60 seconds to count as an attempt"
        }
    
    try:
        user_obj_id = ObjectId(user_id)
        question_obj_id = ObjectId(question_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ids",
        )
    
    now = datetime.utcnow()
    
    # Check if we've already tracked an attempt for this focus session
    # We'll use a simple heuristic: if last_attempt_at is within the last 5 minutes,
    # don't increment again (to avoid double-counting)
    existing = await db["user_questions"].find_one(
        {"user_id": user_obj_id, "question_id": question_obj_id}
    )
    
    should_increment = True
    if existing and existing.get("last_attempt_at"):
        time_since_last = (now - existing["last_attempt_at"]).total_seconds()
        if time_since_last < 300:  # 5 minutes
            should_increment = False
    
    update_doc = {
        "$set": {
            "last_attempt_at": now,
            "updated_at": now
        },
        "$setOnInsert": {
            "user_id": user_obj_id,
            "question_id": question_obj_id,
            "solved": False,
            "created_at": now
        }
    }
    
    if should_increment:
        update_doc["$inc"] = {"attempts": 1}
    
    # Add time spent
    if time_spent_seconds > 0:
        if existing and "time_spent_seconds" in existing:
            update_doc["$set"]["time_spent_seconds"] = existing["time_spent_seconds"] + time_spent_seconds
        else:
            update_doc["$set"]["time_spent_seconds"] = time_spent_seconds
    
    await db["user_questions"].update_one(
        {"user_id": user_obj_id, "question_id": question_obj_id},
        update_doc,
        upsert=True
    )
    
    return {
        "tracked": True,
        "attempt_incremented": should_increment,
        "time_spent_seconds": time_spent_seconds
    }



