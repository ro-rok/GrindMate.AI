"""
Rate Limit Service

Handles token and request tracking per user per day with timezone-aware resets.
Enforces daily limits (25k tokens, 30 requests) and bypasses for BYOK mode users.
"""

from datetime import datetime, timedelta, date, time
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
        self.db = db or get_database()
    
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
        expires_at = datetime.utcnow() + timedelta(days=2)
        
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
                    "created_at": datetime.utcnow(),
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


# Singleton instance
_rate_limit_service: Optional[RateLimitService] = None


def get_rate_limit_service(db: Optional[AsyncIOMotorDatabase] = None) -> RateLimitService:
    """Get or create rate limit service instance"""
    global _rate_limit_service
    if _rate_limit_service is None:
        _rate_limit_service = RateLimitService(db)
    return _rate_limit_service
