"""
MongoDB index initialization for GrindMate.AI

This module creates all necessary indexes for optimal query performance.
Indexes are created idempotently - running this multiple times is safe.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, TEXT, IndexModel
import logging

logger = logging.getLogger(__name__)


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    """
    Create all MongoDB indexes for the application.
    
    This function is idempotent and can be safely called multiple times.
    Indexes are created in the background to avoid blocking the application startup.
    """
    logger.info("Creating MongoDB indexes...")
    
    # ============================================================================
    # QUESTIONS COLLECTION INDEXES
    # ============================================================================
    
    # Compound index for filtering by company, timeframe, and difficulty
    # Requirement 18.1: Optimizes the main question list query
    await db.questions.create_index(
        [
            ("company_id", ASCENDING),
            ("timeframe", ASCENDING),
            ("difficulty", ASCENDING)
        ],
        name="idx_questions_company_timeframe_difficulty",
        background=True
    )
    logger.info("✓ Created compound index on questions (company_id, timeframe, difficulty)")
    
    # Text index for search by topics and title
    # Requirement 18.2: Enables full-text search on topics and title
    await db.questions.create_index(
        [
            ("topics", TEXT),
            ("title", TEXT)
        ],
        name="idx_questions_text_search",
        background=True,
        weights={"title": 10, "topics": 5}  # Title matches are more relevant
    )
    logger.info("✓ Created text index on questions (topics, title)")
    
    # Multikey index for pattern filtering
    # Requirement 18.2: Enables filtering by problem-solving patterns
    await db.questions.create_index(
        [("patterns", ASCENDING)],
        name="idx_questions_patterns",
        background=True
    )
    logger.info("✓ Created multikey index on questions (patterns)")
    
    # ============================================================================
    # USER_QUESTIONS COLLECTION INDEXES
    # ============================================================================
    
    # Compound index for user's solved questions
    # Requirement 18.3: Optimizes queries for user's progress tracking
    await db.user_questions.create_index(
        [
            ("user_id", ASCENDING),
            ("solved", ASCENDING)
        ],
        name="idx_user_questions_user_solved",
        background=True
    )
    logger.info("✓ Created compound index on user_questions (user_id, solved)")
    
    # Unique compound index for user-question relationship
    # Requirement 18.4: Ensures one record per user-question pair
    await db.user_questions.create_index(
        [
            ("user_id", ASCENDING),
            ("question_id", ASCENDING)
        ],
        name="idx_user_questions_user_question_unique",
        unique=True,
        background=True
    )
    logger.info("✓ Created unique compound index on user_questions (user_id, question_id)")
    
    # ============================================================================
    # USERS COLLECTION INDEXES
    # ============================================================================
    
    # Unique index on email for login queries
    # Requirement 18.5: Optimizes authentication and ensures email uniqueness
    await db.users.create_index(
        [("email", ASCENDING)],
        name="idx_users_email_unique",
        unique=True,
        background=True
    )
    logger.info("✓ Created unique index on users (email)")
    
    # Index on last_solve_date for streak calculations
    # Requirement 18.5: Optimizes streak tracking queries
    await db.users.create_index(
        [("last_solve_date", ASCENDING)],
        name="idx_users_last_solve_date",
        background=True
    )
    logger.info("✓ Created index on users (last_solve_date)")
    
    # ============================================================================
    # CHAT_MESSAGES COLLECTION INDEXES
    # ============================================================================
    
    # Compound index for chat history retrieval
    # Optimizes fetching conversation history for a user and question
    await db.chat_messages.create_index(
        [
            ("user_id", ASCENDING),
            ("question_id", ASCENDING),
            ("created_at", DESCENDING)
        ],
        name="idx_chat_messages_user_question_created",
        background=True
    )
    logger.info("✓ Created compound index on chat_messages (user_id, question_id, created_at)")
    
    # Compound index for cache lookup
    # Optimizes finding cached AI responses
    await db.chat_messages.create_index(
        [
            ("question_id", ASCENDING),
            ("hint_level", ASCENDING),
            ("tutor_mode", ASCENDING)
        ],
        name="idx_chat_messages_cache_lookup",
        background=True
    )
    logger.info("✓ Created compound index on chat_messages (question_id, hint_level, tutor_mode)")
    
    # TTL index for automatic expiration of old chat messages
    # Requirement 18.6: Automatically removes expired chat messages
    await db.chat_messages.create_index(
        [("expires_at", ASCENDING)],
        name="idx_chat_messages_ttl",
        expireAfterSeconds=0,  # Expire at the time specified in expires_at field
        background=True
    )
    logger.info("✓ Created TTL index on chat_messages (expires_at)")
    
    # ============================================================================
    # HINT_UNLOCKS COLLECTION INDEXES
    # ============================================================================
    
    # Unique compound index for hint unlock tracking
    # Ensures one unlock record per user-question-level combination
    await db.hint_unlocks.create_index(
        [
            ("user_id", ASCENDING),
            ("question_id", ASCENDING),
            ("hint_level", ASCENDING)
        ],
        name="idx_hint_unlocks_user_question_level_unique",
        unique=True,
        background=True
    )
    logger.info("✓ Created unique compound index on hint_unlocks (user_id, question_id, hint_level)")
    
    # ============================================================================
    # RATE_LIMITS COLLECTION INDEXES
    # ============================================================================
    
    # Unique compound index for rate limit tracking
    # Ensures one rate limit record per user per day
    await db.rate_limits.create_index(
        [
            ("user_id", ASCENDING),
            ("date", ASCENDING)
        ],
        name="idx_rate_limits_user_date_unique",
        unique=True,
        background=True
    )
    logger.info("✓ Created unique compound index on rate_limits (user_id, date)")
    
    # TTL index for automatic cleanup of old rate limit records
    # Requirement 18.6: Automatically removes expired rate limit records
    await db.rate_limits.create_index(
        [("expires_at", ASCENDING)],
        name="idx_rate_limits_ttl",
        expireAfterSeconds=0,  # Expire at the time specified in expires_at field
        background=True
    )
    logger.info("✓ Created TTL index on rate_limits (expires_at)")
    
    # ============================================================================
    # REFRESH_TOKENS COLLECTION INDEXES
    # ============================================================================
    
    # Index on token_hash for fast token lookup
    await db.refresh_tokens.create_index(
        [("token_hash", ASCENDING)],
        name="idx_refresh_tokens_token_hash",
        background=True
    )
    logger.info("✓ Created index on refresh_tokens (token_hash)")
    
    # Index on token_family_id for revoking token families
    await db.refresh_tokens.create_index(
        [("token_family_id", ASCENDING)],
        name="idx_refresh_tokens_family_id",
        background=True
    )
    logger.info("✓ Created index on refresh_tokens (token_family_id)")
    
    # Compound index for user's active tokens
    await db.refresh_tokens.create_index(
        [
            ("user_id", ASCENDING),
            ("revoked", ASCENDING)
        ],
        name="idx_refresh_tokens_user_revoked",
        background=True
    )
    logger.info("✓ Created compound index on refresh_tokens (user_id, revoked)")
    
    # TTL index for automatic cleanup of expired tokens
    await db.refresh_tokens.create_index(
        [("expires_at", ASCENDING)],
        name="idx_refresh_tokens_ttl",
        expireAfterSeconds=0,
        background=True
    )
    logger.info("✓ Created TTL index on refresh_tokens (expires_at)")
    
    logger.info("✅ All MongoDB indexes created successfully")


async def list_indexes(db: AsyncIOMotorDatabase) -> dict:
    """
    List all indexes for debugging and verification.
    
    Returns a dictionary mapping collection names to their indexes.
    """
    collections = [
        "questions",
        "user_questions", 
        "users",
        "chat_messages",
        "hint_unlocks",
        "rate_limits",
        "refresh_tokens"
    ]
    
    indexes = {}
    for collection_name in collections:
        collection = db[collection_name]
        indexes[collection_name] = await collection.index_information()
    
    return indexes
