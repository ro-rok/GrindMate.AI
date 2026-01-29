"""
Database Indexes Setup

Creates indexes for optimal query performance on analytics collections.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING


async def create_analytics_indexes(db: AsyncIOMotorDatabase):
    """
    Create indexes for analytics collections
    
    This should be run during application startup or as a migration.
    """
    
    # tutor_analytics_events indexes
    await db["tutor_analytics_events"].create_index([
        ("timestamp", DESCENDING)
    ], name="timestamp_desc")
    
    await db["tutor_analytics_events"].create_index([
        ("user_id", ASCENDING),
        ("timestamp", DESCENDING)
    ], name="user_timestamp")
    
    await db["tutor_analytics_events"].create_index([
        ("event_type", ASCENDING),
        ("timestamp", DESCENDING)
    ], name="event_type_timestamp")
    
    await db["tutor_analytics_events"].create_index([
        ("session_id", ASCENDING)
    ], name="session_id")
    
    # TTL index for automatic cleanup (90 days)
    await db["tutor_analytics_events"].create_index([
        ("expires_at", ASCENDING)
    ], name="expires_at_ttl", expireAfterSeconds=0)
    
    # tutor_sessions indexes (if not already created)
    await db["tutor_sessions"].create_index([
        ("user_id", ASCENDING),
        ("session_start_time", DESCENDING)
    ], name="user_start_time")
    
    await db["tutor_sessions"].create_index([
        ("question_id", ASCENDING)
    ], name="question_id")
    
    await db["tutor_sessions"].create_index([
        ("session_start_time", DESCENDING)
    ], name="start_time_desc")
    
    # chat_messages indexes (if not already created)
    await db["chat_messages"].create_index([
        ("user_id", ASCENDING),
        ("question_id", ASCENDING),
        ("created_at", DESCENDING)
    ], name="user_question_created")
    
    await db["chat_messages"].create_index([
        ("session_id", ASCENDING),
        ("created_at", ASCENDING)
    ], name="session_created")
    
    # TTL index for chat messages (30 days)
    await db["chat_messages"].create_index([
        ("expires_at", ASCENDING)
    ], name="expires_at_ttl", expireAfterSeconds=0)
    
    print("✓ Analytics indexes created successfully")


async def create_all_indexes(db: AsyncIOMotorDatabase):
    """
    Create all database indexes
    
    Call this during application startup.
    """
    await create_analytics_indexes(db)
    print("✓ All indexes created successfully")
