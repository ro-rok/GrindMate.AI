"""
Normalizer Service

Normalizes and validates LeetCode question data from GraphQL dumps.
Ensures consistent format and data quality across imports.
"""

from typing import Any, Dict, List, Optional
from dataclasses import dataclass


@dataclass
class NormalizedQuestion:
    """Normalized question data structure"""
    title: str
    titleSlug: str
    difficulty: str  # EASY|MEDIUM|HARD
    questionFrontendId: str
    link: str
    paidOnly: bool
    status: Optional[str]  # SOLVED|TO_DO|ATTEMPTED|UNKNOWN
    topics: List[Dict[str, str]]  # [{name, slug}]
    acRate: float
    frequency: int
    source: str = "leetcode_graphql"


@dataclass
class NormalizationResult:
    """Result of batch normalization"""
    valid: List[NormalizedQuestion]
    invalid: List[Dict[str, Any]]  # {raw, error}
    duplicates: List[str]  # titleSlugs


class NormalizerService:
    """Service for normalizing and validating question data"""
    
    # Required fields for a valid question
    REQUIRED_FIELDS = ['title', 'titleSlug', 'difficulty', 'questionFrontendId']
    
    # Valid difficulty values
    VALID_DIFFICULTIES = {'EASY', 'MEDIUM', 'HARD', 'Easy', 'Medium', 'Hard', 'easy', 'medium', 'hard'}
    
    def normalize_question(self, raw: Dict[str, Any]) -> Optional[NormalizedQuestion]:
        """
        Normalize single question. Returns None if invalid.
        
        Args:
            raw: Raw question data from GraphQL
            
        Returns:
            NormalizedQuestion or None if validation fails
        """
        try:
            # Validate required fields
            for field in self.REQUIRED_FIELDS:
                if field not in raw or raw[field] is None:
                    return None
            
            # Extract and normalize fields
            title = str(raw['title'])
            title_slug = str(raw['titleSlug'])
            difficulty = self._normalize_difficulty(raw['difficulty'])
            question_frontend_id = str(raw['questionFrontendId'])
            
            # Validate difficulty
            if difficulty is None:
                return None
            
            # Extract optional fields with defaults
            paid_only = bool(raw.get('paidOnly', False))
            status = raw.get('status')
            
            # Normalize status if present
            if status:
                status = str(status).upper()
                if status not in ['SOLVED', 'TO_DO', 'ATTEMPTED', 'UNKNOWN']:
                    status = None
            
            # Extract and normalize topics
            topics = self._normalize_topics(raw.get('topicTags', []))
            
            # Extract and normalize acRate
            ac_rate = 0.0
            if 'acRate' in raw and raw['acRate'] is not None:
                try:
                    ac_rate = float(raw['acRate'])
                    # Ensure it's between 0 and 1
                    if ac_rate > 1.0:
                        ac_rate = ac_rate / 100.0  # Convert percentage to decimal
                    ac_rate = max(0.0, min(1.0, ac_rate))  # Clamp to [0, 1]
                except (ValueError, TypeError):
                    ac_rate = 0.0
            
            # Extract and normalize frequency
            frequency = 0
            if 'frequency' in raw and raw['frequency'] is not None:
                try:
                    frequency = int(float(raw['frequency']))
                except (ValueError, TypeError):
                    frequency = 0
            
            # Compute link
            link = self._compute_link(title_slug)
            
            return NormalizedQuestion(
                title=title,
                titleSlug=title_slug,
                difficulty=difficulty,
                questionFrontendId=question_frontend_id,
                link=link,
                paidOnly=paid_only,
                status=status,
                topics=topics,
                acRate=ac_rate,
                frequency=frequency,
                source="leetcode_graphql"
            )
            
        except (KeyError, ValueError, TypeError):
            return None
    
    def normalize_batch(self, questions: List[Dict[str, Any]]) -> NormalizationResult:
        """
        Normalize batch of questions.
        
        Args:
            questions: List of raw question data
            
        Returns:
            NormalizationResult with valid questions, invalid questions with errors, and duplicates
        """
        valid: List[NormalizedQuestion] = []
        invalid: List[Dict[str, Any]] = []
        seen_slugs: Dict[str, int] = {}  # titleSlug -> count
        duplicates: List[str] = []
        
        for raw in questions:
            # Try to normalize
            normalized = self.normalize_question(raw)
            
            if normalized is None:
                # Determine error message
                error = self._get_validation_error(raw)
                invalid.append({
                    'raw': raw,
                    'error': error
                })
                continue
            
            # Track duplicates
            slug = normalized.titleSlug
            if slug in seen_slugs:
                seen_slugs[slug] += 1
                if seen_slugs[slug] == 2:  # First duplicate occurrence
                    duplicates.append(slug)
            else:
                seen_slugs[slug] = 1
            
            valid.append(normalized)
        
        return NormalizationResult(
            valid=valid,
            invalid=invalid,
            duplicates=duplicates
        )
    
    def _normalize_difficulty(self, value: Any) -> Optional[str]:
        """
        Normalize difficulty to EASY|MEDIUM|HARD.
        
        Args:
            value: Raw difficulty value
            
        Returns:
            Normalized difficulty or None if invalid
        """
        if value is None:
            return None
        
        # Convert to string and uppercase
        difficulty = str(value).upper()
        
        # Map to standard values
        if difficulty in ['EASY', 'E', '1']:
            return 'EASY'
        elif difficulty in ['MEDIUM', 'MED', 'M', '2']:
            return 'MEDIUM'
        elif difficulty in ['HARD', 'H', '3']:
            return 'HARD'
        
        return None
    
    def _normalize_topics(self, tags: Any) -> List[Dict[str, str]]:
        """
        Extract name and slug from topicTags.
        
        Args:
            tags: Raw topicTags array
            
        Returns:
            List of topic dicts with name and slug
        """
        if not isinstance(tags, list):
            return []
        
        topics = []
        for tag in tags:
            if not isinstance(tag, dict):
                continue
            
            name = tag.get('name')
            slug = tag.get('slug')
            
            if name and slug:
                topics.append({
                    'name': str(name),
                    'slug': str(slug)
                })
        
        return topics
    
    def _compute_link(self, title_slug: str) -> str:
        """
        Compute LeetCode link from titleSlug.
        
        Args:
            title_slug: Question title slug
            
        Returns:
            Full LeetCode URL
        """
        return f"https://leetcode.com/problems/{title_slug}/"
    
    def _get_validation_error(self, raw: Dict[str, Any]) -> str:
        """
        Determine validation error message for invalid question.
        
        Args:
            raw: Raw question data
            
        Returns:
            Error message describing what's wrong
        """
        # Check for missing required fields
        missing_fields = []
        for field in self.REQUIRED_FIELDS:
            if field not in raw or raw[field] is None:
                missing_fields.append(field)
        
        if missing_fields:
            return f"Missing required fields: {', '.join(missing_fields)}"
        
        # Check for invalid difficulty
        difficulty = raw.get('difficulty')
        if difficulty is not None:
            normalized = self._normalize_difficulty(difficulty)
            if normalized is None:
                return f"Invalid difficulty value: {difficulty}"
        
        return "Validation failed"


# Singleton instance
_normalizer_service: Optional[NormalizerService] = None


def get_normalizer_service() -> NormalizerService:
    """Get or create normalizer service instance"""
    global _normalizer_service
    if _normalizer_service is None:
        _normalizer_service = NormalizerService()
    return _normalizer_service
