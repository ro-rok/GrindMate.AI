"""
Integration tests for RateLimitService AI Tutor rate limiting

Tests the rolling 24-hour window rate limiting for AI tutor requests.
"""

import pytest
import pytest_asyncio
import asyncio
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.services.rate_limit_service import RateLimitService
from app.config import get_settings


@pytest_asyncio.fixture
async def db():
    """Create a test database connection"""
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[f"{settings.mongodb_db}_test"]
    
    # Clean up test data
    await db.tutor_rate_limits.delete_many({})
    await db.users.delete_many({})
    
    yield db
    
    # Clean up after tests
    await db.tutor_rate_limits.delete_many({})
    await db.users.delete_many({})
    client.close()


@pytest_asyncio.fixture
async def rate_limit_service(db):
    """Create a RateLimitService instance"""
    return RateLimitService(db)


@pytest_asyncio.fixture
async def free_user(db):
    """Create a free user for testing"""
    user_id = ObjectId()
    await db.users.insert_one({
        "_id": user_id,
        "email": "free@test.com",
        "is_premium": False
    })
    return str(user_id)


@pytest_asyncio.fixture
async def premium_user(db):
    """Create a premium user for testing"""
    user_id = ObjectId()
    await db.users.insert_one({
        "_id": user_id,
        "email": "premium@test.com",
        "is_premium": True
    })
    return str(user_id)


@pytest.mark.asyncio
async def test_check_rate_limit_no_requests(rate_limit_service, free_user):
    """Test rate limit check with no prior requests"""
    is_allowed, info = await rate_limit_service.check_tutor_rate_limit(free_user)
    
    assert is_allowed is True
    assert info["requests_remaining"] == 50
    assert info["request_limit"] == 50
    assert info["is_premium"] is False


@pytest.mark.asyncio
async def test_check_rate_limit_premium_user(rate_limit_service, premium_user):
    """Test rate limit check for premium user"""
    is_allowed, info = await rate_limit_service.check_tutor_rate_limit(premium_user)
    
    assert is_allowed is True
    assert info["requests_remaining"] == 200
    assert info["request_limit"] == 200
    assert info["is_premium"] is True


@pytest.mark.asyncio
async def test_increment_request_count(rate_limit_service, free_user):
    """Test incrementing request count"""
    # Make first request
    await rate_limit_service.increment_tutor_request_count(free_user)
    
    # Check remaining
    is_allowed, info = await rate_limit_service.check_tutor_rate_limit(free_user)
    assert info["requests_remaining"] == 49


@pytest.mark.asyncio
async def test_rate_limit_enforcement_free_user(rate_limit_service, free_user):
    """Test that free users are blocked after 50 requests"""
    # Make 50 requests
    for _ in range(50):
        await rate_limit_service.increment_tutor_request_count(free_user)
    
    # 51st request should be blocked
    is_allowed, info = await rate_limit_service.check_tutor_rate_limit(free_user)
    assert is_allowed is False
    assert info["requests_remaining"] == 0


@pytest.mark.asyncio
async def test_rate_limit_enforcement_premium_user(rate_limit_service, premium_user):
    """Test that premium users are blocked after 200 requests"""
    # Make 200 requests
    for _ in range(200):
        await rate_limit_service.increment_tutor_request_count(premium_user)
    
    # 201st request should be blocked
    is_allowed, info = await rate_limit_service.check_tutor_rate_limit(premium_user)
    assert is_allowed is False
    assert info["requests_remaining"] == 0


@pytest.mark.asyncio
async def test_reset_if_expired(rate_limit_service, free_user, db):
    """Test that old requests are cleaned up"""
    # Insert old request (25 hours ago)
    old_timestamp = datetime.utcnow() - timedelta(hours=25)
    await db.tutor_rate_limits.insert_one({
        "user_id": ObjectId(free_user),
        "timestamp": old_timestamp,
        "expires_at": old_timestamp + timedelta(hours=48)
    })
    
    # Insert recent request (1 hour ago)
    recent_timestamp = datetime.utcnow() - timedelta(hours=1)
    await db.tutor_rate_limits.insert_one({
        "user_id": ObjectId(free_user),
        "timestamp": recent_timestamp,
        "expires_at": recent_timestamp + timedelta(hours=48)
    })
    
    # Reset should clean up old request
    was_reset = await rate_limit_service.reset_tutor_rate_limit_if_expired(free_user)
    assert was_reset is True
    
    # Check that only recent request remains
    is_allowed, info = await rate_limit_service.check_tutor_rate_limit(free_user)
    assert info["requests_remaining"] == 49  # 50 - 1 recent request


@pytest.mark.asyncio
async def test_rolling_window(rate_limit_service, free_user, db):
    """Test that rolling window works correctly"""
    # Insert request 23 hours ago (should still count)
    timestamp_23h = datetime.utcnow() - timedelta(hours=23)
    await db.tutor_rate_limits.insert_one({
        "user_id": ObjectId(free_user),
        "timestamp": timestamp_23h,
        "expires_at": timestamp_23h + timedelta(hours=48)
    })
    
    # Check that it counts
    is_allowed, info = await rate_limit_service.check_tutor_rate_limit(free_user)
    assert info["requests_remaining"] == 49
    
    # Insert request 25 hours ago (should not count)
    timestamp_25h = datetime.utcnow() - timedelta(hours=25)
    await db.tutor_rate_limits.insert_one({
        "user_id": ObjectId(free_user),
        "timestamp": timestamp_25h,
        "expires_at": timestamp_25h + timedelta(hours=48)
    })
    
    # Check that old request doesn't count
    is_allowed, info = await rate_limit_service.check_tutor_rate_limit(free_user)
    assert info["requests_remaining"] == 49  # Still 49, old request excluded


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
