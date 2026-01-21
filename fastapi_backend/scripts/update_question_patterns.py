"""
Script to update existing questions with derived patterns based on their topics.
Run this after implementing the pattern service to populate patterns for existing questions.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings
from app.services.pattern_service import get_pattern_service


async def update_question_patterns():
    """Update all questions with derived patterns."""
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    
    pattern_service = get_pattern_service()
    
    print("Fetching all questions...")
    questions = await db["questions"].find({}).to_list(None)
    print(f"Found {len(questions)} questions")
    
    updated_count = 0
    skipped_count = 0
    
    for question in questions:
        topics = question.get("topics", "")
        
        if not topics:
            skipped_count += 1
            continue
        
        # Derive patterns from topics
        patterns = pattern_service.derive_patterns(topics)
        
        # Update question with patterns
        await db["questions"].update_one(
            {"_id": question["_id"]},
            {"$set": {"patterns": patterns}}
        )
        
        updated_count += 1
        
        if updated_count % 100 == 0:
            print(f"Updated {updated_count} questions...")
    
    print(f"\nUpdate complete!")
    print(f"  Updated: {updated_count}")
    print(f"  Skipped (no topics): {skipped_count}")
    print(f"  Total: {len(questions)}")
    
    client.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Update Question Patterns Script")
    print("=" * 60)
    print("\nThis script will update all questions with derived patterns")
    print("based on their topics using the pattern mapping service.")
    
    response = input("\nContinue? (y/n): ")
    if response.lower() != 'y':
        print("Aborted.")
        sys.exit(0)
    
    asyncio.run(update_question_patterns())
