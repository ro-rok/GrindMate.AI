from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import (
    CurrentUser,
    get_database,
    get_user_by_email,
    hash_password,
    verify_password,
)
from ..config import get_settings
from ..models.user import UserInCreate, UserInLogin, UserPublic, UserInDB, UserPreferences
from ..services.auth_service import (
    create_access_token,
    create_refresh_token,
    generate_token_family_id,
    store_refresh_token,
    rotate_refresh_token,
    revoke_refresh_token,
    validate_refresh_token,
)
from ..services.security_question_service import (
    get_security_questions,
    get_security_question_by_id,
    hash_security_answer,
    verify_security_answer,
)


router = APIRouter(tags=["auth"])


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
    request: Request | None = None,
):
    """
    Set authentication cookies (access token, refresh token, CSRF token).
    
    Args:
        response: FastAPI response object
        access_token: JWT access token
        refresh_token: Refresh token
        csrf_token: CSRF token
    """
    settings = get_settings()

    # Determine cookie security settings.
    # Prefer the actual request scheme when available (so production behind HTTPS
    # works even if BACKEND_BASE_URL is misconfigured). Fall back to
    # backend_base_url for environments where Request is not passed.
    if request is not None:
        backend_is_https = request.url.scheme == "https"
    else:
        backend_is_https = settings.backend_base_url.startswith("https://")
    cookie_secure = backend_is_https
    cookie_samesite = "none" if backend_is_https else "lax"

    # Set access token cookie (15 minutes)
    response.set_cookie(
        key=settings.access_token_cookie_name,
        value=access_token,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
    )
    
    # Set refresh token cookie (7 days)
    response.set_cookie(
        key=settings.refresh_token_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )
    
    # Set CSRF token cookie (not HttpOnly - needs to be read by JS)
    response.set_cookie(
        key=settings.csrf_token_cookie_name,
        value=csrf_token,
        httponly=False,  # JS needs to read this
        secure=cookie_secure,
        samesite=cookie_samesite,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )


