"""
Migration script to add titleSlug field to all questions in MongoDB.
This enables URL-friendly question identifiers like /questions/two-sum instead of /questions/507f1f77bcf86cd799439011
"""
import asyncio
import os
import sys
import re
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "leetcode_tracker")


def slugify_question_title(title: str) -> str:
    """Convert question title to URL-friendly slug"""
    # Remove special characters and convert to lowercase
    slug = re.sub(r'[^\w\s-]', '', title.lower())
    # Replace spaces with hyphens
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug.strip('-')


async def add_slugs_to_questions():
    """Add titleSlug field to all questions that don't have one"""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    try:
        # Find all questions
        questions = await db["questions"].find({}).to_list(length=None)
        
        print(f"Found {len(questions)} questions")
        print("\nAdding titleSlugs...")
        
        updated_count = 0
        skipped_count = 0
        
        for question in questions:
            question_id = question.get("_id")
            title = question.get("title")
            existing_slug = question.get("titleSlug")
            
            if existing_slug:
                skipped_count += 1
                if skipped_count <= 5:  # Only print first 5 to avoid spam
                    print(f"  ⏭️  {title}: Already has titleSlug '{existing_slug}'")
                continue
            
            if not title:
                print(f"  ⚠️  Question {question_id}: Missing title, skipping")
                skipped_count += 1
                continue
            
            # Generate slug
            slug = slugify_question_title(title)
            
            # Update question with slug
            result = await db["questions"].update_one(
                {"_id": question_id},
                {"$set": {"titleSlug": slug}}
            )
            
            if result.modified_count > 0:
                if updated_count < 10:  # Only print first 10 to avoid spam
                    print(f"  ✅ {title}: Added titleSlug '{slug}'")
                updated_count += 1
            else:
                print(f"  ❌ {title}: Failed to add titleSlug")
        
        if updated_count > 10:
            print(f"  ... and {updated_count - 10} more")
        
        print(f"\n✅ Migration complete!")
        print(f"   Updated: {updated_count}")
        print(f"   Skipped: {skipped_count}")
        print(f"   Total: {len(questions)}")
        
    finally:
        client.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Question TitleSlug Migration")
    print("=" * 60)
    print()
    asyncio.run(add_slugs_to_questions())
