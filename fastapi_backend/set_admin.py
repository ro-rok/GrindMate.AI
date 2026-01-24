"""
Script to set a user as admin

Usage: python set_admin.py <username>
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings


async def set_admin(username: str):
    """Set a user as admin by username"""
    settings = get_settings()
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    
    try:
        # Find user by username
        user = await db["users"].find_one({"username": username})
        
        if not user:
            print(f"❌ User '{username}' not found")
            return False
        
        # Update user role to admin
        result = await db["users"].update_one(
            {"username": username},
            {"$set": {"role": "admin"}}
        )
        
        if result.modified_count > 0:
            print(f"✅ User '{username}' is now an admin!")
            return True
        else:
            print(f"ℹ️  User '{username}' was already an admin")
            return True
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        client.close()


async def main():
    if len(sys.argv) < 2:
        print("Usage: python set_admin.py <username>")
        print("Example: python set_admin.py therock17899")
        sys.exit(1)
    
    username = sys.argv[1]
    success = await set_admin(username)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
