from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db import get_database
from ..services.chat import generate_chat_reply


router = APIRouter(tags=["chats"])


@router.post("/questions/{question_id}/chat")
async def chat_with_ai(
    question_id: str,
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    message = body.get("message")
    question_text = body.get("question_text")

    try:
        result = await generate_chat_reply(
            question_id=question_id,
            message=message,
            question_text=question_text,
            db=db,
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)
        )

    return result


@router.post("/questions/{question_id}/chat.json")
async def chat_with_ai_json(
    question_id: str,
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Alias for /questions/{question_id}/chat with .json extension for frontend compatibility"""
    message = body.get("message")
    question_text = body.get("question_text")

    try:
        result = await generate_chat_reply(
            question_id=question_id,
            message=message,
            question_text=question_text,
            db=db,
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)
        )

    return result


