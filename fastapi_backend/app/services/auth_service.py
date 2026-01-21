"""
Authentication service for JWT access and refresh token management.
Implements token rotation with family ID for security.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import secrets
import hashlib
import uuid

from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from ..config import get_settings
from ..models.user import UserInDB
from ..models.refresh_token import RefreshToken, RefreshTokenCreate


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a short-lived JWT access token.
    
    Args:
        subject: User ID to encode in token
        expires_delta: Optional custom expiration time (default: 15 minutes)
    
    Returns:
        Encoded JWT token string
    """
    settings = get_settings()
    if expires_delta is None:
        expires_delta = timedelta(minutes=15)  # Short-lived access token
    
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"sub": subject, "exp": expire, "type": "access"}
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


def create_refresh_token() -> str:
    """
    Generate a cryptographically secure random refresh token.
    
    Returns:
        Random token string (64 characters)
    """
    return secrets.token_urlsafe(48)  # 64 characters


def hash_token(token: str) -> str:
    """
    Hash a token for secure storage in database.
    
    Args:
        token: Plain token string
    
    Returns:
        SHA-256 hash of the token
    """
    return hashlib.sha256(token.encode()).hexdigest()


def generate_token_family_id() -> str:
    """
    Generate a unique token family ID for rotation detection.
    
    Returns:
        UUID4 string
    """
    return str(uuid.uuid4())


async def store_refresh_token(
    db: AsyncIOMotorDatabase,
    user_id: str,
    token: str,
    token_family_id: str,
    expires_delta: Optional[timedelta] = None
) -> RefreshToken:
    """
    Store a refresh token in the database with hashing.
    
    Args:
        db: Database connection
        user_id: User ID the token belongs to
        token: Plain refresh token
        token_family_id: Family ID for rotation detection
        expires_delta: Optional custom expiration (default: 7 days)
    
    Returns:
        Created RefreshToken document
    """
    if expires_delta is None:
        expires_delta = timedelta(days=7)  # 7 days sliding window
    
    expires_at = datetime.now(timezone.utc) + expires_delta
    token_hash = hash_token(token)
    
    doc = {
        "user_id": ObjectId(user_id),
        "token_family_id": token_family_id,
        "token_hash": token_hash,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
        "revoked": False,
        "revoked_at": None
    }
    
    result = await db["refresh_tokens"].insert_one(doc)
    doc["_id"] = result.inserted_id
    
    return RefreshToken(**doc, id=doc["_id"])


async def validate_refresh_token(
    db: AsyncIOMotorDatabase,
    token: str
) -> Tuple[Optional[RefreshToken], Optional[str]]:
    """
    Validate a refresh token and check for reuse attacks.
    
    Args:
        db: Database connection
        token: Plain refresh token to validate
    
    Returns:
        Tuple of (RefreshToken document or None, error message or None)
        
    Error cases:
        - Token not found: ("Token not found or expired", None)
        - Token expired: ("Token expired", None)
        - Token revoked (reuse detected): ("Token reuse detected", token_family_id)
    """
    token_hash = hash_token(token)
    
    # Find token in database
    doc = await db["refresh_tokens"].find_one({"token_hash": token_hash})
    
    if not doc:
        return None, "Token not found or expired"
    
    refresh_token = RefreshToken(**doc, id=doc["_id"])
    
    # Check if token is expired
    if refresh_token.expires_at < datetime.now(timezone.utc):
        return None, "Token expired"
    
    # Check if token is revoked (reuse attack detection)
    if refresh_token.revoked:
        # Token reuse detected! Revoke entire token family
        return None, refresh_token.token_family_id
    
    return refresh_token, None


async def revoke_token_family(
    db: AsyncIOMotorDatabase,
    token_family_id: str
) -> int:
    """
    Revoke all tokens in a token family (for reuse attack mitigation).
    
    Args:
        db: Database connection
        token_family_id: Family ID to revoke
    
    Returns:
        Number of tokens revoked
    """
    result = await db["refresh_tokens"].update_many(
        {"token_family_id": token_family_id},
        {
            "$set": {
                "revoked": True,
                "revoked_at": datetime.now(timezone.utc)
            }
        }
    )
    return result.modified_count


async def revoke_refresh_token(
    db: AsyncIOMotorDatabase,
    token: str
) -> bool:
    """
    Revoke a specific refresh token (for logout).
    
    Args:
        db: Database connection
        token: Plain refresh token to revoke
    
    Returns:
        True if token was revoked, False if not found
    """
    token_hash = hash_token(token)
    
    result = await db["refresh_tokens"].update_one(
        {"token_hash": token_hash},
        {
            "$set": {
                "revoked": True,
                "revoked_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return result.modified_count > 0


async def rotate_refresh_token(
    db: AsyncIOMotorDatabase,
    old_token: str,
    user_id: str
) -> Tuple[Optional[str], Optional[str]]:
    """
    Rotate a refresh token (revoke old, issue new with same family ID).
    
    Args:
        db: Database connection
        old_token: Current refresh token
        user_id: User ID
    
    Returns:
        Tuple of (new_token, error_message)
        Returns (None, error) if validation fails
    """
    # Validate old token
    refresh_token, error = await validate_refresh_token(db, old_token)
    
    if error:
        # Check if this is a reuse attack (error contains family_id)
        if error not in ["Token not found or expired", "Token expired"]:
            # Reuse detected - revoke entire family
            await revoke_token_family(db, error)
            return None, "Token reuse detected - all tokens revoked"
        return None, error
    
    # Revoke old token
    await revoke_refresh_token(db, old_token)
    
    # Generate new token with same family ID
    new_token = create_refresh_token()
    await store_refresh_token(
        db,
        user_id,
        new_token,
        refresh_token.token_family_id
    )
    
    return new_token, None


async def cleanup_expired_tokens(db: AsyncIOMotorDatabase) -> int:
    """
    Remove expired refresh tokens from database (maintenance task).
    
    Args:
        db: Database connection
    
    Returns:
        Number of tokens deleted
    """
    result = await db["refresh_tokens"].delete_many({
        "expires_at": {"$lt": datetime.now(timezone.utc)}
    })
    return result.deleted_count
