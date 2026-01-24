"""
Script to add missing 'name' field to company documents in MongoDB.
This fixes the issue where company IDs are displayed instead of names.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "leetcode_tracker")


async def fix_company_names():
    """Add name field to companies that don't have one."""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    try:
        # Find all companies
        companies = await db["companies"].find({}).to_list(length=None)
        
        print(f"Found {len(companies)} companies")
        print("\nCurrent companies:")
        
        for company in companies:
            company_id = company.get("_id")
            name = company.get("name")
            legacy_id = company.get("legacy_id")
            
            print(f"  ID: {company_id}")
            print(f"  Name: {name if name else '❌ MISSING'}")
            print(f"  Legacy ID: {legacy_id}")
            print()
            
            # If name is missing, prompt user to add it
            if not name:
                print(f"⚠️  Company {company_id} is missing a name!")
                new_name = input(f"Enter name for company {company_id} (or press Enter to skip): ").strip()
                
                if new_name:
                    result = await db["companies"].update_one(
                        {"_id": company_id},
                        {"$set": {"name": new_name}}
                    )
                    if result.modified_count > 0:
                        print(f"✅ Updated company {company_id} with name: {new_name}\n")
                    else:
                        print(f"❌ Failed to update company {company_id}\n")
                else:
                    print(f"⏭️  Skipped company {company_id}\n")
        
        print("\n✅ Done!")
        
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(fix_company_names())
