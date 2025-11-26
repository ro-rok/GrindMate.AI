import random
from datetime import date, datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db import get_database
from ..models.question import QuestionPublic, QuestionWithSolved


router = APIRouter(prefix="/companies/{company_id}/questions", tags=["questions"])


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


@router.get("", response_model=List[QuestionWithSolved])
async def list_questions(
    company_id: str,
    timeframe: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
    topics: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    company_obj_id = ObjectId(company_id)
    query: dict = {"company_id": company_obj_id}
    if timeframe:
        query["timeframe"] = timeframe

    if difficulty:
        query["difficulty"] = difficulty.upper()

    if topics:
        topic_filters = _build_topic_filters(topics)
        if topic_filters:
            query["$or"] = topic_filters

    solved_ids = await _current_user_solved_ids(db, user_id)

    cursor = db["questions"].find(
        query,
        sort=[("frequency", 1), ("updated_at", 1)],
    )
    results: list[QuestionWithSolved] = []
    async for doc in cursor:
        # Check if solved before converting ObjectIds
        is_solved = doc["_id"] in solved_ids
        # Convert all ObjectId fields to strings for serialization
        doc["id"] = str(doc["_id"])
        # Remove _id field as it's not in the model
        doc.pop("_id", None)
        # Convert any remaining ObjectId fields
        for key, value in list(doc.items()):
            if isinstance(value, ObjectId):
                doc[key] = str(value)
        q = QuestionWithSolved(**doc, solved=is_solved)
        results.append(q)
    return results




@router.get("/random", response_model=QuestionPublic, status_code=status.HTTP_200_OK)
async def random_question(
    company_id: str,
    timeframe: Optional[str] = Query(default="30_days"),
    update: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
    topics: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    company_obj_id = ObjectId(company_id)
    query: dict = {"company_id": company_obj_id}
    if timeframe:
        query["timeframe"] = timeframe

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
                    query["updated_at"] = {"$gte": start_dt, "$lt": end_dt}
            except Exception:
                pass

    if difficulty:
        query["difficulty"] = difficulty.upper()

    if topics:
        topic_filters = _build_topic_filters(topics)
        if topic_filters:
            query["$or"] = topic_filters

    solved_ids = await _current_user_solved_ids(db, user_id)
    if solved_ids:
        query["_id"] = {"$nin": list(solved_ids)}

    count = await db["questions"].count_documents(query)
    if count == 0:
        return QuestionPublic.model_validate({})  # triggers 200 with empty object

    skip = random.randint(0, count - 1)
    docs = await db["questions"].find(query).skip(skip).limit(1).to_list(1)
    if not docs:
        raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)

    doc = docs[0]
    doc["id"] = str(doc["_id"])
    if "company_id" in doc and doc["company_id"]:
        doc["company_id"] = str(doc["company_id"])
    return QuestionPublic(**doc)


@router.get("/random.json", response_model=QuestionPublic, status_code=status.HTTP_200_OK)
async def random_question_json(
    company_id: str,
    timeframe: Optional[str] = Query(default="30_days"),
    update: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
    topics: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Alias for /companies/{company_id}/questions/random with .json extension for frontend compatibility"""
    company_obj_id = ObjectId(company_id)
    query: dict = {"company_id": company_obj_id}
    if timeframe:
        query["timeframe"] = timeframe

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
                    query["updated_at"] = {"$gte": start_dt, "$lt": end_dt}
            except Exception:
                pass

    if difficulty:
        query["difficulty"] = difficulty.upper()

    if topics:
        topic_filters = _build_topic_filters(topics)
        if topic_filters:
            query["$or"] = topic_filters

    solved_ids = await _current_user_solved_ids(db, user_id)
    if solved_ids:
        query["_id"] = {"$nin": list(solved_ids)}

    count = await db["questions"].count_documents(query)
    if count == 0:
        return QuestionPublic.model_validate({})  # triggers 200 with empty object

    skip = random.randint(0, count - 1)
    docs = await db["questions"].find(query).skip(skip).limit(1).to_list(1)
    if not docs:
        raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)

    doc = docs[0]
    doc["id"] = str(doc["_id"])
    if "company_id" in doc and doc["company_id"]:
        doc["company_id"] = str(doc["company_id"])
    return QuestionPublic(**doc)


@router.post("/{question_id}/solve")
async def solve_question(
    company_id: str,  # kept for route parity, not used directly
    question_id: str,
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
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

    # Get user and question to preserve legacy_id fields if they exist
    user_doc = await db["users"].find_one({"_id": user_obj_id}, {"legacy_id": 1})
    question_doc = await db["questions"].find_one({"_id": question_obj_id}, {"legacy_id": 1})
    
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

    return {"solved": True, "question_id": question_id}


@router.delete("/{question_id}/solve")
async def unsolve_question(
    company_id: str,  # kept for route parity, not used
    question_id: str,
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
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

    result = await db["user_questions"].update_one(
        {"user_id": user_obj_id, "question_id": question_obj_id},
        {"$set": {"solved": False}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return {"solved": False, "question_id": question_id}


