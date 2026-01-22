from datetime import datetime
from typing import Optional, List, Dict
from .common import MongoModel, PyObjectId


class ImportBatch(MongoModel):
    """
    Model for tracking import batch operations.
    
    Each import creates a batch record with metadata about the operation,
    including counts, payload hash, and references to affected questions.
    """
    type: str  # "leetcode_graphql"
    list_name: str
    source: str  # "leetcode_favorites"
    actor: str  # user_id
    actor_email: str
    payload_hash: str  # SHA-256 of sanitized normalized payload
    counts: Dict[str, int]  # {total, created, updated, skipped, invalid}
    question_refs: List[PyObjectId] = []  # Questions created/updated
    notes: Optional[str] = None
    errors: List[Dict] = []  # Validation errors
