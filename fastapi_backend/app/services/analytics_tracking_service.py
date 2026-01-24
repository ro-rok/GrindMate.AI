"""
Analytics Tracking Service

Tracks AI tutor usage, rate limits, costs, and user engagement metrics.
Provides insights for monitoring and optimization.
"""

from datetime import datetime, timedelta, UTC
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId


class AnalyticsTrackingService:
    """Service for tracking AI tutor analytics and metrics"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def track_tutor_usage(
        self,
        user_id: ObjectId,
        question_id: ObjectId,
        session_id: ObjectId,
        event_type: str,
        metadata: Dict[str, Any]
    ) -> None:
        """
        Track AI tutor usage event
        
        Args:
            user_id: User ID
            question_id: Question ID
            session_id: Session ID
            event_type: Type of event (chat, hint_unlock, feedback, etc.)
            metadata: Additional event metadata
        """
        event = {
            "user_id": user_id,
            "question_id": question_id,
            "session_id": session_id,
            "event_type": event_type,
            "metadata": metadata,
            "timestamp": datetime.now(UTC),
            "expires_at": datetime.now(UTC) + timedelta(days=90)  # 90 day retention
        }
        
        await self.db["tutor_analytics_events"].insert_one(event)
    
    async def track_rate_limit_hit(
        self,
        user_id: ObjectId,
        limit_type: str,
        tokens_used: int,
        requests_used: int
    ) -> None:
        """
        Track when a user hits rate limit
        
        Args:
            user_id: User ID
            limit_type: Type of limit hit (tokens, requests, both)
            tokens_used: Total tokens used
            requests_used: Total requests used
        """
        event = {
            "user_id": user_id,
            "event_type": "rate_limit_hit",
            "limit_type": limit_type,
            "tokens_used": tokens_used,
            "requests_used": requests_used,
            "timestamp": datetime.now(UTC),
            "expires_at": datetime.now(UTC) + timedelta(days=90)
        }
        
        await self.db["tutor_analytics_events"].insert_one(event)
    
    async def track_api_cost(
        self,
        user_id: ObjectId,
        session_id: ObjectId,
        tokens_used: int,
        estimated_cost: float,
        is_byok: bool
    ) -> None:
        """
        Track API usage and estimated costs
        
        Args:
            user_id: User ID
            session_id: Session ID
            tokens_used: Number of tokens used
            estimated_cost: Estimated cost in USD
            is_byok: Whether user is using BYOK
        """
        event = {
            "user_id": user_id,
            "session_id": session_id,
            "event_type": "api_usage",
            "tokens_used": tokens_used,
            "estimated_cost": estimated_cost,
            "is_byok": is_byok,
            "timestamp": datetime.now(UTC),
            "expires_at": datetime.now(UTC) + timedelta(days=90)
        }
        
        await self.db["tutor_analytics_events"].insert_one(event)
    
    async def get_user_engagement_metrics(
        self,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get user engagement metrics for AI tutor
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Dict with engagement metrics
        """
        start_date = datetime.now(UTC) - timedelta(days=days)
        
        # Total active users
        active_users = await self.db["tutor_analytics_events"].distinct(
            "user_id",
            {"timestamp": {"$gte": start_date}}
        )
        
        # Total sessions
        total_sessions = await self.db["tutor_sessions"].count_documents({
            "session_start_time": {"$gte": start_date}
        })
        
        # Total chat messages
        total_chats = await self.db["tutor_analytics_events"].count_documents({
            "event_type": "chat",
            "timestamp": {"$gte": start_date}
        })
        
        # Total hints unlocked
        total_hints = await self.db["tutor_analytics_events"].count_documents({
            "event_type": "hint_unlock",
            "timestamp": {"$gte": start_date}
        })
        
        # Average session length
        pipeline = [
            {"$match": {"session_start_time": {"$gte": start_date}}},
            {"$group": {
                "_id": None,
                "avg_messages": {"$avg": "$messages_count"},
                "avg_hints": {"$avg": "$hints_used"},
                "avg_time": {"$avg": "$time_spent_seconds"}
            }}
        ]
        avg_stats = await self.db["tutor_sessions"].aggregate(pipeline).to_list(1)
        
        # Feedback distribution
        feedback_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$group": {
                "_id": "$rating",
                "count": {"$sum": 1}
            }}
        ]
        feedback_dist = await self.db["tutor_feedback"].aggregate(feedback_pipeline).to_list(10)
        
        return {
            "period_days": days,
            "active_users": len(active_users),
            "total_sessions": total_sessions,
            "total_chats": total_chats,
            "total_hints": total_hints,
            "avg_messages_per_session": avg_stats[0]["avg_messages"] if avg_stats else 0,
            "avg_hints_per_session": avg_stats[0]["avg_hints"] if avg_stats else 0,
            "avg_time_per_session_seconds": avg_stats[0]["avg_time"] if avg_stats else 0,
            "feedback_distribution": {
                item["_id"]: item["count"] for item in feedback_dist
            }
        }
    
    async def get_rate_limit_metrics(
        self,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get rate limit metrics
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Dict with rate limit metrics
        """
        start_date = datetime.now(UTC) - timedelta(days=days)
        
        # Users who hit rate limits
        rate_limit_hits = await self.db["tutor_analytics_events"].count_documents({
            "event_type": "rate_limit_hit",
            "timestamp": {"$gte": start_date}
        })
        
        # Unique users who hit limits
        users_hit_limits = await self.db["tutor_analytics_events"].distinct(
            "user_id",
            {
                "event_type": "rate_limit_hit",
                "timestamp": {"$gte": start_date}
            }
        )
        
        # Total active users for comparison
        total_active = await self.db["tutor_analytics_events"].distinct(
            "user_id",
            {"timestamp": {"$gte": start_date}}
        )
        
        # Breakdown by limit type
        limit_type_pipeline = [
            {
                "$match": {
                    "event_type": "rate_limit_hit",
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": "$limit_type",
                    "count": {"$sum": 1}
                }
            }
        ]
        limit_types = await self.db["tutor_analytics_events"].aggregate(limit_type_pipeline).to_list(10)
        
        return {
            "period_days": days,
            "total_rate_limit_hits": rate_limit_hits,
            "users_hit_limits": len(users_hit_limits),
            "total_active_users": len(total_active),
            "percentage_hit_limits": (len(users_hit_limits) / len(total_active) * 100) if total_active else 0,
            "limit_type_breakdown": {
                item["_id"]: item["count"] for item in limit_types
            }
        }
    
    async def get_cost_metrics(
        self,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get API cost metrics
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Dict with cost metrics
        """
        start_date = datetime.now(UTC) - timedelta(days=days)
        
        # Total tokens and costs
        pipeline = [
            {
                "$match": {
                    "event_type": "api_usage",
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_tokens": {"$sum": "$tokens_used"},
                    "total_cost": {"$sum": "$estimated_cost"},
                    "server_tokens": {
                        "$sum": {
                            "$cond": [{"$eq": ["$is_byok", False]}, "$tokens_used", 0]
                        }
                    },
                    "server_cost": {
                        "$sum": {
                            "$cond": [{"$eq": ["$is_byok", False]}, "$estimated_cost", 0]
                        }
                    },
                    "byok_tokens": {
                        "$sum": {
                            "$cond": [{"$eq": ["$is_byok", True]}, "$tokens_used", 0]
                        }
                    }
                }
            }
        ]
        cost_stats = await self.db["tutor_analytics_events"].aggregate(pipeline).to_list(1)
        
        # Daily breakdown
        daily_pipeline = [
            {
                "$match": {
                    "event_type": "api_usage",
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$timestamp"
                        }
                    },
                    "tokens": {"$sum": "$tokens_used"},
                    "cost": {"$sum": "$estimated_cost"}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        daily_costs = await self.db["tutor_analytics_events"].aggregate(daily_pipeline).to_list(days)
        
        stats = cost_stats[0] if cost_stats else {}
        
        return {
            "period_days": days,
            "total_tokens": stats.get("total_tokens", 0),
            "total_cost_usd": round(stats.get("total_cost", 0), 2),
            "server_tokens": stats.get("server_tokens", 0),
            "server_cost_usd": round(stats.get("server_cost", 0), 2),
            "byok_tokens": stats.get("byok_tokens", 0),
            "cost_savings_from_byok_usd": round(stats.get("server_cost", 0) * 0.25, 2),  # Estimated
            "daily_breakdown": [
                {
                    "date": item["_id"],
                    "tokens": item["tokens"],
                    "cost_usd": round(item["cost"], 2)
                }
                for item in daily_costs
            ]
        }
    
    async def get_database_performance_metrics(self) -> Dict[str, Any]:
        """
        Get database performance metrics
        
        Returns:
            Dict with performance metrics
        """
        # Collection sizes
        collections = [
            "tutor_sessions",
            "chat_messages",
            "tutor_feedback",
            "tutor_analytics_events"
        ]
        
        collection_stats = {}
        for coll_name in collections:
            stats = await self.db.command("collStats", coll_name)
            collection_stats[coll_name] = {
                "count": stats.get("count", 0),
                "size_mb": round(stats.get("size", 0) / (1024 * 1024), 2),
                "avg_obj_size_kb": round(stats.get("avgObjSize", 0) / 1024, 2) if stats.get("avgObjSize") else 0
            }
        
        # Index usage (if available)
        # Note: This requires MongoDB 3.2+
        try:
            index_stats = {}
            for coll_name in collections:
                pipeline = [{"$indexStats": {}}]
                indexes = await self.db[coll_name].aggregate(pipeline).to_list(100)
                index_stats[coll_name] = [
                    {
                        "name": idx["name"],
                        "accesses": idx.get("accesses", {}).get("ops", 0)
                    }
                    for idx in indexes
                ]
        except Exception:
            index_stats = {"error": "Index stats not available"}
        
        return {
            "collection_stats": collection_stats,
            "index_stats": index_stats
        }
    
    async def get_feedback_analysis(
        self,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get detailed feedback analysis
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Dict with feedback analysis
        """
        start_date = datetime.now(UTC) - timedelta(days=days)
        
        # Overall feedback stats
        total_feedback = await self.db["tutor_feedback"].count_documents({
            "timestamp": {"$gte": start_date}
        })
        
        # Rating distribution
        rating_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$group": {
                "_id": "$rating",
                "count": {"$sum": 1}
            }}
        ]
        ratings = await self.db["tutor_feedback"].aggregate(rating_pipeline).to_list(10)
        
        # Feedback with text
        feedback_with_text = await self.db["tutor_feedback"].count_documents({
            "timestamp": {"$gte": start_date},
            "feedback_text": {"$exists": True, "$ne": None, "$ne": ""}
        })
        
        # Most common issues (from negative feedback)
        negative_feedback = await self.db["tutor_feedback"].find({
            "timestamp": {"$gte": start_date},
            "rating": "negative",
            "feedback_text": {"$exists": True, "$ne": None, "$ne": ""}
        }).limit(50).to_list(50)
        
        # Satisfaction rate
        positive_count = sum(r["count"] for r in ratings if r["_id"] == "positive")
        satisfaction_rate = (positive_count / total_feedback * 100) if total_feedback > 0 else 0
        
        return {
            "period_days": days,
            "total_feedback": total_feedback,
            "rating_distribution": {
                item["_id"]: item["count"] for item in ratings
            },
            "feedback_with_text": feedback_with_text,
            "satisfaction_rate_percent": round(satisfaction_rate, 1),
            "recent_negative_feedback": [
                {
                    "session_id": str(fb["session_id"]),
                    "text": fb["feedback_text"],
                    "timestamp": fb["timestamp"].isoformat()
                }
                for fb in negative_feedback[:10]
            ]
        }
    
    async def get_comprehensive_dashboard(
        self,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get comprehensive analytics dashboard
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Dict with all metrics
        """
        engagement = await self.get_user_engagement_metrics(days)
        rate_limits = await self.get_rate_limit_metrics(days)
        costs = await self.get_cost_metrics(days)
        feedback = await self.get_feedback_analysis(days)
        performance = await self.get_database_performance_metrics()
        
        return {
            "period_days": days,
            "generated_at": datetime.now(UTC).isoformat(),
            "engagement": engagement,
            "rate_limits": rate_limits,
            "costs": costs,
            "feedback": feedback,
            "database_performance": performance
        }


# Singleton instance
_analytics_service: Optional[AnalyticsTrackingService] = None


def get_analytics_tracking_service(db: AsyncIOMotorDatabase) -> AnalyticsTrackingService:
    """Get or create analytics tracking service instance"""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsTrackingService(db)
    return _analytics_service
