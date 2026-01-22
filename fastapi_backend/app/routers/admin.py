"""
Admin API Router

Provides administrative endpoints for:
- GraphQL dump import (preview and commit)
- Company refresh operations
- Question management (search, edit, mark removed)
- Audit log viewing

All routes require admin authentication via verify_admin middleware.
Import endpoints have rate limiting (10 requests/hour).

Requirements: 14.1-14.9
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from ..db import get_database
from ..middleware.admin_middleware import AdminUser
from ..services.importer_service import ImporterService
from ..services.audit_logger_service import AuditLoggerService
from ..services.refresh_csv import refresh_company_questions
from ..models.question import QuestionPublic
from ..models.audit_log import AuditLog
from .admin_errors import ParsingError, ValidationError, DatabaseError
from pymongo.errors import PyMongoError


router = APIRouter(prefix="/api/admin", tags=["admin"])


# Rate limiting state for import endpoints (10 requests/hour per admin)
# Key: user_id, Value: list of timestamps
_import_rate_limits: Dict[str, List[datetime]] = {}


def check_import_rate_limit(user_id: str) -> bool:
    """
    Check if user has exceeded import rate limit (10 requests/hour).
    
    Returns True if allowed, False if rate limit exceeded.
    """
    now = datetime.utcnow()
    hour_ago = now.replace(minute=0, second=0, microsecond=0)
    
    # Clean up old timestamps
    if user_id in _import_rate_limits:
        _import_rate_limits[user_id] = [
            ts for ts in _import_rate_limits[user_id]
            if ts > hour_ago
        ]
    else:
        _import_rate_limits[user_id] = []
    
    # Check if limit exceeded
    if len(_import_rate_limits[user_id]) >= 10:
        return False
    
    # Add current timestamp
    _import_rate_limits[user_id].append(now)
    return True


# Request/Response Models

class ImportRequest(BaseModel):
    """Request body for import endpoints"""
    raw: str = Field(..., description="Raw GraphQL dump text")
    list_name: str = Field(..., description="Name of the list being imported")
    source: str = Field(default="leetcode_favorites", description="Source identifier")


class CompanyImportRequest(BaseModel):
    """Request body for company-specific GraphQL import"""
    raw: str = Field(..., description="Raw GraphQL dump text")
    company_id: str = Field(..., description="Company ID to associate questions with")
    timeframe: str = Field(..., description="Timeframe (30_days, 60_days, 90_days, more_than_six_months, all_time)")
    exclude_solved: bool = Field(default=False, description="Exclude questions with status SOLVED (default: False - includes all)")


class PreviewResponse(BaseModel):
    """Response for import preview"""
    counts: Dict[str, int]
    duplicates: List[str]
    sample: List[Dict[str, Any]]
    errors: List[Dict[str, Any]]


class CommitResponse(BaseModel):
    """Response for import commit"""
    counts: Dict[str, int]
    import_id: str
    errors: List[Dict[str, Any]]


class CompanyRefreshResponse(BaseModel):
    """Response for company refresh"""
    company_id: str
    company_name: str
    counts: Dict[str, int]


class QuestionUpdateRequest(BaseModel):
    """Request body for question update"""
    difficulty: Optional[str] = None
    topics: Optional[List[Dict[str, str]]] = None
    frequency: Optional[int] = None
    acceptance_rate: Optional[float] = None


class QuestionsListResponse(BaseModel):
    """Response for questions list"""
    questions: List[Dict[str, Any]]
    pagination: Dict[str, Any]


class AuditLogsListResponse(BaseModel):
    """Response for audit logs list"""
    logs: List[Dict[str, Any]]
    pagination: Dict[str, Any]


# Helper function to extract IP and user agent
def get_request_context(request: Request) -> Dict[str, Optional[str]]:
    """Extract IP address and user agent from request"""
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent")
    }


@router.post("/import/graphql-dump/preview", response_model=PreviewResponse)
async def preview_graphql_import(
    request: Request,
    body: ImportRequest,
    admin_user: AdminUser,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Preview GraphQL dump import without database changes.
    
    Parses, normalizes, and validates questions, then returns preview
    with counts, sample questions, duplicates, and errors.
    
    Rate limited to 10 requests/hour per admin.
    
    Requirements: 14.1, 13.2
    """
    # Check rate limit
    if not check_import_rate_limit(admin_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 10 import requests per hour."
        )
    
    # Initialize services
    importer = ImporterService(db)
    audit_logger = AuditLoggerService(db)
    
    try:
        # Debug: Log input characteristics
        input_length = len(body.raw)
        input_start = body.raw[:100] if len(body.raw) > 100 else body.raw
        print(f"[DEBUG] Preview import - Input length: {input_length}, Start: {input_start}")
        
        # Call preview_import
        preview_result = await importer.preview_import(
            raw_input=body.raw,
            list_name=body.list_name,
            source=body.source
        )
        
        # Log audit event
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="import_preview",
            metadata={
                "list_name": body.list_name,
                "source": body.source,
                "counts": preview_result.counts
            },
            request=request
        )
        
        return PreviewResponse(
            counts=preview_result.counts,
            duplicates=preview_result.duplicates,
            sample=preview_result.sample,
            errors=preview_result.errors
        )
    
    except ValueError as e:
        # Parsing error - convert to ParsingError for proper handling
        error_msg = str(e)
        
        # Log error
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="import_preview_error",
            metadata={
                "list_name": body.list_name,
                "source": body.source,
                "error": "Parsing failed"
            },
            request=request
        )
        
        # Raise ParsingError for proper error response
        raise ParsingError(
            message="Could not parse input",
            hint=error_msg
        )
    
    except PyMongoError as e:
        # Database error
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="import_preview_error",
            metadata={
                "list_name": body.list_name,
                "source": body.source,
                "error": "Database error"
            },
            request=request
        )
        
        raise DatabaseError("Database operation failed")
    
    except Exception as e:
        # Unexpected error - log and re-raise
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="import_preview_error",
            metadata={
                "list_name": body.list_name,
                "source": body.source,
                "error": "Unexpected error"
            },
            request=request
        )
        
        # Re-raise to be caught by generic exception handler
        raise


