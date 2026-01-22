"""
Admin middleware for verifying admin access.

This module provides the verify_admin dependency that checks if a user
has admin privileges based on their role or email allowlist.

Requirements: 1.1, 1.2, 1.3, 1.4, 17.1, 17.3
"""

from typing import Annotated
from fastapi import Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from ..db import get_database
from ..models.user import UserInDB
from ..auth import get_current_user


# Admin email allowlist
ADMIN_EMAIL_ALLOWLIST = ["therock17899@gmail.com"]


async def verify_admin(
    request: Request,
    current_user: UserInDB = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserInDB:
    """
    Verify that the current user has admin privileges.
    
    Admin access is granted if:
    1. User has role="admin" in database, OR
    2. User's email is in the admin allowlist
    
    If user is in allowlist but doesn't have role="admin", this function
    will update their role to "admin" in the database.
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated user from get_current_user dependency
        db: MongoDB database connection
    
    Returns:
        UserInDB: The user document if admin access is granted
    
    Raises:
        HTTPException: 403 Forbidden if user is not an admin
    
    Requirements:
        - 1.1: Set role="admin" for allowlisted email
        - 1.2: Return 403 for non-admin users accessing /admin routes
        - 1.3: Return 403 for non-admin users accessing /api/admin/* endpoints
        - 1.4: Verify admin status on every admin endpoint request
        - 17.1: Upsert user record with role="admin" for admin email
        - 17.3: Verify role="admin" OR email in admin allowlist
    """
    # Check if user has admin role or is in allowlist
    is_admin = (
        current_user.role == "admin" or 
        current_user.email in ADMIN_EMAIL_ALLOWLIST
    )
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    # If user is in allowlist but doesn't have admin role, update their role
    # Requirement 1.1, 17.1: Set role="admin" for allowlisted email
    if current_user.email in ADMIN_EMAIL_ALLOWLIST and current_user.role != "admin":
        await db["users"].update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": {"role": "admin"}}
        )
        # Update the current_user object to reflect the change
        current_user.role = "admin"
    
    return current_user


# Type annotation for dependency injection
AdminUser = Annotated[UserInDB, Depends(verify_admin)]
