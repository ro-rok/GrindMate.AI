"""
Admin Router Error Handlers

Provides comprehensive error handling for admin routes with safe error messages.
Ensures no internal details or stack traces are exposed to clients.

Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pymongo.errors import PyMongoError, DuplicateKeyError, ConnectionFailure
from ..config import get_settings


class AdminError(Exception):
    """Base exception for admin operations"""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ParsingError(AdminError):
    """Exception for parsing failures"""
    def __init__(self, message: str, parse_stage: Optional[str] = None, hint: Optional[str] = None, excerpt: Optional[str] = None):
        details = {}
        if parse_stage:
            details["parse_stage_failed"] = parse_stage
        if hint:
            details["hint"] = hint
        if excerpt:
            details["sanitized_excerpt"] = excerpt
        super().__init__(message, status_code=400, details=details)


class ValidationError(AdminError):
    """Exception for validation failures"""
    def __init__(self, message: str, errors: list):
        super().__init__(message, status_code=400, details={"errors": errors})


class DatabaseError(AdminError):
    """Exception for database operation failures"""
    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message, status_code=500)


class AuthorizationError(AdminError):
    """Exception for authorization failures"""
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=403)


def add_cors_headers(response: JSONResponse, request: Request) -> JSONResponse:
    """
    Add CORS headers to a response based on the request origin.
    
    This ensures that error responses include CORS headers so they can be
    read by the frontend even when errors occur.
    """
    settings = get_settings()
    origin = request.headers.get("origin")
    
    # Check if origin is allowed
    allowed_origins = settings.frontend_origins_list
    if origin and origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response


async def admin_error_handler(request: Request, exc: AdminError) -> JSONResponse:
    """
    Handle AdminError exceptions.
    
    Returns safe error response without internal details.
    """
    response_data = {
        "error": exc.message,
        **exc.details
    }
    
    response = JSONResponse(
        status_code=exc.status_code,
        content=response_data
    )
    return add_cors_headers(response, request)


async def parsing_error_handler(request: Request, exc: ParsingError) -> JSONResponse:
    """
    Handle parsing errors (400 with structured error).
    
    Requirements: 15.1
    """
    response_data = {
        "error": exc.message,
        **exc.details
    }
    
    response = JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=response_data
    )
    return add_cors_headers(response, request)


async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """
    Handle validation errors (400 with error list).
    
    Requirements: 15.2
    """
    response_data = {
        "error": exc.message,
        "errors": exc.details.get("errors", [])
    }
    
    response = JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=response_data
    )
    return add_cors_headers(response, request)


async def database_error_handler(request: Request, exc: DatabaseError) -> JSONResponse:
    """
    Handle database errors (500 with safe message).
    
    Requirements: 15.3
    """
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Database operation failed",
            "message": "An error occurred while processing your request. Please try again later."
        }
    )
    return add_cors_headers(response, request)


async def authorization_error_handler(request: Request, exc: AuthorizationError) -> JSONResponse:
    """
    Handle authorization errors (403 with "Unauthorized").
    
    Requirements: 15.4
    """
    response = JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "error": "Unauthorized",
            "message": "You do not have permission to access this resource."
        }
    )
    return add_cors_headers(response, request)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handle FastAPI HTTPException with safe messages.
    
    Ensures no internal details are exposed.
    Requirements: 15.5
    """
    # For admin routes, ensure error messages are safe
    if request.url.path.startswith("/api/admin"):
        # Map status codes to safe messages
        safe_messages = {
            400: "Bad request. Please check your input.",
            401: "Authentication required.",
            403: "Unauthorized",
            404: "Resource not found.",
            429: "Rate limit exceeded. Please try again later.",
            500: "Internal server error. Please try again later.",
            503: "Service temporarily unavailable."
        }
        
        message = safe_messages.get(exc.status_code, "An error occurred.")
        
        # For specific errors, preserve the detail if it's safe
        if exc.status_code in [400, 404, 429]:
            message = exc.detail if exc.detail else message
        
        response = JSONResponse(
            status_code=exc.status_code,
            content={
                "error": message
            }
        )
    else:
        # For non-admin routes, return original exception
        response = JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail
            }
        )
    
    return add_cors_headers(response, request)


async def pymongo_error_handler(request: Request, exc: PyMongoError) -> JSONResponse:
    """
    Handle PyMongo database errors with safe messages.
    
    Ensures no internal database details or stack traces are exposed.
    Requirements: 15.3, 15.5
    """
    # Log the actual error for debugging (in production, use proper logging)
    # print(f"Database error: {type(exc).__name__}: {str(exc)}")
    
    # Return safe error message
    if isinstance(exc, DuplicateKeyError):
        response = JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "Duplicate entry",
                "message": "A record with this identifier already exists."
            }
        )
    elif isinstance(exc, ConnectionFailure):
        response = JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": "Database unavailable",
                "message": "Unable to connect to database. Please try again later."
            }
        )
    else:
        response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Database operation failed",
                "message": "An error occurred while processing your request. Please try again later."
            }
        )
    
    return add_cors_headers(response, request)


async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """
    Handle ValueError exceptions (typically from parsing/validation).
    
    For admin routes, convert to safe error messages.
    Requirements: 15.1, 15.5
    """
    if request.url.path.startswith("/api/admin"):
        # Check if this is a parsing error (from importer service)
        error_message = str(exc)
        
        # If error message contains parsing hints, preserve them
        if "Could not parse" in error_message or "parse" in error_message.lower():
            response = JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "Could not parse input",
                    "message": error_message
                }
            )
        else:
            # Generic validation error
            response = JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "Validation failed",
                    "message": error_message
                }
            )
    else:
        # For non-admin routes, return generic error
        response = JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": str(exc)
            }
        )
    
    return add_cors_headers(response, request)


async def request_validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle Pydantic validation errors with safe messages.
    
    Requirements: 15.2, 15.5
    """
    # Extract validation errors
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        message = error["msg"]
        errors.append({
            "field": field,
            "message": message
        })
    
    response = JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Validation failed",
            "errors": errors
        }
    )
    return add_cors_headers(response, request)


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle any unhandled exceptions with safe messages.
    
    Ensures no internal details or stack traces are exposed.
    Requirements: 15.5
    """
    # Log the actual error for debugging (in production, use proper logging)
    # print(f"Unhandled exception: {type(exc).__name__}: {str(exc)}")
    
    # For admin routes, return safe generic error
    if request.url.path.startswith("/api/admin"):
        response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal server error",
                "message": "An unexpected error occurred. Please try again later."
            }
        )
    else:
        # For non-admin routes, return generic error
        response = JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal server error"
            }
        )
    
    return add_cors_headers(response, request)


def register_admin_error_handlers(app):
    """
    Register all admin error handlers with the FastAPI app.
    
    Args:
        app: FastAPI application instance
    """
    # Custom admin errors
    app.add_exception_handler(AdminError, admin_error_handler)
    app.add_exception_handler(ParsingError, parsing_error_handler)
    app.add_exception_handler(ValidationError, validation_error_handler)
    app.add_exception_handler(DatabaseError, database_error_handler)
    app.add_exception_handler(AuthorizationError, authorization_error_handler)
    
    # FastAPI/Pydantic errors
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, request_validation_error_handler)
    
    # Database errors
    app.add_exception_handler(PyMongoError, pymongo_error_handler)
    
    # Python built-in errors
    app.add_exception_handler(ValueError, value_error_handler)
    
    # Catch-all for any unhandled exceptions
    app.add_exception_handler(Exception, generic_exception_handler)