@router.post("/import/graphql-dump/commit", response_model=CommitResponse)
async def commit_graphql_import(
    request: Request,
    body: ImportRequest,
    admin_user: AdminUser,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Commit GraphQL dump import with database upserts.
    
    Parses, normalizes, validates, and upserts questions into database.
    Creates import batch record and logs audit event.
    
    Rate limited to 10 requests/hour per admin.
    
    Requirements: 14.2, 13.3
    """
    # Check rate limit
    if not check_import_rate_limit(admin_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 10 import requests per hour."
        )
    
    # Initialize services
    importer = ImporterService(db)
    audit_logger = AuditLoggerService(db)
    
    try:
        # Call commit_import
        commit_result = await importer.commit_import(
            raw_input=body.raw,
            list_name=body.list_name,
            source=body.source,
            actor_user_id=admin_user.id,
            actor_email=admin_user.email
        )
        
        # Log audit event
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="import_commit",
            metadata={
                "list_name": body.list_name,
                "source": body.source,
                "counts": commit_result.counts,
                "import_id": commit_result.import_id
            },
            request=request
        )
        
        return CommitResponse(
            counts=commit_result.counts,
            import_id=commit_result.import_id,
            errors=commit_result.errors
        )
    
    except ValueError as e:
        # Parsing error - convert to ParsingError for proper handling
        error_msg = str(e)
        
        # Log error
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="import_commit_error",
            metadata={
                "list_name": body.list_name,
                "source": body.source,
                "error": "Parsing failed"
            },
            request=request
        )
        
        # Raise ParsingError for proper error response
        raise ParsingError(
            message="Could not parse input",
            hint=error_msg
        )
    
    except PyMongoError as e:
        # Database error
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="import_commit_error",
            metadata={
                "list_name": body.list_name,
                "source": body.source,
                "error": "Database error"
            },
            request=request
        )
        
        raise DatabaseError("Database operation failed")
    
    except Exception as e:
        # Unexpected error - log and re-raise
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="import_commit_error",
            metadata={
                "list_name": body.list_name,
                "source": body.source,
                "error": "Unexpected error"
            },
            request=request
        )
        
        # Re-raise to be caught by generic exception handler
        raise


@router.post("/import/graphql-dump/company-preview", response_model=PreviewResponse)
async def preview_company_graphql_import(
    request: Request,
    body: CompanyImportRequest,
    admin_user: AdminUser,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Preview company-specific GraphQL dump import without database changes.
    
    Similar to populate button but uses GraphQL data instead of CSV.
    Includes ALL questions by default (SOLVED, TO_DO, ATTEMPTED).
    Set exclude_solved=true to filter out SOLVED questions.
    Associates questions with company_id and timeframe.
    
    Requirements: 14.1 (extended for company import)
    """
    # Check rate limit
    if not check_import_rate_limit(admin_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 10 import requests per hour."
        )
    
    # Validate company exists
    try:
        company_obj_id = ObjectId(body.company_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid company_id"
        )
    
    company = await db["companies"].find_one({"_id": company_obj_id})
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Validate timeframe
    valid_timeframes = ["30_days", "60_days", "90_days", "more_than_six_months", "all_time"]
    if body.timeframe not in valid_timeframes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timeframe. Must be one of: {', '.join(valid_timeframes)}"
        )
    
    # Initialize services
    importer = ImporterService(db)
    audit_logger = AuditLoggerService(db)
    
    try:
        # Debug: Log input characteristics
        input_length = len(body.raw)
        input_start = body.raw[:100] if len(body.raw) > 100 else body.raw
        print(f"[DEBUG] Company preview import - Input length: {input_length}, Start: {input_start}")
        
        # Call preview_import with company context
        preview_result = await importer.preview_company_import(
            raw_input=body.raw,
            company_id=body.company_id,
            timeframe=body.timeframe,
            exclude_solved=body.exclude_solved
        )
        
        # Log audit event
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="company_import_preview",
            metadata={
                "company_id": body.company_id,
                "company_name": company.get("name"),
                "timeframe": body.timeframe,
                "exclude_solved": body.exclude_solved,
                "counts": preview_result.counts
            },
            request=request
        )
        
        return PreviewResponse(
            counts=preview_result.counts,
            duplicates=preview_result.duplicates,
            sample=preview_result.sample,
            errors=preview_result.errors
        )
    
    except ValueError as e:
        # Parsing error
        error_msg = str(e)
        
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="company_import_preview_error",
            metadata={
                "company_id": body.company_id,
                "timeframe": body.timeframe,
                "error": "Parsing failed"
            },
            request=request
        )
        
        raise ParsingError(
            message="Could not parse input",
            hint=error_msg
        )
    
    except PyMongoError as e:
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="company_import_preview_error",
            metadata={
                "company_id": body.company_id,
                "timeframe": body.timeframe,
                "error": "Database error"
            },
            request=request
        )
        
        raise DatabaseError("Database operation failed")
    
    except Exception as e:
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="company_import_preview_error",
            metadata={
                "company_id": body.company_id,
                "timeframe": body.timeframe,
                "error": "Unexpected error"
            },
            request=request
        )
        
        raise


