"""
Rate Limit Middleware

Provides IP-based and account-based rate limiting for abuse prevention.
Adds rate budget information to response headers.
"""

from datetime import datetime, timedelta
from typing import Dict, Optional
import time

from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from ..db import get_database
from ..services.rate_limit_service import get_rate_limit_service


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware for rate limiting requests
    
    Implements:
    - IP-based rate limiting (100 req/min per IP)
    - Account-based rate limiting (1000 req/hour per user)
    - Adds rate budget headers to AI endpoint responses
    """
    
    # In-memory storage for IP rate limits (simple implementation)
    # In production, use Redis for distributed rate limiting
    ip_requests: Dict[str, list] = {}
    account_requests: Dict[str, list] = {}
    
    # Rate limit windows
    IP_WINDOW_SECONDS = 60  # 1 minute
    IP_MAX_REQUESTS = 100
    
    ACCOUNT_WINDOW_SECONDS = 3600  # 1 hour
    ACCOUNT_MAX_REQUESTS = 1000
    
    # Paths that require stricter rate limiting
    AUTH_PATHS = ["/auth/login", "/auth/register"]
    AUTH_WINDOW_SECONDS = 60  # 1 minute
    AUTH_MAX_REQUESTS = 5
    
    AI_PATHS = ["/questions/", "/hints/", "/chat"]
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.rate_limit_service = get_rate_limit_service()
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Check IP-based rate limit
        if not self._check_ip_rate_limit(client_ip, request.url.path):
            return Response(
                content='{"error": "Too many requests from this IP"}',
                status_code=429,
                media_type="application/json",
                headers={
                    "Retry-After": str(self.IP_WINDOW_SECONDS),
                    "X-RateLimit-Limit": str(self.IP_MAX_REQUESTS),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + self.IP_WINDOW_SECONDS)
                }
            )
        
        # Get user ID from request state (set by auth middleware)
        user_id = getattr(request.state, "user_id", None)
        
        # Check account-based rate limit if authenticated
        if user_id:
            if not self._check_account_rate_limit(user_id):
                return Response(
                    content='{"error": "Too many requests from this account"}',
                    status_code=429,
                    media_type="application/json",
                    headers={
                        "Retry-After": str(self.ACCOUNT_WINDOW_SECONDS),
                        "X-RateLimit-Limit": str(self.ACCOUNT_MAX_REQUESTS),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(time.time()) + self.ACCOUNT_WINDOW_SECONDS)
                    }
                )
        
        # Process request
        response = await call_next(request)
        
        # Add rate budget headers for AI endpoints
        if user_id and self._is_ai_endpoint(request.url.path):
            await self._add_rate_budget_headers(response, user_id)
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address from request"""
        # Check X-Forwarded-For header (for proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take first IP in chain
            return forwarded.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to direct client
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def _check_ip_rate_limit(self, ip: str, path: str) -> bool:
        """
        Check IP-based rate limit
        
        Returns True if request is allowed, False if rate limited
        """
        now = time.time()
        
        # Determine limits based on path
        if any(auth_path in path for auth_path in self.AUTH_PATHS):
            window = self.AUTH_WINDOW_SECONDS
            max_requests = self.AUTH_MAX_REQUESTS
        else:
            window = self.IP_WINDOW_SECONDS
            max_requests = self.IP_MAX_REQUESTS
        
        # Get request history for this IP
        if ip not in self.ip_requests:
            self.ip_requests[ip] = []
        
        # Remove old requests outside window
        self.ip_requests[ip] = [
            req_time for req_time in self.ip_requests[ip]
            if now - req_time < window
        ]
        
        # Check if limit exceeded
        if len(self.ip_requests[ip]) >= max_requests:
            return False
        
        # Record this request
        self.ip_requests[ip].append(now)
        
        # Cleanup old IPs periodically (simple memory management)
        if len(self.ip_requests) > 10000:
            self._cleanup_old_ips()
        
        return True
    
    def _check_account_rate_limit(self, user_id: str) -> bool:
        """
        Check account-based rate limit
        
        Returns True if request is allowed, False if rate limited
        """
        now = time.time()
        
        # Get request history for this account
        if user_id not in self.account_requests:
            self.account_requests[user_id] = []
        
        # Remove old requests outside window
        self.account_requests[user_id] = [
            req_time for req_time in self.account_requests[user_id]
            if now - req_time < self.ACCOUNT_WINDOW_SECONDS
        ]
        
        # Check if limit exceeded
        if len(self.account_requests[user_id]) >= self.ACCOUNT_MAX_REQUESTS:
            return False
        
        # Record this request
        self.account_requests[user_id].append(now)
        
        # Cleanup old accounts periodically
        if len(self.account_requests) > 10000:
            self._cleanup_old_accounts()
        
        return True
    
    def _is_ai_endpoint(self, path: str) -> bool:
        """Check if path is an AI endpoint"""
        return any(ai_path in path for ai_path in self.AI_PATHS)
    
    async def _add_rate_budget_headers(
        self,
        response: Response,
        user_id: str
    ) -> None:
        """Add rate budget information to response headers"""
        try:
            # Get user to get timezone
            db = get_database()
            user = await db["users"].find_one({"_id": __import__("bson").ObjectId(user_id)})
            user_timezone = user.get("timezone", "UTC") if user else "UTC"
            
            # Get rate budget
            budget = await self.rate_limit_service.get_rate_budget(
                user_id, user_timezone
            )
            
            # Add headers
            response.headers["X-RateLimit-Tokens-Remaining"] = str(budget["tokens_remaining"])
            response.headers["X-RateLimit-Requests-Remaining"] = str(budget["requests_remaining"])
            
            if budget["reset_at"]:
                # Convert ISO string to Unix timestamp
                reset_dt = datetime.fromisoformat(budget["reset_at"])
                reset_timestamp = int(reset_dt.timestamp())
                response.headers["X-RateLimit-Reset"] = str(reset_timestamp)
            
            if budget.get("byok_mode"):
                response.headers["X-RateLimit-BYOK"] = "true"
        
        except Exception as e:
            # Don't fail request if header addition fails
            print(f"Error adding rate budget headers: {e}")
    
    def _cleanup_old_ips(self) -> None:
        """Remove IPs with no recent requests"""
        now = time.time()
        to_remove = []
        
        for ip, requests in self.ip_requests.items():
            # Remove if no requests in last hour
            if not requests or now - max(requests) > 3600:
                to_remove.append(ip)
        
        for ip in to_remove:
            del self.ip_requests[ip]
    
    def _cleanup_old_accounts(self) -> None:
        """Remove accounts with no recent requests"""
        now = time.time()
        to_remove = []
        
        for user_id, requests in self.account_requests.items():
            # Remove if no requests in last 2 hours
            if not requests or now - max(requests) > 7200:
                to_remove.append(user_id)
        
        for user_id in to_remove:
            del self.account_requests[user_id]
