from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import (
    CurrentUser,
    create_access_token,
    get_database,
    get_user_by_email,
    hash_password,
    verify_password,
)
from ..config import get_settings
from ..models.user import UserInCreate, UserInLogin, UserPublic, UserInDB


router = APIRouter(tags=["auth"])


@router.post("/users", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserInCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    existing = await db["users"].find_one({"email": payload.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email already taken",
        )

    doc = {
        "email": payload.email,
        "encrypted_password": hash_password(payload.password),
    }
    result = await db["users"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return UserPublic(**doc, id=doc["_id"])


@router.post("/users/sign_in", response_model=UserPublic)
async def login_user(
    payload: UserInLogin,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user = await get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.encrypted_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token(str(user.id), expires_delta=timedelta(days=7))
    settings = get_settings()
    response.set_cookie(
        key=settings.access_token_cookie_name,
        value=token,
        httponly=True,
        secure=False,  # set to True behind HTTPS in prod
        samesite="none",
        max_age=settings.access_token_expire_minutes * 60,
    )
    return UserPublic(id=user.id, email=user.email, legacy_id=user.legacy_id)


@router.delete("/users/sign_out", status_code=status.HTTP_204_NO_CONTENT)
async def logout_user(response: Response):
    settings = get_settings()
    response.delete_cookie(key=settings.access_token_cookie_name)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/users/current", response_model=UserPublic)
async def current_user(user: CurrentUser):
    return UserPublic(id=user.id, email=user.email, legacy_id=user.legacy_id)


