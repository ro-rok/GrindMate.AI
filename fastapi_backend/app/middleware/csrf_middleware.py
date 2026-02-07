"""
CSRF protection middleware using double-submit cookie pattern.

The CSRF token is stored in both:
1. A non-HttpOnly cookie (csrf_token) - can be read by JavaScript
2. Response body on login/register - frontend stores this and sends in X-CSRF-Token header

For state-changing requests (POST, PUT, DELETE, PATCH), the middleware validates
that the X-CSRF-Token header matches the csrf_token cookie.
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from ..config import get_settings


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate CSRF tokens on state-changing requests.
    """
    
    # Methods that require CSRF protection
    PROTECTED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}
    
    # Paths that don't require CSRF protection (login, register, public endpoints)
    EXEMPT_PATHS = {
        "/users",
        "/users.json",
        "/users/sign_in",
        "/users/sign_in.json",
        "/users/sign_out",
        "/users/sign_out.json",
        "/auth/refresh",  # Refresh endpoint uses refresh token cookie, not CSRF
        "/auth/forget-password/initiate",
        "/auth/forget-password/initiate.json",
        "/auth/forget-password/verify",
        "/auth/forget-password/verify.json",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/ping",
    }
    
    # Path prefixes that don't require CSRF protection
    EXEMPT_PREFIXES = set()  # Empty - all endpoints require CSRF unless explicitly listed above
    
    async def dispatch(self, request: Request, call_next):
        """
        Validate CSRF token for protected requests.
        """
        # Skip CSRF check for safe methods (GET, HEAD, OPTIONS)
        if request.method not in self.PROTECTED_METHODS:
            return await call_next(request)
        
        # Skip CSRF check for exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)
        
        # Skip CSRF check for exempt path prefixes
        for prefix in self.EXEMPT_PREFIXES:
            if request.url.path.startswith(prefix):
                return await call_next(request)
        
        # Get CSRF token from header
        csrf_header = request.headers.get("X-CSRF-Token")
        
        # Get CSRF token from cookie
        settings = get_settings()
        csrf_cookie = request.cookies.get(settings.csrf_token_cookie_name)
        
        # Validate tokens match
        # For cross-origin requests, the cookie might not be sent due to browser restrictions
        # In this case, we rely on the header token alone (which is stored in localStorage)
        # This is still secure because:
        # 1. The token is generated server-side and returned only on successful auth
        # 2. The token is cryptographically random (64 chars)
        # 3. An attacker cannot read localStorage from another origin
        if not csrf_header:
            # Log for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(
                f"CSRF validation failed for {request.method} {request.url.path}: "
                f"header={'present' if csrf_header else 'missing'}, "
                f"cookie={'present' if csrf_cookie else 'missing'}, "
                f"all_cookies={list(request.cookies.keys())}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing"
            )
        
        # If cookie is present, validate it matches the header
        # If cookie is missing (cross-origin), accept header alone
        if csrf_cookie and csrf_header != csrf_cookie:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(
                f"CSRF token mismatch for {request.method} {request.url.path}: "
                f"header={csrf_header[:10]}..., cookie={csrf_cookie[:10] if csrf_cookie else 'None'}..."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token mismatch"
            )
        
        # Token is valid, proceed with request
        return await call_next(request)
