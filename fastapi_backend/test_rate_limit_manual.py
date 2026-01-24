"""
Manual test script for RateLimitService AI Tutor rate limiting

Run this script to verify the rate limiting implementation works correctly.
"""

import asyncio
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.services.rate_limit_service import RateLimitService
from app.config import get_settings


async def test_rate_limiting():
    """Test the rate limiting functionality"""
    print("=" * 80)
    print("Testing AI Tutor Rate Limiting")
    print("=" * 80)
    print()
    
    # Connect to database
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    # Create service
    service = RateLimitService(db)
    
    # Create test users
    free_user_id = ObjectId()
    premium_user_id = ObjectId()
    
    # Clean up any existing test data
    await db.users.delete_many({"email": {"$in": ["test_free@example.com", "test_premium@example.com"]}})
    await db.tutor_rate_limits.delete_many({"user_id": {"$in": [free_user_id, premium_user_id]}})
    
    # Insert test users
    await db.users.insert_one({
        "_id": free_user_id,
        "email": "test_free@example.com",
        "is_premium": False
    })
    
    await db.users.insert_one({
        "_id": premium_user_id,
        "email": "test_premium@example.com",
        "is_premium": True
    })
    
    print("✓ Created test users")
    print()
    
    # Test 1: Check initial rate limit for free user
    print("Test 1: Initial rate limit for free user")
    is_allowed, info = await service.check_tutor_rate_limit(str(free_user_id))
    print(f"  Allowed: {is_allowed}")
    print(f"  Requests remaining: {info['requests_remaining']}")
    print(f"  Request limit: {info['request_limit']}")
    print(f"  Is premium: {info['is_premium']}")
    assert is_allowed is True
    assert info['requests_remaining'] == 50
    assert info['request_limit'] == 50
    print("  ✓ PASSED")
    print()
    
    # Test 2: Check initial rate limit for premium user
    print("Test 2: Initial rate limit for premium user")
    is_allowed, info = await service.check_tutor_rate_limit(str(premium_user_id))
    print(f"  Allowed: {is_allowed}")
    print(f"  Requests remaining: {info['requests_remaining']}")
    print(f"  Request limit: {info['request_limit']}")
    print(f"  Is premium: {info['is_premium']}")
    assert is_allowed is True
    assert info['requests_remaining'] == 200
    assert info['request_limit'] == 200
    print("  ✓ PASSED")
    print()
    
    # Test 3: Increment request count
    print("Test 3: Increment request count for free user")
    await service.increment_tutor_request_count(str(free_user_id))
    is_allowed, info = await service.check_tutor_rate_limit(str(free_user_id))
    print(f"  Requests remaining after 1 request: {info['requests_remaining']}")
    assert info['requests_remaining'] == 49
    print("  ✓ PASSED")
    print()
    
    # Test 4: Make multiple requests
    print("Test 4: Make 10 requests for free user")
    for i in range(9):  # Already made 1, so 9 more = 10 total
        await service.increment_tutor_request_count(str(free_user_id))
    is_allowed, info = await service.check_tutor_rate_limit(str(free_user_id))
    print(f"  Requests remaining after 10 requests: {info['requests_remaining']}")
    assert info['requests_remaining'] == 40
    print("  ✓ PASSED")
    print()
    
    # Test 5: Test rate limit enforcement
    print("Test 5: Test rate limit enforcement (make 40 more requests)")
    for i in range(40):
        await service.increment_tutor_request_count(str(free_user_id))
    is_allowed, info = await service.check_tutor_rate_limit(str(free_user_id))
    print(f"  Allowed after 50 requests: {is_allowed}")
    print(f"  Requests remaining: {info['requests_remaining']}")
    assert is_allowed is False
    assert info['requests_remaining'] == 0
    print("  ✓ PASSED")
    print()
    
    # Test 6: Test rolling window with old requests
    print("Test 6: Test rolling window cleanup")
    # Insert an old request (25 hours ago)
    old_timestamp = datetime.utcnow() - timedelta(hours=25)
    await db.tutor_rate_limits.insert_one({
        "user_id": premium_user_id,
        "timestamp": old_timestamp,
        "expires_at": old_timestamp + timedelta(hours=48)
    })
    
    # Check that old request doesn't count
    is_allowed, info = await service.check_tutor_rate_limit(str(premium_user_id))
    print(f"  Requests remaining (with 1 old request): {info['requests_remaining']}")
    assert info['requests_remaining'] == 200  # Old request should not count
    
    # Clean up old requests
    was_reset = await service.reset_tutor_rate_limit_if_expired(str(premium_user_id))
    print(f"  Old requests cleaned up: {was_reset}")
    assert was_reset is True
    print("  ✓ PASSED")
    print()
    
    # Clean up test data
    await db.users.delete_many({"email": {"$in": ["test_free@example.com", "test_premium@example.com"]}})
    await db.tutor_rate_limits.delete_many({"user_id": {"$in": [free_user_id, premium_user_id]}})
    
    print("=" * 80)
    print("✅ All tests passed!")
    print("=" * 80)
    
    client.close()


if __name__ == "__main__":
    asyncio.run(test_rate_limiting())
