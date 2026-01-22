"""
Audit Logger Service

Logs administrative actions for security and compliance tracking.
All admin actions are logged with actor information, action type,
timestamp, and metadata. Sensitive data is sanitized before logging.
"""

from datetime import datetime
from typing import Any, Dict, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import Request

from .sanitizer_service import SanitizerService, get_sanitizer_service


class AuditLoggerService:
    """Service for logging administrative actions"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        """
        Initialize audit logger service.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.sanitizer = get_sanitizer_service()
    
    async def log_action(
        self,
        actor_user_id: str,
        actor_email: str,
        action: str,
        metadata: Dict[str, Any],
        request: Optional[Request] = None
    ) -> ObjectId:
        """
        Log admin action to audit_logs collection.
        
        Args:
            actor_user_id: User ID performing the action
            actor_email: Email of user performing the action
            action: Action type (e.g., "admin_access", "import_preview", "import_commit", 
                    "question_edit", "company_refresh")
            metadata: Action-specific data (counts, ids, changes)
            request: Optional FastAPI request object for extracting IP and user agent
            
        Returns:
            ObjectId of created audit log document
        """
        # Sanitize metadata before logging
        sanitized_metadata = self.sanitizer.sanitize_dict(metadata)
        
        # Extract IP address and user agent from request if available
        ip_address = None
        user_agent = None
        
        if request:
            # Extract IP address (handle proxies with X-Forwarded-For)
            ip_address = self._extract_ip_address(request)
            
            # Extract user agent
            user_agent = request.headers.get("user-agent")
        
        # Create audit log document
        audit_log_doc = {
            'actor_user_id': actor_user_id,
            'actor_email': actor_email,
            'action': action,
            'timestamp': datetime.utcnow(),
            'metadata': sanitized_metadata,
            'ip_address': ip_address,
            'user_agent': user_agent
        }
        
        # Insert into audit_logs collection
        result = await self.db.admin_audit_logs.insert_one(audit_log_doc)
        
        return result.inserted_id
    
    def _extract_ip_address(self, request: Request) -> Optional[str]:
        """
        Extract IP address from request, handling proxies.
        
        Args:
            request: FastAPI request object
            
        Returns:
            IP address string or None
        """
        # Check X-Forwarded-For header first (for proxies/load balancers)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            return forwarded_for.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        
        # Fall back to client host
        if request.client:
            return request.client.host
        
        return None


# Singleton instance
_audit_logger_service: Optional[AuditLoggerService] = None


def get_audit_logger_service(db: AsyncIOMotorDatabase) -> AuditLoggerService:
    """
    Get or create audit logger service instance.
    
    Args:
        db: MongoDB database instance
        
    Returns:
        AuditLoggerService instance
    """
    # Note: We don't use a global singleton here because the service needs a db instance
    # Each call creates a new instance with the provided db
    return AuditLoggerService(db)
