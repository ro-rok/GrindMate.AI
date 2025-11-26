from typing import List

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db import get_database
from ..models.company import CompanyPublic
from ..services.refresh_csv import refresh_company_questions


router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=List[CompanyPublic])
async def list_companies(db: AsyncIOMotorDatabase = Depends(get_database)):
    cursor = db["companies"].find({}, sort=[("name", 1)])
    results: list[CompanyPublic] = []
    async for doc in cursor:
        doc["id"] = doc["_id"]
        results.append(CompanyPublic(**doc))
    return results


@router.get("/{company_id}", response_model=CompanyPublic)
async def get_company(
    company_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    company = await db["companies"].find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    # Trigger import if no questions exist yet
    questions_count = await db["questions"].count_documents(
        {"company_id": company["_id"]}
    )
    if questions_count == 0:
        background_tasks.add_task(refresh_company_questions, str(company["_id"]))

    company["id"] = company["_id"]
    return CompanyPublic(**company)


@router.post("/{company_id}/refresh", status_code=status.HTTP_202_ACCEPTED)
async def refresh_company(
    company_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    company = await db["companies"].find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    background_tasks.add_task(refresh_company_questions, str(company["_id"]))
    return


@router.get("/{company_id}/topics", response_model=list[str])
async def company_topics(
    company_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    company = await db["companies"].find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    cursor = db["questions"].find(
        {"company_id": company["_id"]},
        {"topics": 1},
    )
    topic_list: list[str] = []
    async for doc in cursor:
        topics = doc.get("topics")
        if topics:
            topic_list.append(topics)

    unique_topics = sorted(
        {
            topic.strip()
            for topics in topic_list
            for topic in topics.split(",")
            if topic.strip()
        }
    )
    return list(unique_topics)


