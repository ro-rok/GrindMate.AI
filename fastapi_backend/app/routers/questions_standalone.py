from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db import get_database

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("/{question_id}/solve")
@router.post("/{question_id}/solve.json")
async def solve_question(
    question_id: str,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Standalone solve endpoint at /questions/{id}/solve (not nested under companies)"""
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

    return {"solved": False, "question_id": question_id}

