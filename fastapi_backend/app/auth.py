from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorDatabase

from .config import get_settings
from .db import get_database
from .models.user import UserInDB
from .services.auth_service import create_access_token as create_access_token_service


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[UserInDB]:
    doc = await db["users"].find_one({"email": email})
    if not doc:
        return None
    return UserInDB(**doc, id=doc.get("_id"))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    """Legacy wrapper for backward compatibility"""
    return create_access_token_service(subject, expires_delta)


async def get_current_user(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserInDB:
    settings = get_settings()
    # Get cookie from request
    session = request.cookies.get(settings.access_token_cookie_name)
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    try:
        payload = jwt.decode(session, settings.secret_key, algorithms=["HS256"])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        
        # Ensure this is an access token, not a refresh token
        if token_type != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
            
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    from bson import ObjectId

    doc = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return UserInDB(**doc, id=doc.get("_id"))


CurrentUser = Annotated[UserInDB, Depends(get_current_user)]


