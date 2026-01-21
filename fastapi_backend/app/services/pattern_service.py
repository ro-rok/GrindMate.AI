"""
Pattern mapping service for deriving problem-solving patterns from question topics.
"""
import json
import os
from pathlib import Path
from typing import List, Dict, Set
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class PatternService:
    """Service for managing pattern mappings and derivation."""
    
    def __init__(self):
        self.config_path = Path(__file__).parent.parent / "config" / "patterns_v1.json"
        self.mappings: Dict[str, List[str]] = {}
        self.pattern_descriptions: Dict[str, str] = {}
        self.version: str = ""
        self.last_loaded: datetime | None = None
        self.last_modified: float = 0
        self._load_config()
    
    def _load_config(self) -> None:
        """Load pattern mappings from JSON config file."""
        try:
            if not self.config_path.exists():
                logger.error(f"Pattern config file not found: {self.config_path}")
                return
            
            # Check file modification time
            current_mtime = os.path.getmtime(self.config_path)
            
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            self.mappings = config.get("mappings", {})
            self.pattern_descriptions = config.get("pattern_descriptions", {})
            self.version = config.get("version", "unknown")
            self.last_loaded = datetime.utcnow()
            self.last_modified = current_mtime
            
            logger.info(
                f"Loaded pattern config v{self.version} with "
                f"{len(self.mappings)} topic mappings and "
                f"{len(self.pattern_descriptions)} pattern descriptions"
            )
        except Exception as e:
            logger.error(f"Error loading pattern config: {e}")
            # Keep existing mappings if reload fails
    
    def reload_if_modified(self) -> bool:
        """
        Check if config file has been modified and reload if necessary.
        Returns True if config was reloaded.
        """
        try:
            if not self.config_path.exists():
                return False
            
            current_mtime = os.path.getmtime(self.config_path)
            if current_mtime > self.last_modified:
                logger.info("Pattern config file modified, reloading...")
                self._load_config()
                return True
        except Exception as e:
            logger.error(f"Error checking config modification: {e}")
        
        return False
    
    def derive_patterns(self, topics: str) -> List[str]:
        """
        Derive patterns from comma-separated topics string.
        
        Args:
            topics: Comma-separated string of topics (e.g., "array,hash-table,two-pointers")
        
        Returns:
            List of unique patterns derived from the topics
        """
        if not topics:
            return []
        
        # Hot-reload check in development
        if os.getenv("ENVIRONMENT", "development") == "development":
            self.reload_if_modified()
        
        patterns: Set[str] = set()
        
        # Split topics and normalize (lowercase, strip whitespace)
        topic_list = [t.strip().lower() for t in topics.split(',') if t.strip()]
        
        for topic in topic_list:
            # Look up patterns for this topic
            if topic in self.mappings:
                patterns.update(self.mappings[topic])
        
        # Return sorted list for consistency
        return sorted(list(patterns))
    
    def get_pattern_description(self, pattern: str) -> str | None:
        """
        Get description for a specific pattern.
        
        Args:
            pattern: Pattern name (e.g., "two-pointers")
        
        Returns:
            Pattern description or None if not found
        """
        return self.pattern_descriptions.get(pattern)
    
    def get_all_patterns(self) -> List[Dict[str, str]]:
        """
        Get all available patterns with descriptions.
        
        Returns:
            List of dicts with 'name' and 'description' keys
        """
        return [
            {"name": name, "description": desc}
            for name, desc in sorted(self.pattern_descriptions.items())
        ]
    
    def get_config_info(self) -> Dict:
        """
        Get information about the current pattern config.
        
        Returns:
            Dict with version, last_loaded, and mapping counts
        """
        return {
            "version": self.version,
            "last_loaded": self.last_loaded.isoformat() if self.last_loaded else None,
            "topic_count": len(self.mappings),
            "pattern_count": len(self.pattern_descriptions),
            "config_path": str(self.config_path)
        }


# Global singleton instance
_pattern_service: PatternService | None = None


def get_pattern_service() -> PatternService:
    """Get or create the global PatternService instance."""
    global _pattern_service
    if _pattern_service is None:
        _pattern_service = PatternService()
    return _pattern_service
