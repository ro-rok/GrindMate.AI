"""
Test script for Smart Random Service

This script tests the smart random question selection algorithm.
"""

import asyncio
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from app.services.smart_random import SmartRandomService
from app.config import get_settings


async def test_smart_random():
    """Test smart random selection"""
    settings = get_settings()
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    
    print("Testing Smart Random Service...")
    print("-" * 50)
    
    # Create service
    service = SmartRandomService(db)
    
    # Test 1: Get a company and user
    company = await db["companies"].find_one({})
    if not company:
        print("❌ No companies found in database")
        return
    
    user = await db["users"].find_one({})
    if not user:
        print("❌ No users found in database")
        return
    
    company_id = company["_id"]
    user_id = user["_id"]
    
    print(f"✓ Using company: {company.get('name', 'Unknown')} ({company_id})")
    print(f"✓ Using user: {user.get('email', 'Unknown')} ({user_id})")
    print()
    
    # Test 2: Get weak patterns
    print("Test 1: Getting weak patterns...")
    weak_patterns = await service.get_weak_patterns(user_id)
    print(f"✓ Weak patterns: {weak_patterns if weak_patterns else 'None'}")
    print()
    
    # Test 3: Get recent solve rate
    print("Test 2: Getting recent solve rate...")
    recent_solve_rate = await service.get_recent_solve_rate(user_id)
    print(f"✓ Recent solve rate: {recent_solve_rate:.2%}")
    print()
    
    # Test 4: Get recent selections
    print("Test 3: Getting recent selections...")
    recent_selections = await service.get_recent_selections(user_id)
    print(f"✓ Recent selections: {len(recent_selections)} questions")
    print()
    
    # Test 5: Select smart random question
    print("Test 4: Selecting smart random question...")
    filters = {
        "company_id": company_id,
        "timeframe": "30_days"
    }
    
    selected = await service.select_smart_random(user_id, filters)
    
    if selected:
        print(f"✓ Selected question: {selected.get('title', 'Unknown')}")
        print(f"  - Difficulty: {selected.get('difficulty', 'Unknown')}")
        print(f"  - Priority Score: {selected.get('priority_score', 0):.2f}")
        print(f"  - Reason: {selected.get('reason', 'Unknown')}")
        print(f"  - Patterns: {selected.get('patterns', [])}")
    else:
        print("⚠ No questions available for selection")
    print()
    
    # Test 6: Test priority score calculation
    print("Test 5: Testing priority score calculation...")
    question = await db["questions"].find_one({"company_id": company_id})
    if question:
        score = await service.calculate_priority_score(
            question=question,
            weak_patterns=weak_patterns,
            recent_solve_rate=recent_solve_rate,
            recent_selections=recent_selections
        )
        print(f"✓ Priority score breakdown:")
        print(f"  - Timeframe weight: {score.timeframe_weight}")
        print(f"  - Weakness weight: {score.weakness_weight}")
        print(f"  - Difficulty weight: {score.difficulty_weight}")
        print(f"  - Novelty weight: {score.novelty_weight}")
        print(f"  - Total score: {score.total_score}")
        print(f"  - Reason: {score.reason}")
    else:
        print("⚠ No questions found for testing")
    print()
    
    print("-" * 50)
    print("✓ All tests completed successfully!")
    
    # Close connection
    client.close()


if __name__ == "__main__":
    asyncio.run(test_smart_random())
