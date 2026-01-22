from datetime import datetime
from typing import Optional, Dict
from .common import MongoModel


class AuditLog(MongoModel):
    """
    Model for tracking administrative actions.
    
    All admin actions are logged with actor information, action type,
    timestamp, and metadata. Sensitive data is sanitized before logging.
    """
    actor_user_id: str
    actor_email: str
    action: str  # "admin_access" | "import_preview" | "import_commit" | "question_edit" | "company_refresh"
    timestamp: datetime
    metadata: Dict = {}  # Action-specific data (counts, ids, changes)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
