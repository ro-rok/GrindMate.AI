"""
Sanitizer Service

Removes sensitive data from GraphQL dumps and other input before storage or logging.
Prevents exposure of authentication tokens, cookies, and session data.
"""

import re
import hashlib
import json
from typing import Any, Dict, List, Optional, Union


class SanitizerService:
    """Service for sanitizing sensitive data from input"""
    
    # Regex pattern to match sensitive field names
    SENSITIVE_KEYS = re.compile(
        r'(token|csrf|cookie|session|authorization|bearer|refresh|access|secret)',
        re.IGNORECASE
    )
    
    # Pattern to match Bearer tokens in values
    BEARER_PATTERN = re.compile(r'Bearer\s+[\w\-\.]+', re.IGNORECASE)
    
    # Pattern to match JWT tokens (xxx.yyy.zzz format)
    JWT_PATTERN = re.compile(r'[\w\-]+\.[\w\-]+\.[\w\-]+')
    
    REDACTED = "[REDACTED]"
    MAX_RECURSION_DEPTH = 100
    
    def sanitize_dict(self, data: Dict[str, Any], max_depth: int = 100, _current_depth: int = 0) -> Dict[str, Any]:
        """
        Recursively sanitize dictionary, removing sensitive fields.
        
        Args:
            data: Dictionary to sanitize
            max_depth: Maximum recursion depth (default 100)
            _current_depth: Internal parameter tracking current depth
            
        Returns:
            Sanitized copy of the dictionary
        """
        # Enforce recursion depth limit
        if _current_depth >= max_depth:
            return {"error": "Max recursion depth exceeded"}
        
        if not isinstance(data, dict):
            return data
        
        sanitized = {}
        
        for key, value in data.items():
            # Check if key matches sensitive pattern
            if self.SENSITIVE_KEYS.search(key):
                sanitized[key] = self.REDACTED
                continue
            
            # Recursively sanitize nested structures
            if isinstance(value, dict):
                sanitized[key] = self.sanitize_dict(value, max_depth, _current_depth + 1)
            elif isinstance(value, list):
                sanitized[key] = self._sanitize_list(value, max_depth, _current_depth + 1)
            elif isinstance(value, str):
                sanitized[key] = self.sanitize_string(value)
            else:
                sanitized[key] = value
        
        return sanitized
    
    def _sanitize_list(self, data: List[Any], max_depth: int, current_depth: int) -> List[Any]:
        """
        Recursively sanitize list items.
        
        Args:
            data: List to sanitize
            max_depth: Maximum recursion depth
            current_depth: Current recursion depth
            
        Returns:
            Sanitized copy of the list
        """
        if current_depth >= max_depth:
            return ["Max recursion depth exceeded"]
        
        sanitized = []
        
        for item in data:
            if isinstance(item, dict):
                sanitized.append(self.sanitize_dict(item, max_depth, current_depth))
            elif isinstance(item, list):
                sanitized.append(self._sanitize_list(item, max_depth, current_depth + 1))
            elif isinstance(item, str):
                sanitized.append(self.sanitize_string(item))
            else:
                sanitized.append(item)
        
        return sanitized
    
    def sanitize_string(self, text: str) -> str:
        """
        Sanitize string by replacing sensitive patterns with [REDACTED].
        
        Args:
            text: String to sanitize
            
        Returns:
            Sanitized string
        """
        if not isinstance(text, str):
            return text
        
        # Replace Bearer tokens
        text = self.BEARER_PATTERN.sub(self.REDACTED, text)
        
        # Replace JWT tokens
        text = self.JWT_PATTERN.sub(self.REDACTED, text)
        
        return text
    
    def compute_payload_hash(self, data: Union[List[Dict[str, Any]], Dict[str, Any]]) -> str:
        """
        Compute SHA-256 hash of sanitized normalized payload.
        
        Args:
            data: Payload to hash (list of dicts or single dict)
            
        Returns:
            Hexadecimal SHA-256 hash string
        """
        # Sanitize the data first
        if isinstance(data, list):
            sanitized = [self.sanitize_dict(item) if isinstance(item, dict) else item for item in data]
        elif isinstance(data, dict):
            sanitized = self.sanitize_dict(data)
        else:
            sanitized = data
        
        # Convert to JSON string with sorted keys for consistent hashing
        json_str = json.dumps(sanitized, sort_keys=True, default=str)
        
        # Compute SHA-256 hash
        hash_obj = hashlib.sha256(json_str.encode('utf-8'))
        
        return hash_obj.hexdigest()


# Singleton instance
_sanitizer_service: Optional[SanitizerService] = None


def get_sanitizer_service() -> SanitizerService:
    """Get or create sanitizer service instance"""
    global _sanitizer_service
    if _sanitizer_service is None:
        _sanitizer_service = SanitizerService()
    return _sanitizer_service
