"""
Analytics Admin Router

Provides admin endpoints for viewing AI tutor analytics and metrics.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Dict, Any, List

from ..db import get_database
from ..auth import CurrentUser, require_admin
from ..services.analytics_tracking_service import get_analytics_tracking_service


router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


class AnalyticsDashboardResponse(BaseModel):
    """Response model for analytics dashboard"""
    period_days: int
    generated_at: str
    engagement: Dict[str, Any]
    rate_limits: Dict[str, Any]
    costs: Dict[str, Any]
    database_performance: Dict[str, Any]


class EngagementMetricsResponse(BaseModel):
    """Response model for engagement metrics"""
    period_days: int
    active_users: int
    total_sessions: int
    total_chats: int
    total_hints: int
    avg_messages_per_session: float
    avg_hints_per_session: float
    avg_time_per_session_seconds: float


class RateLimitMetricsResponse(BaseModel):
    """Response model for rate limit metrics"""
    period_days: int
    total_rate_limit_hits: int
    users_hit_limits: int
    total_active_users: int
    percentage_hit_limits: float
    limit_type_breakdown: Dict[str, int]


class CostMetricsResponse(BaseModel):
    """Response model for cost metrics"""
    period_days: int
    total_tokens: int
    total_cost_usd: float
    server_tokens: int
    server_cost_usd: float
    byok_tokens: int
    cost_savings_from_byok_usd: float
    daily_breakdown: List[Dict[str, Any]]


class DatabasePerformanceResponse(BaseModel):
    """Response model for database performance"""
    collection_stats: Dict[str, Any]
    index_stats: Dict[str, Any]


@router.get(
    "/dashboard",
    response_model=AnalyticsDashboardResponse,
    dependencies=[Depends(require_admin)]
)
async def get_analytics_dashboard(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get comprehensive analytics dashboard
    
    Requires admin role.
    
    Returns:
    - User engagement metrics
    - Rate limit metrics
    - Cost metrics
    - Feedback analysis
    - Database performance
    """
    analytics_service = get_analytics_tracking_service(db)
    
    try:
        dashboard = await analytics_service.get_comprehensive_dashboard(days)
        return AnalyticsDashboardResponse(**dashboard)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate analytics dashboard: {str(e)}"
        )


@router.get(
    "/engagement",
    response_model=EngagementMetricsResponse,
    dependencies=[Depends(require_admin)]
)
async def get_engagement_metrics(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get user engagement metrics
    
    Requires admin role.
    
    Returns:
    - Active users count
    - Total sessions
    - Total chats and hints
    - Average session metrics
    - Feedback distribution
    """
    analytics_service = get_analytics_tracking_service(db)
    
    try:
        metrics = await analytics_service.get_user_engagement_metrics(days)
        return EngagementMetricsResponse(**metrics)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get engagement metrics: {str(e)}"
        )


@router.get(
    "/rate-limits",
    response_model=RateLimitMetricsResponse,
    dependencies=[Depends(require_admin)]
)
async def get_rate_limit_metrics(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get rate limit metrics
    
    Requires admin role.
    
    Returns:
    - Total rate limit hits
    - Users affected
    - Percentage of users hitting limits
    - Breakdown by limit type
    """
    analytics_service = get_analytics_tracking_service(db)
    
    try:
        metrics = await analytics_service.get_rate_limit_metrics(days)
        return RateLimitMetricsResponse(**metrics)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get rate limit metrics: {str(e)}"
        )


@router.get(
    "/costs",
    response_model=CostMetricsResponse,
    dependencies=[Depends(require_admin)]
)
async def get_cost_metrics(
    days: int = Query(default=30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get API cost metrics
    
    Requires admin role.
    
    Returns:
    - Total tokens used
    - Total costs
    - Server vs BYOK breakdown
    - Cost savings from BYOK
    - Daily breakdown
    """
    analytics_service = get_analytics_tracking_service(db)
    
    try:
        metrics = await analytics_service.get_cost_metrics(days)
        return CostMetricsResponse(**metrics)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cost metrics: {str(e)}"
        )


@router.get(
    "/database-performance",
    response_model=DatabasePerformanceResponse,
    dependencies=[Depends(require_admin)]
)
async def get_database_performance(
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get database performance metrics
    
    Requires admin role.
    
    Returns:
    - Collection sizes
    - Index usage statistics
    - Performance indicators
    """
    analytics_service = get_analytics_tracking_service(db)
    
    try:
        metrics = await analytics_service.get_database_performance_metrics()
        return DatabasePerformanceResponse(**metrics)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get database performance metrics: {str(e)}"
        )
