"""
Migration script to add slug field to all companies in MongoDB.
This enables URL-friendly company identifiers like /companies/amazon instead of /companies/69271a5b4a856b4d1cb47be1
"""
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "leetcode_tracker")


def slugify(text: str) -> str:
    """Convert company name to URL-friendly slug"""
    return text.lower().replace(" ", "-").replace(".", "").replace(",", "")


async def add_slugs_to_companies():
    """Add slug field to all companies that don't have one"""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    try:
        # Find all companies
        companies = await db["companies"].find({}).to_list(length=None)
        
        print(f"Found {len(companies)} companies")
        print("\nAdding slugs...")
        
        updated_count = 0
        skipped_count = 0
        
        for company in companies:
            company_id = company.get("_id")
            name = company.get("name")
            existing_slug = company.get("slug")
            
            if existing_slug:
                print(f"  ⏭️  {name}: Already has slug '{existing_slug}'")
                skipped_count += 1
                continue
            
            if not name:
                print(f"  ⚠️  Company {company_id}: Missing name, skipping")
                skipped_count += 1
                continue
            
            # Generate slug
            slug = slugify(name)
            
            # Update company with slug
            result = await db["companies"].update_one(
                {"_id": company_id},
                {"$set": {"slug": slug}}
            )
            
            if result.modified_count > 0:
                print(f"  ✅ {name}: Added slug '{slug}'")
                updated_count += 1
            else:
                print(f"  ❌ {name}: Failed to add slug")
        
        print(f"\n✅ Migration complete!")
        print(f"   Updated: {updated_count}")
        print(f"   Skipped: {skipped_count}")
        print(f"   Total: {len(companies)}")
        
    finally:
        client.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Company Slug Migration")
    print("=" * 60)
    print()
    asyncio.run(add_slugs_to_companies())
