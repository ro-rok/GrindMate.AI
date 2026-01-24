"""
Smart Random Question Selection Router

Provides endpoint for intelligent question selection based on user history and weak topics.

Requirements: 9.1-9.11, 13.7, 13.8
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from ..auth import CurrentUser
from ..db import get_database
from ..services.smart_random import SmartRandomService


router = APIRouter(prefix="/questions", tags=["questions"])


# Response Model for GET /api/questions/random/smart
class SmartRandomResponse(BaseModel):
    question_id: str
    title: str
    difficulty: str
    company_tags: List[str] = []
    topic_tags: List[str] = []
    selection_reason: str
    priority_score: float
    link: str
    frequency: Optional[int] = None


@router.get(
    "/random/smart",
    response_model=SmartRandomResponse,
    status_code=status.HTTP_200_OK
)
async def get_smart_random_question(
    current_user: CurrentUser,
    include_solved: bool = Query(default=False, description="Include solved questions"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get a smart random question based on user history and weak topics.
    
    Requirements: 9.1-9.11, 13.7, 13.8
    
    Algorithm:
    1. Identify companies from last 3 attempted questions
    2. Filter questions by those companies
    3. Exclude solved questions (unless include_solved=True)
    4. Exclude questions attempted in last 7 days
    5. Calculate priority scores with weak topic bonus (+3) and recency penalty (-5)
    6. Select from top 20% with weighted random
    7. Fallback to truly random if no matches
    
    Query Parameters:
    - include_solved: Whether to include solved questions (default False)
    
    Returns:
    - HTTP 200: Selected question with selection_reason and priority_score
    - HTTP 404: No questions available
    - HTTP 500: Internal server error
    """
    # Extract user_id from JWT token (Requirement 13.7)
    user_id = current_user.id
    
    # Create service instance
    smart_random_service = SmartRandomService(db)
    
    try:
        # Call SmartRandomService.select_smart_random_v2 (Requirements 9.1-9.11)
        question = await smart_random_service.select_smart_random_v2(
            user_id=user_id,
            include_solved=include_solved
        )
        
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error_message": "No questions available"
                }
            )
        
        # Get company tags
        company_tags = []
        if question.get("company_id"):
            company = await db["companies"].find_one({"_id": question["company_id"]})
            if company:
                company_tags.append(company.get("name", "Unknown"))
        
        # Get topic tags
        topic_tags = []
        if question.get("topics"):
            if isinstance(question["topics"], str):
                topic_tags = [t.strip() for t in question["topics"].split(",") if t.strip()]
            elif isinstance(question["topics"], list):
                topic_tags = question["topics"]
        
        # Add patterns as tags
        if question.get("patterns"):
            topic_tags.extend(question["patterns"])
        
        # Return question with selection_reason and HTTP 200 (Requirement 13.8)
        return SmartRandomResponse(
            question_id=str(question["_id"]),
            title=question.get("title", "Unknown"),
            difficulty=question.get("difficulty", "MEDIUM"),
            company_tags=company_tags,
            topic_tags=topic_tags[:5],  # Limit to 5 tags
            selection_reason=question.get("selection_reason", "Random selection"),
            priority_score=question.get("priority_score", 0.0),
            link=question.get("link", ""),
            frequency=question.get("frequency")
        )
        
    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_message": f"Failed to get smart random question: {str(e)}"
            }
        )