@router.post("/import/graphql-dump/company-commit", response_model=CommitResponse)
async def commit_company_graphql_import(
    request: Request,
    body: CompanyImportRequest,
    admin_user: AdminUser,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Commit company-specific GraphQL dump import with database upserts.
    
    Similar to populate button but uses GraphQL data instead of CSV.
    Includes ALL questions by default (SOLVED, TO_DO, ATTEMPTED).
    Set exclude_solved=true to filter out SOLVED questions.
    Associates questions with company_id and timeframe.
    
    Requirements: 14.2 (extended for company import)
    """
    # Check rate limit
    if not check_import_rate_limit(admin_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 10 import requests per hour."
        )
    
    # Validate company exists
    try:
        company_obj_id = ObjectId(body.company_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid company_id"
        )
    
    company = await db["companies"].find_one({"_id": company_obj_id})
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    # Validate timeframe
    valid_timeframes = ["30_days", "60_days", "90_days", "more_than_six_months", "all_time"]
    if body.timeframe not in valid_timeframes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timeframe. Must be one of: {', '.join(valid_timeframes)}"
        )
    
    # Initialize services
    importer = ImporterService(db)
    audit_logger = AuditLoggerService(db)
    
    try:
        # Call commit_import with company context
        commit_result = await importer.commit_company_import(
            raw_input=body.raw,
            company_id=body.company_id,
            timeframe=body.timeframe,
            exclude_solved=body.exclude_solved,
            actor_user_id=admin_user.id,
            actor_email=admin_user.email
        )
        
        # Log audit event
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="company_import_commit",
            metadata={
                "company_id": body.company_id,
                "company_name": company.get("name"),
                "timeframe": body.timeframe,
                "exclude_solved": body.exclude_solved,
                "counts": commit_result.counts,
                "import_id": commit_result.import_id
            },
            request=request
        )
        
        return CommitResponse(
            counts=commit_result.counts,
            import_id=commit_result.import_id,
            errors=commit_result.errors
        )
    
    except ValueError as e:
        # Parsing error
        error_msg = str(e)
        
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="company_import_commit_error",
            metadata={
                "company_id": body.company_id,
                "timeframe": body.timeframe,
                "error": "Parsing failed"
            },
            request=request
        )
        
        raise ParsingError(
            message="Could not parse input",
            hint=error_msg
        )
    
    except PyMongoError as e:
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="company_import_commit_error",
            metadata={
                "company_id": body.company_id,
                "timeframe": body.timeframe,
                "error": "Database error"
            },
            request=request
        )
        
        raise DatabaseError("Database operation failed")
    
    except Exception as e:
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="company_import_commit_error",
            metadata={
                "company_id": body.company_id,
                "timeframe": body.timeframe,
                "error": "Unexpected error"
            },
            request=request
        )
        
        raise


@router.post("/companies/{company_id}/refresh", response_model=CompanyRefreshResponse)
async def refresh_company(
    request: Request,
    company_id: str,
    admin_user: AdminUser,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Trigger CSV refresh for a company.
    
    Fetches latest data from GitHub CSV and updates questions.
    Tracks counts of updated, inserted, and removed-marked questions.
    
    Requirements: 14.3, 13.5
    """
    try:
        # Validate company exists
        try:
            company_obj_id = ObjectId(company_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid company_id"
            )
        
        company = await db["companies"].find_one({"_id": company_obj_id})
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        
        company_name = company.get("name", "Unknown")
        
        # Track counts before refresh
        questions_before = await db["questions"].count_documents({"company_id": company_obj_id})
        
        # Call refresh function
        await refresh_company_questions(company_id)
        
        # Track counts after refresh
        questions_after = await db["questions"].count_documents({"company_id": company_obj_id})
        removed_count = await db["questions"].count_documents({
            "company_id": company_obj_id,
            "metadata.removed_on": {"$exists": True}
        })
        
        # Calculate counts (approximate)
        inserted = max(0, questions_after - questions_before)
        updated = questions_before - removed_count
        
        counts = {
            "updated": updated,
            "inserted": inserted,
            "removed_marked": removed_count
        }
        
        # Log audit event
        audit_logger = AuditLoggerService(db)
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="company_refresh",
            metadata={
                "company_id": company_id,
                "company_name": company_name,
                "counts": counts
            },
            request=request
        )
        
        return CompanyRefreshResponse(
            company_id=company_id,
            company_name=company_name,
            counts=counts
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    
    except PyMongoError as e:
        # Database error
        raise DatabaseError("Database operation failed during company refresh")
    
    except Exception as e:
        # Unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh company questions"
        )


