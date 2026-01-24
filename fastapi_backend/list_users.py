"""
Script to list all users

Usage: python list_users.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings


async def list_users():
    """List all users"""
    settings = get_settings()
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    
    try:
        # Find all users
        users = await db["users"].find({}).to_list(length=None)
        
        if not users:
            print("No users found")
            return
        
        print(f"\n📋 Found {len(users)} users:\n")
        print(f"{'Username':<20} {'Email':<30} {'Role':<10} {'ID'}")
        print("-" * 80)
        
        for user in users:
            username = user.get("username", "N/A")
            email = user.get("email", "N/A")
            role = user.get("role", "user")
            user_id = str(user.get("_id", ""))
            
            print(f"{username:<20} {email:<30} {role:<10} {user_id}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(list_users())