@router.post("/users", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
@router.post("/users.json", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register_user(
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Register a new user and issue access + refresh tokens.
    """
    # Get JSON body
    body = await request.json()
    
    # Handle both formats: {user: {email, password}} and {email, password}
    if "user" in body:
        email = body["user"].get("email")
        password = body["user"].get("password")
        security_question_id = body["user"].get("security_question_id")
        security_answer = body["user"].get("security_answer")
    else:
        email = body.get("email")
        password = body.get("password")
        security_question_id = body.get("security_question_id")
        security_answer = body.get("security_answer")
    
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email and password are required",
        )
    
    existing = await db["users"].find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email already taken",
        )

    # Validate security question if provided
    security_answer_hash = None
    if security_question_id is not None:
        if not security_answer:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Security answer is required when security question is provided",
            )
        # Validate question ID exists
        question = get_security_question_by_id(security_question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid security question ID",
            )
        # Hash the security answer
        security_answer_hash = hash_security_answer(security_answer)

    doc = {
        "email": email,
        "encrypted_password": hash_password(password),
    }
    
    if security_question_id is not None:
        doc["security_question_id"] = security_question_id
        doc["security_answer_hash"] = security_answer_hash
    result = await db["users"].insert_one(doc)
    doc["_id"] = result.inserted_id
    user_id = str(doc["_id"])
    
    # Generate tokens
    access_token = create_access_token(user_id)
    refresh_token_str = create_refresh_token()
    token_family_id = generate_token_family_id()
    csrf_token = create_refresh_token()  # Use same secure random generation
    
    # Store refresh token in database
    await store_refresh_token(db, user_id, refresh_token_str, token_family_id)
    
    # Set cookies
    set_auth_cookies(response, access_token, refresh_token_str, csrf_token, request=request)
    
    # Return user data with CSRF token in body
    user_public = UserPublic(**doc, id=doc["_id"])
    return {**user_public.model_dump(), "csrf_token": csrf_token}


@router.post("/users/sign_in", response_model=UserPublic)
@router.post("/users/sign_in.json", response_model=UserPublic)
async def login_user(
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Login user and issue access + refresh tokens.
    """
    # Get JSON body
    body = await request.json()
    
    # Handle both formats: {user: {email, password}} and {email, password}
    if "user" in body:
        email = body["user"].get("email")
        password = body["user"].get("password")
    else:
        email = body.get("email")
        password = body.get("password")
    
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email and password are required",
        )
    
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.encrypted_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    user_id = str(user.id)
    
    # Generate tokens
    access_token = create_access_token(user_id)
    refresh_token_str = create_refresh_token()
    token_family_id = generate_token_family_id()
    csrf_token = create_refresh_token()  # Use same secure random generation
    
    # Store refresh token in database
    await store_refresh_token(db, user_id, refresh_token_str, token_family_id)
    
    # Set cookies
    set_auth_cookies(response, access_token, refresh_token_str, csrf_token, request=request)
    
    # Return user data with CSRF token in body
    user_public = UserPublic(id=user.id, email=user.email, legacy_id=user.legacy_id)
    return {**user_public.model_dump(), "csrf_token": csrf_token}


@router.post("/auth/refresh", status_code=status.HTTP_200_OK)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Refresh access token using refresh token (with token rotation).
    """
    settings = get_settings()
    
    # Get refresh token from cookie
    old_refresh_token = request.cookies.get(settings.refresh_token_cookie_name)
    if not old_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )
    
    # Validate and get user from refresh token
    refresh_token_doc, error = await validate_refresh_token(db, old_refresh_token)
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error
        )
    
    user_id = str(refresh_token_doc.user_id)
    
    # Rotate refresh token
    new_refresh_token, rotate_error = await rotate_refresh_token(db, old_refresh_token, user_id)
    
    if rotate_error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=rotate_error
        )
    
    # Generate new access token
    new_access_token = create_access_token(user_id)
    
    # Generate new CSRF token
    new_csrf_token = create_refresh_token()
    
    # Set new cookies
    set_auth_cookies(response, new_access_token, new_refresh_token, new_csrf_token, request=request)
    
    return {
        "message": "Token refreshed successfully",
        "csrf_token": new_csrf_token
    }


@router.delete("/users/sign_out", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/users/sign_out.json", status_code=status.HTTP_204_NO_CONTENT)
async def logout_user(
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Logout user and invalidate refresh token.
    """
    settings = get_settings()
    
    # Get refresh token from cookie
    refresh_token_str = request.cookies.get(settings.refresh_token_cookie_name)
    
    # Revoke refresh token if present
    if refresh_token_str:
        await revoke_refresh_token(db, refresh_token_str)
    
    # Clear all auth cookies
    response.delete_cookie(key=settings.access_token_cookie_name)
    response.delete_cookie(key=settings.refresh_token_cookie_name)
    response.delete_cookie(key=settings.csrf_token_cookie_name)
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/users/current", response_model=UserPublic)
async def current_user(user: CurrentUser):
    return UserPublic(
        id=user.id,
        email=user.email,
        legacy_id=user.legacy_id,
        security_question_id=user.security_question_id,
        role=user.role,
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        last_solve_date=user.last_solve_date,
        timezone=user.timezone,
        rate_budget_tokens=user.rate_budget_tokens,
        rate_budget_requests=user.rate_budget_requests,
        rate_budget_reset_at=user.rate_budget_reset_at,
        tutor_mode=user.tutor_mode,
        is_premium=user.is_premium,
        preferences=user.preferences if isinstance(user.preferences, dict) else UserPreferences(),
    )


@router.get("/users/current.json", response_model=UserPublic)
async def current_user_json(user: CurrentUser):
    """Alias for /users/current with .json extension for frontend compatibility"""
    return UserPublic(
        id=user.id,
        email=user.email,
        legacy_id=user.legacy_id,
        security_question_id=user.security_question_id,
        role=user.role,
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        last_solve_date=user.last_solve_date,
        timezone=user.timezone,
        rate_budget_tokens=user.rate_budget_tokens,
        rate_budget_requests=user.rate_budget_requests,
        rate_budget_reset_at=user.rate_budget_reset_at,
        tutor_mode=user.tutor_mode,
        is_premium=user.is_premium,
        preferences=user.preferences if isinstance(user.preferences, dict) else UserPreferences(),
    )


@router.get("/auth/security-questions")
@router.get("/auth/security-questions.json")
async def get_security_questions_endpoint():
    """
    Get list of available security questions.
    
    Returns:
        List of security questions with id and question text
    """
    return {"questions": get_security_questions()}


@router.post("/auth/forget-password/initiate")
@router.post("/auth/forget-password/initiate.json")
async def forget_password_initiate(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Initiate password reset by email. Returns the user's security question.
    
    Request body:
        {"email": "user@example.com"}
    
    Returns:
        {"security_question_id": 1, "security_question": "What city were you born in?"}
    """
    body = await request.json()
    email = body.get("email")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email is required",
        )
    
    user = await get_user_by_email(db, email)
    if not user:
        # Don't reveal if user exists for security
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="If an account exists with this email, a security question will be returned",
        )
    
    if not user.security_question_id or not user.security_answer_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security question not set for this account. Please contact support.",
        )
    
    question = get_security_question_by_id(user.security_question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid security question configuration",
        )
    
    return {
        "security_question_id": question["id"],
        "security_question": question["question"],
    }


@router.post("/auth/forget-password/verify")
@router.post("/auth/forget-password/verify.json")
async def forget_password_verify(
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Verify security answer and reset password.
    
    Request body:
        {
            "email": "user@example.com",
            "security_answer": "New York",
            "new_password": "newSecurePassword123"
        }
    
    Returns:
        Success message
    """
    body = await request.json()
    email = body.get("email")
    security_answer = body.get("security_answer")
    new_password = body.get("new_password")
    
    if not email or not security_answer or not new_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email, security answer, and new password are required",
        )
    
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 6 characters",
        )
    
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    if not user.security_question_id or not user.security_answer_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security question not set for this account",
        )
    
    # Verify security answer
    if not verify_security_answer(security_answer, user.security_answer_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect security answer",
        )
    
    # Update password
    from bson import ObjectId
    await db["users"].update_one(
        {"_id": ObjectId(user.id)},
        {"$set": {"encrypted_password": hash_password(new_password)}}
    )
    
    # Optionally invalidate all refresh tokens for security
    # This would require querying refresh_tokens collection
    
    return {
        "message": "Password reset successfully. Please log in with your new password.",
    }


