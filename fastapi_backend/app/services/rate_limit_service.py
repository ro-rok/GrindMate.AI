"""
Rate Limit Service

Handles token and request tracking per user per day with timezone-aware resets.
Enforces daily limits (25k tokens, 30 requests) and bypasses for BYOK mode users.
"""

from datetime import datetime, timedelta, UTC, date, time
from typing import Dict, Any, Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from ..db import get_database
from ..models.rate_limit import RateLimit
from ..utils.timezone import get_user_timezone, get_utc_timezone


class RateLimitService:
    """Service for managing user rate limits with timezone-aware resets"""
    
    # Default limits
    DEFAULT_TOKEN_LIMIT = 25000
    DEFAULT_REQUEST_LIMIT = 30
    
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db if db is not None else get_database()
    
    async def check_rate_limit(
        self,
        user_id: str,
        user_timezone: str = "UTC"
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if user has exceeded rate limits
        
        Args:
            user_id: User ID
            user_timezone: User's IANA timezone (e.g., "America/Los_Angeles")
            
        Returns:
            Tuple of (is_allowed, info_dict)
            - is_allowed: True if request can proceed
            - info_dict: Contains remaining budget and reset time
        """
        # Get user to check BYOK mode
        user = await self.db["users"].find_one({"_id": ObjectId(user_id)})
        
        # BYOK users bypass rate limits
        if user and user.get("byok_groq_key"):
            return True, {
                "tokens_remaining": float('inf'),
                "requests_remaining": float('inf'),
                "reset_at": None,
                "byok_mode": True
            }
        
        # Get user's local date
        user_tz = get_user_timezone(user_timezone)
        now_local = datetime.now(user_tz)
        today_local = now_local.date()
        
        # Get today's rate limit record
        rate_limit = await self.db["rate_limits"].find_one({
            "user_id": ObjectId(user_id),
            "date": today_local
        })
        
        # Calculate remaining budget
        tokens_used = rate_limit.get("tokens_used", 0) if rate_limit else 0
        requests_made = rate_limit.get("requests_made", 0) if rate_limit else 0
        
        tokens_remaining = self.DEFAULT_TOKEN_LIMIT - tokens_used
        requests_remaining = self.DEFAULT_REQUEST_LIMIT - requests_made
        
        # Calculate next reset time (midnight in user's timezone)
        next_reset = self._get_next_reset_time(user_timezone)
        
        # Check if limits exceeded
        is_allowed = tokens_remaining > 0 and requests_remaining > 0
        
        return is_allowed, {
            "tokens_remaining": max(0, tokens_remaining),
            "requests_remaining": max(0, requests_remaining),
            "reset_at": next_reset.isoformat(),
            "byok_mode": False
        }
    
    async def consume_budget(
        self,
        user_id: str,
        tokens_used: int,
        user_timezone: str = "UTC"
    ) -> Dict[str, Any]:
        """
        Consume rate budget for a user
        
        Args:
            user_id: User ID
            tokens_used: Number of tokens consumed
            user_timezone: User's IANA timezone
            
        Returns:
            Dict with updated remaining budget
        """
        # Get user's local date
        user_tz = get_user_timezone(user_timezone)
        now_local = datetime.now(user_tz)
        today_local = now_local.date()
        
        # Calculate expiry (48 hours from now for TTL index)
        expires_at = datetime.now(UTC) + timedelta(days=2)
        
        # Upsert rate limit record
        result = await self.db["rate_limits"].update_one(
            {
                "user_id": ObjectId(user_id),
                "date": today_local
            },
            {
                "$inc": {
                    "tokens_used": tokens_used,
                    "requests_made": 1
                },
                "$setOnInsert": {
                    "created_at": datetime.now(UTC),
                    "expires_at": expires_at
                }
            },
            upsert=True
        )
        
        # Get updated rate limit
        rate_limit = await self.db["rate_limits"].find_one({
            "user_id": ObjectId(user_id),
            "date": today_local
        })
        
        tokens_remaining = self.DEFAULT_TOKEN_LIMIT - rate_limit.get("tokens_used", 0)
        requests_remaining = self.DEFAULT_REQUEST_LIMIT - rate_limit.get("requests_made", 0)
        
        return {
            "tokens_remaining": max(0, tokens_remaining),
            "requests_remaining": max(0, requests_remaining),
            "reset_at": self._get_next_reset_time(user_timezone).isoformat()
        }
    
    async def get_rate_budget(
        self,
        user_id: str,
        user_timezone: str = "UTC"
    ) -> Dict[str, Any]:
        """
        Get current rate budget for a user
        
        Args:
            user_id: User ID
            user_timezone: User's IANA timezone
            
        Returns:
            Dict with tokens_remaining, requests_remaining, reset_at
        """
        # Check if BYOK user
        user = await self.db["users"].find_one({"_id": ObjectId(user_id)})
        if user and user.get("byok_groq_key"):
            return {
                "tokens_remaining": float('inf'),
                "requests_remaining": float('inf'),
                "reset_at": None,
                "byok_mode": True
            }
        
        # Get user's local date
        user_tz = get_user_timezone(user_timezone)
        now_local = datetime.now(user_tz)
        today_local = now_local.date()
        
        # Get today's rate limit record
        rate_limit = await self.db["rate_limits"].find_one({
            "user_id": ObjectId(user_id),
            "date": today_local
        })
        
        tokens_used = rate_limit.get("tokens_used", 0) if rate_limit else 0
        requests_made = rate_limit.get("requests_made", 0) if rate_limit else 0
        
        return {
            "tokens_remaining": max(0, self.DEFAULT_TOKEN_LIMIT - tokens_used),
            "requests_remaining": max(0, self.DEFAULT_REQUEST_LIMIT - requests_made),
            "reset_at": self._get_next_reset_time(user_timezone).isoformat(),
            "byok_mode": False
        }
    
    async def reset_budget_if_needed(
        self,
        user_id: str,
        user_timezone: str = "UTC"
    ) -> bool:
        """
        Check if budget should be reset (new day in user's timezone)
        
        This is called automatically by check_rate_limit, but can be
        called explicitly if needed.
        
        Args:
            user_id: User ID
            user_timezone: User's IANA timezone
            
        Returns:
            True if budget was reset, False otherwise
        """
        # Get user's local date
        user_tz = get_user_timezone(user_timezone)
        now_local = datetime.now(user_tz)
        today_local = now_local.date()
        
        # Check if there's a rate limit record for today
        rate_limit = await self.db["rate_limits"].find_one({
            "user_id": ObjectId(user_id),
            "date": today_local
        })
        
        # If no record for today, budget is effectively reset
        # (will be created on first use)
        return rate_limit is None
    
    def _get_next_reset_time(self, user_timezone: str) -> datetime:
        """
        Get next rate limit reset time (midnight in user's timezone)
        
        Args:
            user_timezone: User's IANA timezone
            
        Returns:
            Datetime of next reset in UTC
        """
        user_tz = get_user_timezone(user_timezone)
        now_local = datetime.now(user_tz)
        
        # Get tomorrow's date in user's timezone
        tomorrow_local = now_local.date() + timedelta(days=1)
        
        # Create midnight datetime in user's timezone
        midnight_local = datetime.combine(tomorrow_local, time.min, tzinfo=user_tz)
        
        # Convert to UTC for consistent storage/comparison
        utc_tz = get_utc_timezone()
        midnight_utc = midnight_local.astimezone(utc_tz)
        
        return midnight_utc
    
    async def update_user_rate_budget_fields(
        self,
        user_id: str,
        user_timezone: str = "UTC"
    ) -> None:
        """
        Update user's rate_budget_* fields in users collection
        
        This syncs the user document with current rate limit state.
        Called periodically or on demand.
        
        Args:
            user_id: User ID
            user_timezone: User's IANA timezone
        """
        budget = await self.get_rate_budget(user_id, user_timezone)
        
        await self.db["users"].update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "rate_budget_tokens": budget["tokens_remaining"],
                    "rate_budget_requests": budget["requests_remaining"],
                    "rate_budget_reset_at": datetime.fromisoformat(budget["reset_at"]) if budget["reset_at"] else None
                }
            }
        )
    
    # ========================================================================
    # AI Tutor Rate Limiting (Rolling 24-hour window)
    # ========================================================================
    
    async def check_tutor_rate_limit(
        self,
        user_id: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if user has exceeded AI tutor rate limits (rolling 24-hour window)
        
        Requirements: 6.1, 6.2
        
        Args:
            user_id: User ID
            
        Returns:
            Tuple of (is_allowed, info_dict)
            - is_allowed: True if request can proceed
            - info_dict: Contains remaining requests and reset time
        """
        # Get user to check premium status
        user = await self.db["users"].find_one({"_id": ObjectId(user_id)})
        
        # Determine limit based on premium status
        is_premium = user.get("is_premium", False) if user else False
        request_limit = 200 if is_premium else 50
        
        # Calculate 24 hours ago
        now = datetime.now(UTC)
        window_start = now - timedelta(hours=24)
        
        # Count requests in the rolling 24-hour window
        # We'll use a separate collection for tutor rate limits
        request_count = await self.db["tutor_rate_limits"].count_documents({
            "user_id": ObjectId(user_id),
            "timestamp": {"$gte": window_start}
        })
        
        requests_remaining = max(0, request_limit - request_count)
        is_allowed = requests_remaining > 0
        
        # Find the oldest request to calculate reset time
        oldest_request = await self.db["tutor_rate_limits"].find_one(
            {"user_id": ObjectId(user_id), "timestamp": {"$gte": window_start}},
            sort=[("timestamp", 1)]
        )
        
        # Reset time is 24 hours after the oldest request
        if oldest_request:
            reset_time = oldest_request["timestamp"] + timedelta(hours=24)
        else:
            # No requests yet, reset time is 24 hours from now
            reset_time = now + timedelta(hours=24)
        
        return is_allowed, {
            "requests_remaining": requests_remaining,
            "request_limit": request_limit,
            "reset_at": reset_time.isoformat(),
            "is_premium": is_premium
        }
    
    async def increment_tutor_request_count(
        self,
        user_id: str
    ) -> None:
        """
        Increment user's AI tutor request count
        
        Requirements: 6.1
        
        Args:
            user_id: User ID
        """
        now = datetime.now(UTC)
        
        # Store timestamp for rolling window calculation
        # TTL index will auto-delete after 48 hours
        await self.db["tutor_rate_limits"].insert_one({
            "user_id": ObjectId(user_id),
            "timestamp": now,
            "expires_at": now + timedelta(hours=48)
        })
    
    async def reset_tutor_rate_limit_if_expired(
        self,
        user_id: str
    ) -> bool:
        """
        Check if 24 hours elapsed since first request and clean up old records
        
        Requirements: 6.7
        
        Args:
            user_id: User ID
            
        Returns:
            True if old records were cleaned up, False otherwise
        """
        # Calculate 24 hours ago
        now = datetime.now(UTC)
        window_start = now - timedelta(hours=24)
        
        # Delete requests older than 24 hours
        result = await self.db["tutor_rate_limits"].delete_many({
            "user_id": ObjectId(user_id),
            "timestamp": {"$lt": window_start}
        })
        
        return result.deleted_count > 0


# Singleton instance
_rate_limit_service: Optional[RateLimitService] = None


def get_rate_limit_service(db: Optional[AsyncIOMotorDatabase] = None) -> RateLimitService:
    """Get or create rate limit service instance"""
    global _rate_limit_service
    if _rate_limit_service is None:
        _rate_limit_service = RateLimitService(db)
    return _rate_limit_service
