"""
Parser Service

Parses raw GraphQL response dumps from browser DevTools through a multi-stage pipeline.
Handles malformed JSON with unquoted keys, trailing commas, and DevTools artifacts.
"""

import json
import re
from typing import Any, Dict, List, Optional
from dataclasses import dataclass


@dataclass
class ParseResult:
    """Result of parsing operation"""
    success: bool
    questions: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
    parse_stage_failed: Optional[str] = None  # "json_parse" | "jsonish_parse" | "array_extract"
    hint: Optional[str] = None
    sanitized_excerpt: Optional[str] = None


class ParserService:
    """Service for parsing raw GraphQL dumps through multi-stage pipeline"""
    
    # Constants
    MAX_INPUT_SIZE = 2 * 1024 * 1024  # 2MB
    MAX_QUESTIONS = 5000
    MAX_RECURSION_DEPTH = 100
    
    # Patterns
    ELLIPSIS_PATTERN = re.compile(r'\.\.\.')
    TRAILING_COMMA_PATTERN = re.compile(r',(\s*[}\]])')
    ARRAY_SHORTHAND_PATTERN = re.compile(r'Array\(\d+\)')
    UNQUOTED_KEY_PATTERN = re.compile(r'(\w+)(\s*:\s*)')
    SINGLE_QUOTE_PATTERN = re.compile(r"'([^']*)'")
    
    def parse(self, raw_input: str) -> ParseResult:
        """
        Parse raw input through multi-stage pipeline.
        
        Args:
            raw_input: Raw GraphQL dump text
            
        Returns:
            ParseResult with questions array or error
        """
        # Validate input size
        if len(raw_input) > self.MAX_INPUT_SIZE:
            return ParseResult(
                success=False,
                error="Input too large",
                hint=f"Input exceeds maximum size of {self.MAX_INPUT_SIZE / (1024 * 1024)}MB"
            )
        
        # Check for array shorthand
        if self._detect_array_shorthand(raw_input):
            return ParseResult(
                success=False,
                error="Array shorthand detected",
                hint="Dump is not expanded; expand questions array before copying",
                sanitized_excerpt=self._get_excerpt(raw_input)
            )
        
        # Check for truncation
        if self._detect_truncation(raw_input):
            return ParseResult(
                success=False,
                error="Input appears truncated",
                hint="Looks truncated; re-copy full object",
                sanitized_excerpt=self._get_excerpt(raw_input)
            )
        
        # Stage 1: Try standard JSON parse after pre-cleaning
        result = self._stage1_json_parse(raw_input)
        if result:
            questions = self._extract_questions_array(result)
            if questions is not None:
                # Validate question count
                if len(questions) > self.MAX_QUESTIONS:
                    return ParseResult(
                        success=False,
                        error="Too many questions",
                        hint=f"Input contains {len(questions)} questions, maximum is {self.MAX_QUESTIONS}"
                    )
                return ParseResult(success=True, questions=questions)
        
        # Stage 2: Try JSON-ish transformation
        result = self._stage2_jsonish_transform(raw_input)
        if result:
            questions = self._extract_questions_array(result)
            if questions is not None:
                if len(questions) > self.MAX_QUESTIONS:
                    return ParseResult(
                        success=False,
                        error="Too many questions",
                        hint=f"Input contains {len(questions)} questions, maximum is {self.MAX_QUESTIONS}"
                    )
                return ParseResult(success=True, questions=questions)
        
        # Stage 3: Try fallback extraction
        questions = self._stage3_fallback_extract(raw_input)
        if questions is not None:
            if len(questions) > self.MAX_QUESTIONS:
                return ParseResult(
                    success=False,
                    error="Too many questions",
                    hint=f"Input contains {len(questions)} questions, maximum is {self.MAX_QUESTIONS}"
                )
            return ParseResult(success=True, questions=questions)
        
        # All stages failed
        return ParseResult(
            success=False,
            error="Could not parse input",
            parse_stage_failed="array_extract",
            hint="Paste the raw response JSON from the Network tab (Response), not the object preview",
            sanitized_excerpt=self._get_excerpt(raw_input)
        )
    
    def _stage1_json_parse(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Attempt JSON.parse after pre-cleaning.
        
        Args:
            text: Input text
            
        Returns:
            Parsed dict or None if parsing fails
        """
        try:
            cleaned = self._pre_clean(text)
            parsed = json.loads(cleaned)
            return parsed
        except (json.JSONDecodeError, ValueError):
            return None
    
    def _stage2_jsonish_transform(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Transform JSON-ish text and parse.
        Handles: unquoted keys, single quotes, undefined/NaN/Infinity.
        
        Args:
            text: Input text
            
        Returns:
            Parsed dict or None if parsing fails
        """
        try:
            # Pre-clean first
            cleaned = self._pre_clean(text)
            
            # Normalize JavaScript values to null
            cleaned = self._normalize_js_values(cleaned)
            
            # Quote unquoted keys (simple approach - may not handle all edge cases)
            # This is a basic implementation that handles common cases
            cleaned = re.sub(
                r'(\{|,)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:',
                r'\1"\2":',
                cleaned
            )
            
            # Replace single quotes with double quotes (carefully)
            # This is simplified - a full implementation would need proper string parsing
            cleaned = cleaned.replace("'", '"')
            
            parsed = json.loads(cleaned)
            return parsed
        except (json.JSONDecodeError, ValueError):
            return None
    
    def _stage3_fallback_extract(self, text: str) -> Optional[List[Dict[str, Any]]]:
        """
        Extract questions array block and parse.
        Looks for data.favoriteQuestionList.questions path.
        
        Args:
            text: Input text
            
        Returns:
            Questions array or None if extraction fails
        """
        try:
            # Try to find the questions array in the text
            # Look for patterns like "questions": [ or "questions":[ or questions: [
            
            # First try to find the questions key
            questions_match = re.search(r'["\']?questions["\']?\s*:\s*\[', text, re.IGNORECASE)
            if not questions_match:
                return None
            
            # Find the start of the array
            start_idx = questions_match.end() - 1  # Include the opening bracket
            
            # Find the matching closing bracket
            bracket_count = 0
            end_idx = start_idx
            in_string = False
            escape_next = False
            
            for i in range(start_idx, len(text)):
                char = text[i]
                
                if escape_next:
                    escape_next = False
                    continue
                
                if char == '\\':
                    escape_next = True
                    continue
                
                if char == '"' and not in_string:
                    in_string = True
                elif char == '"' and in_string:
                    in_string = False
                
                if not in_string:
                    if char == '[':
                        bracket_count += 1
                    elif char == ']':
                        bracket_count -= 1
                        if bracket_count == 0:
                            end_idx = i + 1
                            break
            
            if bracket_count != 0:
                return None
            
            # Extract the array text
            array_text = text[start_idx:end_idx]
            
            # Pre-clean and try to parse
            cleaned = self._pre_clean(array_text)
            cleaned = self._normalize_js_values(cleaned)
            
            # Try to parse as JSON
            try:
                questions = json.loads(cleaned)
                if isinstance(questions, list):
                    return questions
            except json.JSONDecodeError:
                pass
            
            # If that didn't work, try the jsonish transform on just the array
            try:
                cleaned = re.sub(
                    r'(\{|,)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:',
                    r'\1"\2":',
                    cleaned
                )
                cleaned = cleaned.replace("'", '"')
                questions = json.loads(cleaned)
                if isinstance(questions, list):
                    return questions
            except json.JSONDecodeError:
                pass
            
            return None
            
        except Exception:
            return None
    
    def _pre_clean(self, text: str) -> str:
        """
        Remove ellipsis markers and trailing commas.
        
        Args:
            text: Input text
            
        Returns:
            Cleaned text
        """
        # Remove ellipsis markers (...)
        text = self.ELLIPSIS_PATTERN.sub('', text)
        
        # Remove trailing commas before closing braces/brackets
        text = self.TRAILING_COMMA_PATTERN.sub(r'\1', text)
        
        return text
    
    def _normalize_js_values(self, text: str) -> str:
        """
        Normalize JavaScript values (undefined, NaN, Infinity) to null.
        
        Args:
            text: Input text
            
        Returns:
            Normalized text
        """
        # Replace undefined with null
        text = re.sub(r'\bundefined\b', 'null', text)
        
        # Replace NaN with null
        text = re.sub(r'\bNaN\b', 'null', text)
        
        # Replace Infinity with null
        text = re.sub(r'\bInfinity\b', 'null', text)
        
        # Replace -Infinity with null
        text = re.sub(r'-Infinity\b', 'null', text)
        
        return text
    
    def _detect_truncation(self, text: str) -> bool:
        """
        Check if input appears truncated (missing closing braces/brackets).
        
        Args:
            text: Input text
            
        Returns:
            True if truncation detected
        """
        # Count opening and closing braces/brackets
        open_braces = text.count('{')
        close_braces = text.count('}')
        open_brackets = text.count('[')
        close_brackets = text.count(']')
        
        # If there's a significant imbalance, it's likely truncated
        # Allow some tolerance for strings containing these characters
        brace_diff = abs(open_braces - close_braces)
        bracket_diff = abs(open_brackets - close_brackets)
        
        # If difference is more than 2, likely truncated
        return brace_diff > 2 or bracket_diff > 2
    
    def _detect_array_shorthand(self, text: str) -> bool:
        """
        Check for Chrome array shorthand like "Array(50)".
        
        Args:
            text: Input text
            
        Returns:
            True if array shorthand detected
        """
        return bool(self.ARRAY_SHORTHAND_PATTERN.search(text))
    
    def _extract_questions_array(self, data: Any) -> Optional[List[Dict[str, Any]]]:
        """
        Extract questions array from parsed data.
        Looks for data.favoriteQuestionList.questions path.
        
        Args:
            data: Parsed data structure
            
        Returns:
            Questions array or None if not found
        """
        if not isinstance(data, dict):
            return None
        
        # Try to navigate to data.favoriteQuestionList.questions
        try:
            if 'data' in data:
                data = data['data']
            
            if 'favoriteQuestionList' in data:
                data = data['favoriteQuestionList']
            
            if 'questions' in data:
                questions = data['questions']
                if isinstance(questions, list):
                    return questions
            
            # Also try direct questions key at top level
            if 'questions' in data:
                questions = data['questions']
                if isinstance(questions, list):
                    return questions
            
            return None
            
        except (KeyError, TypeError):
            return None
    
    def _get_excerpt(self, text: str, max_length: int = 400) -> str:
        """
        Get sanitized excerpt from input.
        
        Args:
            text: Input text
            max_length: Maximum excerpt length
            
        Returns:
            Excerpt string
        """
        if len(text) <= max_length:
            return text
        
        return text[:max_length] + "..."


# Singleton instance
_parser_service: Optional[ParserService] = None


def get_parser_service() -> ParserService:
    """Get or create parser service instance"""
    global _parser_service
    if _parser_service is None:
        _parser_service = ParserService()
    return _parser_service