@router.get("/questions", response_model=QuestionsListResponse)
async def list_questions(
    admin_user: AdminUser,
    q: Optional[str] = Query(None, description="Search by title/titleSlug/frontendId/link"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    paidOnly: Optional[bool] = Query(None, description="Filter by paid status"),
    status: Optional[str] = Query(None, description="Filter by status"),
    source: Optional[str] = Query(None, description="Filter by source"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Search and filter questions with pagination.
    
    Supports search by title, titleSlug, questionFrontendId, and link.
    Supports filters by difficulty, paidOnly, status, and source.
    
    Requirements: 14.4
    """
    try:
        # Build query
        query: Dict[str, Any] = {}
        
        # Search query
        if q:
            query["$or"] = [
                {"title": {"$regex": q, "$options": "i"}},
                {"titleSlug": {"$regex": q, "$options": "i"}},
                {"questionFrontendId": {"$regex": q, "$options": "i"}},
                {"link": {"$regex": q, "$options": "i"}}
            ]
        
        # Filters
        if difficulty:
            query["difficulty"] = difficulty.upper()
        
        if paidOnly is not None:
            query["paidOnly"] = paidOnly
        
        if status:
            query["status"] = status.upper()
        
        if source:
            query["source"] = source
        
        # Get total count
        total = await db["questions"].count_documents(query)
        
        # Calculate pagination
        skip = (page - 1) * limit
        pages = (total + limit - 1) // limit
        
        # Fetch questions
        cursor = db["questions"].find(query).sort("updated_at", -1).skip(skip).limit(limit)
        questions = []
        
        async for doc in cursor:
            # Convert ObjectIds to strings
            doc["id"] = str(doc["_id"])
            doc.pop("_id", None)
            if "company_id" in doc and doc["company_id"]:
                doc["company_id"] = str(doc["company_id"])
            questions.append(doc)
        
        return QuestionsListResponse(
            questions=questions,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": pages
            }
        )
    
    except PyMongoError as e:
        # Database error
        raise DatabaseError("Failed to retrieve questions")
    
    except Exception as e:
        # Unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list questions"
        )


@router.patch("/questions/{question_id}")
async def update_question(
    request: Request,
    question_id: str,
    body: QuestionUpdateRequest,
    admin_user: AdminUser,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Update question fields.
    
    Allows updating difficulty, topics, frequency, and acceptance_rate.
    Logs audit event with changes.
    
    Requirements: 14.5, 13.4
    """
    try:
        # Validate question exists
        try:
            question_obj_id = ObjectId(question_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid question_id"
            )
        
        question = await db["questions"].find_one({"_id": question_obj_id})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        # Build update document
        update_doc: Dict[str, Any] = {"updated_at": datetime.utcnow()}
        changes: Dict[str, Any] = {}
        
        if body.difficulty is not None:
            update_doc["difficulty"] = body.difficulty.upper()
            changes["difficulty"] = body.difficulty.upper()
        
        if body.topics is not None:
            update_doc["topics"] = body.topics
            changes["topics"] = body.topics
        
        if body.frequency is not None:
            update_doc["frequency"] = body.frequency
            changes["frequency"] = body.frequency
        
        if body.acceptance_rate is not None:
            update_doc["acceptance_rate"] = body.acceptance_rate
            changes["acceptance_rate"] = body.acceptance_rate
        
        # Update question
        await db["questions"].update_one(
            {"_id": question_obj_id},
            {"$set": update_doc}
        )
        
        # Log audit event
        audit_logger = AuditLoggerService(db)
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="question_edit",
            metadata={
                "question_id": question_id,
                "question_title": question.get("title"),
                "changes": changes
            },
            request=request
        )
        
        # Return updated question
        updated_question = await db["questions"].find_one({"_id": question_obj_id})
        updated_question["id"] = str(updated_question["_id"])
        updated_question.pop("_id", None)
        if "company_id" in updated_question and updated_question["company_id"]:
            updated_question["company_id"] = str(updated_question["company_id"])
        
        return updated_question
    
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    
    except PyMongoError as e:
        # Database error
        raise DatabaseError("Failed to update question")
    
    except Exception as e:
        # Unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update question"
        )


@router.post("/questions/{question_id}/mark-removed")
async def mark_question_removed(
    request: Request,
    question_id: str,
    admin_user: AdminUser,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Mark question as removed.
    
    Sets metadata.removed_on to current date.
    Logs audit event.
    
    Requirements: 14.6, 13.4
    """
    try:
        # Validate question exists
        try:
            question_obj_id = ObjectId(question_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid question_id"
            )
        
        question = await db["questions"].find_one({"_id": question_obj_id})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        # Update metadata
        metadata = question.get("metadata", {})
        metadata["removed_on"] = date.today().isoformat()
        
        await db["questions"].update_one(
            {"_id": question_obj_id},
            {"$set": {"metadata": metadata, "updated_at": datetime.utcnow()}}
        )
        
        # Log audit event
        audit_logger = AuditLoggerService(db)
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="question_mark_removed",
            metadata={
                "question_id": question_id,
                "question_title": question.get("title")
            },
            request=request
        )
        
        # Return updated question
        updated_question = await db["questions"].find_one({"_id": question_obj_id})
        updated_question["id"] = str(updated_question["_id"])
        updated_question.pop("_id", None)
        if "company_id" in updated_question and updated_question["company_id"]:
            updated_question["company_id"] = str(updated_question["company_id"])
        
        return updated_question
    
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    
    except PyMongoError as e:
        # Database error
        raise DatabaseError("Failed to mark question as removed")
    
    except Exception as e:
        # Unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark question as removed"
        )


@router.post("/questions/{question_id}/unremove")
async def unremove_question(
    request: Request,
    question_id: str,
    admin_user: AdminUser,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Unmark question as removed.
    
    Removes metadata.removed_on field.
    Logs audit event.
    
    Requirements: 14.7, 13.4
    """
    try:
        # Validate question exists
        try:
            question_obj_id = ObjectId(question_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid question_id"
            )
        
        question = await db["questions"].find_one({"_id": question_obj_id})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        # Update metadata
        metadata = question.get("metadata", {})
        metadata.pop("removed_on", None)
        
        await db["questions"].update_one(
            {"_id": question_obj_id},
            {"$set": {"metadata": metadata, "updated_at": datetime.utcnow()}}
        )
        
        # Log audit event
        audit_logger = AuditLoggerService(db)
        await audit_logger.log_action(
            actor_user_id=admin_user.id,
            actor_email=admin_user.email,
            action="question_unremove",
            metadata={
                "question_id": question_id,
                "question_title": question.get("title")
            },
            request=request
        )
        
        # Return updated question
        updated_question = await db["questions"].find_one({"_id": question_obj_id})
        updated_question["id"] = str(updated_question["_id"])
        updated_question.pop("_id", None)
        if "company_id" in updated_question and updated_question["company_id"]:
            updated_question["company_id"] = str(updated_question["company_id"])
        
        return updated_question
    
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    
    except PyMongoError as e:
        # Database error
        raise DatabaseError("Failed to unremove question")
    
    except Exception as e:
        # Unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unremove question"
        )


@router.get("/audit-logs", response_model=AuditLogsListResponse)
async def list_audit_logs(
    admin_user: AdminUser,
    action: Optional[str] = Query(None, description="Filter by action type"),
    actor: Optional[str] = Query(None, description="Filter by actor (user_id or email)"),
    start_date: Optional[str] = Query(None, description="Filter by start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (ISO format)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    List audit logs with filtering and pagination.
    
    Supports filters by action type, actor, and date range.
    Returns paginated results sorted by timestamp (newest first).
    
    Requirements: 14.8
    """
    try:
        # Build query
        query: Dict[str, Any] = {}
        
        if action:
            query["action"] = action
        
        if actor:
            # Search by user_id or email
            query["$or"] = [
                {"actor_user_id": actor},
                {"actor_email": {"$regex": actor, "$options": "i"}}
            ]
        
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                query["timestamp"] = {"$gte": start_dt}
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Use ISO format."
                )
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                if "timestamp" in query:
                    query["timestamp"]["$lte"] = end_dt
                else:
                    query["timestamp"] = {"$lte": end_dt}
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Use ISO format."
                )
        
        # Get total count
        total = await db["audit_logs"].count_documents(query)
        
        # Calculate pagination
        skip = (page - 1) * limit
        pages = (total + limit - 1) // limit
        
        # Fetch logs
        cursor = db["audit_logs"].find(query).sort("timestamp", -1).skip(skip).limit(limit)
        logs = []
        
        async for doc in cursor:
            # Convert ObjectIds to strings
            doc["id"] = str(doc["_id"])
            doc.pop("_id", None)
            logs.append(doc)
        
        return AuditLogsListResponse(
            logs=logs,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": pages
            }
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    
    except PyMongoError as e:
        # Database error
        raise DatabaseError("Failed to retrieve audit logs")
    
    except Exception as e:
        # Unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list audit logs"
        )
