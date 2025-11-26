from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db import get_database


router = APIRouter(tags=["users"])


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


