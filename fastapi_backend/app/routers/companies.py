from typing import List

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db import get_database
from ..models.company import CompanyPublic
from ..services.refresh_csv import refresh_company_questions


router = APIRouter(prefix="/companies", tags=["companies"])


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


@router.get("", response_model=List[CompanyPublic])
async def list_companies(db: AsyncIOMotorDatabase = Depends(get_database)):
    cursor = db["companies"].find({}, sort=[("name", 1)])
    results: list[CompanyPublic] = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        # Generate slug if not present
        if not doc.get("slug"):
            doc["slug"] = slugify(doc.get("name", ""))
        results.append(CompanyPublic(**doc))
    return results


@router.get("/{company_identifier}", response_model=CompanyPublic)
async def get_company(
    company_identifier: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    company = await find_company_by_identifier(db, company_identifier)
    
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    # Trigger import if no questions exist yet
    questions_count = await db["questions"].count_documents(
        {"company_id": company["_id"]}
    )
    if questions_count == 0:
        background_tasks.add_task(refresh_company_questions, str(company["_id"]))

    company["id"] = str(company["_id"])
    # Generate slug if not present
    if not company.get("slug"):
        company["slug"] = slugify(company.get("name", ""))
    return CompanyPublic(**company)


@router.post("/{company_identifier}/refresh", status_code=status.HTTP_202_ACCEPTED)
async def refresh_company(
    company_identifier: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    company = await find_company_by_identifier(db, company_identifier)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    background_tasks.add_task(refresh_company_questions, str(company["_id"]))
    return


@router.get("/{company_identifier}/topics", response_model=list[str])
async def company_topics(
    company_identifier: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    company = await find_company_by_identifier(db, company_identifier)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

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


