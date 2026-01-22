"""
Timezone utility functions with Windows fallback support.

Provides timezone handling that works across platforms, including Windows
environments where tzdata may not be available.

Requirements: 1.1, 1.2
"""

from datetime import timezone
from typing import Union


def get_utc_timezone() -> Union[timezone, object]:
    """
    Get UTC timezone with fallback for Windows environments.
    
    Returns:
        timezone object (datetime.timezone.utc or ZoneInfo("UTC"))
        
    Requirements: 1.1, 1.2
    """
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo("UTC")
    except (ImportError, Exception):
        # Fallback for Windows without tzdata
        return timezone.utc


def get_user_timezone(tz_string: str) -> Union[timezone, object]:
    """
    Get user timezone with fallback to UTC.
    
    Args:
        tz_string: IANA timezone string (e.g., "America/Los_Angeles")
        
    Returns:
        timezone object or UTC fallback
        
    Requirements: 1.1, 1.2
    """
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo(tz_string)
    except (ImportError, Exception):
        # Fallback to UTC if timezone unavailable or invalid
        return timezone.utc
