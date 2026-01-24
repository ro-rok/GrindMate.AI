"""
AI Tutor Service with Groq Integration

Provides structured hint ladder system and chat functionality for LeetCode problems.
Implements caching, rate limiting, and misconception detection.
"""

import json
import hashlib
from datetime import datetime, timedelta, UTC
from typing import Dict, Any, Optional, List
from pathlib import Path

import httpx
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from ..config import get_settings
from ..db import get_database
from ..models.chat_message import ChatMessage
from ..models.hint_unlock import HintUnlock
from ..models.rate_limit import RateLimit
from .rate_limit_service import get_rate_limit_service
from .encryption_service import get_encryption_service


# Load hint prompts configuration
HINT_PROMPTS_PATH = Path(__file__).parent.parent / "config" / "hint_prompts.json"
with open(HINT_PROMPTS_PATH, "r") as f:
    HINT_PROMPTS = json.load(f)


class TutorService:
    """Service for AI tutoring with hint ladder and chat functionality"""
    
    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        self.db = db or get_database()
        self.settings = get_settings()
        self.rate_limit_service = get_rate_limit_service(self.db)
        self.encryption_service = get_encryption_service()
        
    async def build_ai_prompt(
        self,
        question_context: Dict[str, Any],
        user_code: Optional[str],
        language: Optional[str],
        message: str,
        tutor_mode: str,
        chat_history: List[Dict[str, str]]
    ) -> List[Dict[str, str]]:
        """
        Build structured AI prompt with question context and user attempt.
        
        Requirements: 2.2, 2.6, 5.1-5.5
        
        Args:
            question_context: Complete question data from get_question_context
            user_code: Optional user's current code
            language: Optional programming language
            message: User's message
            tutor_mode: Tutoring mode (socratic, eli5, interview)
            chat_history: Previous conversation messages
            
        Returns:
            List of messages for Groq API in format:
            [
                {"role": "system", "content": "..."},
                {"role": "user", "content": "..."},
                {"role": "assistant", "content": "..."},
                ...
                {"role": "user", "content": "..."}
            ]
        """
        # Build system prompt based on tutor mode
        system_prompts = {
            "socratic": """You are a Socratic tutor for coding problems. Your goal is to guide students to discover solutions themselves through thoughtful questions and hints.

Guidelines:
- Ask leading questions rather than giving direct answers
- Break down complex problems into smaller steps
- Encourage critical thinking and pattern recognition
- Provide hints progressively, starting with high-level concepts
- Only reveal solutions when explicitly requested
- Be encouraging and supportive""",
            
            "eli5": """You are a friendly tutor who explains coding concepts in simple, easy-to-understand terms. Your goal is to make complex algorithms accessible to beginners.

Guidelines:
- Use simple language and everyday analogies
- Avoid jargon unless you explain it clearly
- Break down concepts into bite-sized pieces
- Use concrete examples and visualizations
- Be patient and encouraging
- Relate concepts to real-world scenarios""",
            
            "interview": """You are an experienced technical interviewer conducting a coding interview. Your goal is to assess the candidate's problem-solving approach and guide them toward optimal solutions.

Guidelines:
- Ask about their approach before they code
- Probe for edge cases and complexity analysis
- Guide them toward optimal solutions if they're stuck
- Provide feedback on code quality and efficiency
- Simulate a realistic interview environment
- Be professional but supportive"""
        }
        
        system_prompt = system_prompts.get(tutor_mode, system_prompts["socratic"])
        
        # Add question context to system prompt
        system_prompt += f"""

Current Problem Context:
Title: {question_context['title']}
Difficulty: {question_context['difficulty']}
Topics: {', '.join(question_context['tags'][:5])}
Link: {question_context['link']}

Problem Statement:
{question_context['statement'][:1000]}"""  # Limit to 1000 chars to save tokens
        
        if question_context.get('constraints'):
            system_prompt += f"\n\nConstraints:\n{question_context['constraints'][:500]}"
        
        if question_context.get('examples'):
            system_prompt += f"\n\nExamples:\n{question_context['examples'][:500]}"
        
        # Build user message with context
        user_message = message
        
        # Add user code if provided (Requirement 5.1, 5.2)
        if user_code:
            code_language = language or "python"
            user_message += f"\n\nMy current code ({code_language}):\n```{code_language}\n{user_code}\n```"
        
        # Build messages array
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add chat history for context continuity (Requirement 2.6)
        if chat_history:
            messages.extend(chat_history)
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        return messages
    
    async def get_question_context(
        self,
        question_id: ObjectId
    ) -> Dict[str, Any]:
        """
        Fetch complete question context for AI injection.
        
        Requirements: 2.1, 2.4, 2.5
        
        Returns:
            {
                "title": str,
                "slug": str,
                "difficulty": str,
                "tags": List[str],
                "statement": str,
                "constraints": str,
                "examples": str,
                "link": str
            }
            
        Raises:
            ValueError: If question not found or content unavailable
        """
        # Fetch question from database
        question = await self.db["questions"].find_one({"_id": question_id})
        
        if not question:
            raise ValueError("Question not found")
        
        # Extract basic fields
        title = question.get("title", "")
        slug = question.get("titleSlug") or question.get("link", "").rstrip("/").split("/")[-1]
        difficulty = question.get("difficulty", "MEDIUM")
        link = question.get("link", "")
        
        # Extract tags/topics
        tags = []
        if question.get("topics"):
            # Topics might be comma-separated string
            if isinstance(question["topics"], str):
                tags = [t.strip() for t in question["topics"].split(",") if t.strip()]
            elif isinstance(question["topics"], list):
                tags = question["topics"]
        
        # Add patterns as tags
        if question.get("patterns"):
            tags.extend(question["patterns"])
        
        # Try to get statement from question document
        statement = question.get("statement") or question.get("description") or ""
        constraints = question.get("constraints", "")
        examples = question.get("examples", "")
        
        # If statement is missing, attempt fallback to imported content source
        if not statement:
            # Try to scrape from LeetCode using the existing chat service function
            from .chat import scrape_question_text
            
            try:
                scraped_text = await scrape_question_text(link)
                if scraped_text and scraped_text != "Please paste the question text here.":
                    statement = scraped_text
            except Exception:
                # Scraping failed, continue without statement
                pass
        
        # If still no content, raise error
        if not statement:
            raise ValueError("Question content unavailable")
        
        return {
            "title": title,
            "slug": slug,
            "difficulty": difficulty,
            "tags": tags,
            "statement": statement,
            "constraints": constraints,
            "examples": examples,
            "link": link
        }
    
    async def get_unlocked_hints(
        self,
        user_id: str,
        question_id: str
    ) -> List[int]:
        """Get list of unlocked hint levels for a user and question"""
        cursor = self.db["hint_unlocks"].find({
            "user_id": ObjectId(user_id),
            "question_id": ObjectId(question_id)
        })
        
        unlocks = await cursor.to_list(length=10)
        return sorted([unlock["hint_level"] for unlock in unlocks])
    
    async def unlock_hint(
        self,
        user_id: str,
        question_id: str,
        hint_level: int,
        override: bool = False
    ) -> Dict[str, Any]:
        """
        Unlock a hint level for a user
        
        Args:
            user_id: User ID
            question_id: Question ID
            hint_level: Level to unlock (1-6)
            override: Skip sequential validation
            
        Returns:
            Dict with hint_content, tokens_used, cached status
            
        Raises:
            ValueError: If sequential unlock validation fails
        """
        # Validate hint level
        if hint_level < 1 or hint_level > 6:
            raise ValueError("Hint level must be between 1 and 6")
        
        # Check if already unlocked
        existing = await self.db["hint_unlocks"].find_one({
            "user_id": ObjectId(user_id),
            "question_id": ObjectId(question_id),
            "hint_level": hint_level
        })
        
        if existing:
            # Already unlocked, return cached hint
            return await self._get_cached_hint(
                user_id, question_id, hint_level
            )
        
        # Validate sequential unlock (unless override)
        if not override and hint_level > 1:
            unlocked_levels = await self.get_unlocked_hints(user_id, question_id)
            required_level = hint_level - 1
            
            if required_level not in unlocked_levels:
                raise ValueError(
                    f"Must unlock level {required_level} before level {hint_level}"
                )
        
        # Generate hint content
        hint_data = await self._generate_hint(
            user_id, question_id, hint_level
        )
        
        # Record unlock
        unlock = HintUnlock(
            user_id=ObjectId(user_id),
            question_id=ObjectId(question_id),
            hint_level=hint_level,
            unlocked_at=datetime.now(UTC)
        )
        await self.db["hint_unlocks"].insert_one(unlock.model_dump(by_alias=True))
        
        # Track attempt if hint level >= 2 (Requirement 11.1)
        if hint_level >= 2:
            await self._increment_attempt(user_id, question_id)
        
        return hint_data
    
    async def _generate_hint(
        self,
        user_id: str,
        question_id: str,
        hint_level: int,
        tutor_mode: str = "socratic",
        language: str = "python"
    ) -> Dict[str, Any]:
        """
        Generate hint content using Groq API
        
        Checks cache first, then generates new hint if needed
        """
        # Check cache
        cache_key = self._get_cache_key(question_id, hint_level, tutor_mode, language)
        cached = await self._get_from_cache(cache_key)
        
        if cached:
            return {
                "hint_content": cached["content"],
                "tokens_used": 0,
                "cached": True
            }
        
        # Get question details
        question = await self.db["questions"].find_one({"_id": ObjectId(question_id)})
        if not question:
            raise ValueError("Question not found")
        
        # Get user's tutor mode preference
        user = await self.db["users"].find_one({"_id": ObjectId(user_id)})
        if user and user.get("tutor_mode"):
            tutor_mode = user["tutor_mode"]
        
        # Build prompt
        system_prompt = self._build_system_prompt(
            tutor_mode, hint_level, question
        )
        user_prompt = self._build_hint_user_prompt(hint_level, question, language)
        
        # Call Groq API
        response = await self._call_groq_api(
            system_prompt, user_prompt, user_id
        )
        
        # Cache the response
        await self._cache_hint(
            cache_key, response["content"], user_id, question_id, hint_level, tutor_mode
        )
        
        return {
            "hint_content": response["content"],
            "tokens_used": response["tokens_used"],
            "cached": False
        }
    
    async def send_chat_message(
        self,
        user_id: ObjectId,
        question_id: ObjectId,
        message: str,
        user_code: Optional[str] = None,
        language: Optional[str] = None,
        tutor_mode: str = "socratic"
    ) -> Dict[str, Any]:
        """
        Send a chat message to the AI tutor with automatic question context.
        
        Requirements: 4.1-4.5, 6.1-6.4
        
        Args:
            user_id: User ID
            question_id: Question ID
            message: User's message
            user_code: Optional code snippet from user
            language: Optional programming language
            tutor_mode: Tutoring mode (socratic, eli5, interview)
            
        Returns:
            {
                "response_text": str,
                "hints_used_count": int,
                "session_id": str,
                "tokens_remaining": int,
                "requests_remaining": int
            }
            
        Raises:
            HTTPException: If rate limit exceeded or other errors
        """
        # Check rate limit before processing (Requirement 6.1, 6.2)
        user = await self.db["users"].find_one({"_id": user_id})
        user_timezone = user.get("timezone", "UTC") if user else "UTC"
        
        is_allowed, rate_info = await self.rate_limit_service.check_rate_limit(
            str(user_id), user_timezone
        )
        
        if not is_allowed:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=429,
                detail={
                    "error_message": f"Rate limit exceeded. You have used all your requests today.",
                    "reset_time_unix": int(datetime.fromisoformat(rate_info["reset_at"]).timestamp()),
                    "requests_remaining": rate_info["requests_remaining"]
                }
            )
        
        # Get question context (Requirement 2.1, 2.4, 2.5)
        try:
            question_context = await self.get_question_context(question_id)
        except ValueError as e:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=404,
                detail={"error_message": str(e)}
            )
        
        # Get conversation history for context continuity
        chat_history = await self._get_conversation_history(
            str(user_id), str(question_id), limit=5
        )
        
        # Build AI prompt with automatic context injection (Requirement 2.2, 2.6)
        messages = await self.build_ai_prompt(
            question_context=question_context,
            user_code=user_code,
            language=language,
            message=message,
            tutor_mode=tutor_mode,
            chat_history=chat_history
        )
        
        # Call Groq API (Requirement 4.1)
        try:
            response = await self._call_groq_api_with_messages(
                messages=messages,
                user_id=str(user_id)
            )
        except RuntimeError as e:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=502,
                detail={"error_message": f"AI service error: {str(e)}"}
            )
        
        # Get or create session
        session_id = await self._get_or_create_session(user_id, question_id, tutor_mode)
        
        # Calculate code hash if code provided
        code_hash = None
        if user_code:
            code_hash = hashlib.md5(user_code.encode()).hexdigest()
        
        # Store session summary (Requirement 6.4)
        await self.store_session_summary(
            user_id=user_id,
            question_id=question_id,
            session_id=session_id,
            prompt_metadata={
                "tutor_mode": tutor_mode,
                "language": language,
                "timestamp": datetime.now(UTC)
            },
            ai_summary=response["content"][:500],  # Max 500 characters
            code_hash=code_hash or ""
        )
        
        # Save chat messages
        await self._save_chat_messages_with_session(
            user_id=user_id,
            question_id=question_id,
            session_id=session_id,
            user_message=message,
            assistant_message=response["content"],
            tutor_mode=tutor_mode,
            tokens_used=response["tokens_used"],
            code_hash=code_hash
        )
        
        # Update session hints count
        await self._update_session_hints(session_id)
        
        # Get updated rate info
        rate_budget = await self.rate_limit_service.get_rate_budget(
            str(user_id), user_timezone
        )
        
        return {
            "response_text": response["content"],
            "hints_used_count": await self._get_session_hints_count(session_id),
            "session_id": str(session_id),
            "tokens_remaining": rate_budget["tokens_remaining"],
            "requests_remaining": rate_budget["requests_remaining"]
        }
    
    async def chat(
        self,
        user_id: str,
        question_id: str,
        message: str,
        tutor_mode: str = "socratic",
        code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Handle chat message with AI tutor
        
        Args:
            user_id: User ID
            message: User's message
            tutor_mode: Tutoring mode (socratic, eli5, interviewer)
            code: Optional code snippet from user
            
        Returns:
            Dict with response, tokens_used, cached status, misconception_detected
        """
        # Get question details
        question = await self.db["questions"].find_one({"_id": ObjectId(question_id)})
        if not question:
            raise ValueError("Question not found")
        
        # Get user question data for context
        user_question = await self.db["user_questions"].find_one({
            "user_id": ObjectId(user_id),
            "question_id": ObjectId(question_id)
        })
        
        # Get unlocked hints for context
        unlocked_hints = await self.get_unlocked_hints(user_id, question_id)
        
        # Get conversation history (last 5 messages)
        history = await self._get_conversation_history(user_id, question_id, limit=5)
        
        # Build prompts
        system_prompt = self._build_system_prompt(tutor_mode, max(unlocked_hints) if unlocked_hints else 0, question)
        user_prompt = self._build_chat_user_prompt(
            message, code, user_question, unlocked_hints
        )
        
        # Detect misconceptions
        misconception = self._detect_misconception(message, code)
        
        # Call Groq API with conversation history
        response = await self._call_groq_api(
            system_prompt, user_prompt, user_id, history
        )
        
        # Save messages to database
        await self._save_chat_messages(
            user_id, question_id, message, response["content"],
            tutor_mode, response["tokens_used"]
        )
        
        return {
            "response": response["content"],
            "tokens_used": response["tokens_used"],
            "cached": False,
            "misconception_detected": misconception
        }
    
    def _build_system_prompt(
        self,
        tutor_mode: str,
        hint_level: int,
        question: Dict[str, Any]
    ) -> str:
        """Build system prompt based on tutor mode"""
        template = HINT_PROMPTS["system_prompts"].get(tutor_mode, HINT_PROMPTS["system_prompts"]["socratic"])
        
        return template.format(
            hint_level=hint_level,
            problem_title=question.get("title", ""),
            difficulty=question.get("difficulty", ""),
            topics=question.get("topics", "")
        )
    
    def _build_hint_user_prompt(
        self,
        hint_level: int,
        question: Dict[str, Any],
        language: str
    ) -> str:
        """Build user prompt for hint generation"""
        level_info = HINT_PROMPTS["hint_levels"][str(hint_level)]
        
        prompt = f"""Please provide a hint for this problem at Level {hint_level}: {level_info['name']}.

Problem: {question.get('title', '')}
Difficulty: {question.get('difficulty', '')}
Topics: {question.get('topics', '')}

Guidance for this level:
{level_info['guidance']}

"""
        
        if hint_level >= 5:
            prompt += f"\nPreferred programming language: {language}\n"
        
        return prompt
    
    def _build_chat_user_prompt(
        self,
        message: str,
        code: Optional[str],
        user_question: Optional[Dict[str, Any]],
        unlocked_hints: List[int]
    ) -> str:
        """Build user prompt for chat message"""
        # Calculate time spent
        time_spent_minutes = 0
        if user_question and user_question.get("created_at"):
            time_spent = datetime.now(UTC) - user_question["created_at"]
            time_spent_minutes = int(time_spent.total_seconds() / 60)
        
        # Build code section
        code_section = ""
        if code:
            code_section = f"\n\nUser's code:\n```\n{code}\n```"
        
        template = HINT_PROMPTS["user_message_template"]
        return template.format(
            user_message=message,
            time_spent_minutes=time_spent_minutes,
            unlocked_hints=unlocked_hints,
            attempt_count=user_question.get("attempts", 0) if user_question else 0,
            user_code_section=code_section
        )
    
    def _detect_misconception(
        self,
        message: str,
        code: Optional[str]
    ) -> Optional[str]:
        """
        Detect common misconceptions in user's message or code
        
        Returns misconception type or None
        """
        text = (message + " " + (code or "")).lower()
        
        patterns = HINT_PROMPTS["misconception_patterns"]
        
        # Check each misconception pattern
        for misconception_type, pattern_info in patterns.items():
            keywords = pattern_info["keywords"]
            if any(keyword.lower() in text for keyword in keywords):
                # Simple heuristic - could be enhanced with ML
                if misconception_type == "complexity_mismatch":
                    if "o(n²)" in text or "o(n^2)" in text or "nested loop" in text:
                        return "complexity_mismatch"
                elif misconception_type == "wrong_data_structure":
                    # Would need more sophisticated logic
                    pass
                elif misconception_type == "off_by_one":
                    if "i < n-1" in text or "i <= n-1" in text:
                        return "off_by_one"
        
        return None
    
    async def _call_groq_api(
        self,
        system_prompt: str,
        user_prompt: str,
        user_id: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Call Groq API with rate limiting
        
        Returns dict with content and tokens_used
        """
        # Get user to check for BYOK key
        user = await self.db["users"].find_one({"_id": ObjectId(user_id)})
        
        # Determine which API key to use
        api_key = None
        if user and user.get("byok_groq_key"):
            # Decrypt user's BYOK key
            encrypted_key = user["byok_groq_key"]
            api_key = self.encryption_service.decrypt_api_key(encrypted_key)
            if not api_key:
                raise RuntimeError("Failed to decrypt BYOK API key")
        else:
            # Use server key
            api_key = self.settings.groq_api_key
            if not api_key:
                raise RuntimeError("GROQ_API_KEY is not configured")
        
        # Check rate limit (BYOK users bypass this)
        if not (user and user.get("byok_groq_key")):
            await self._check_rate_limit(user_id)
        
        # Build messages
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history if provided
        if history:
            messages.extend(history)
        
        messages.append({"role": "user", "content": user_prompt})
        
        # Call API
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        body = {
            "model": "llama3-8b-8192",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2048
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.settings.groq_api_url,
                headers=headers,
                json=body
            )
        
        if response.status_code != 200:
            raise RuntimeError(f"Groq API error: {response.status_code} - {response.text}")
        
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        tokens_used = data.get("usage", {}).get("total_tokens", 0)
        
        # Update rate limit (only for non-BYOK users)
        if not (user and user.get("byok_groq_key")):
            await self._update_rate_limit(user_id, tokens_used)
        
        return {
            "content": content,
            "tokens_used": tokens_used
        }
    
    async def _call_groq_api_with_messages(
        self,
        messages: List[Dict[str, str]],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Call Groq API with pre-built messages array.
        
        Used by send_chat_message for the new flow.
        
        Returns dict with content and tokens_used
        """
        # Get user to check for BYOK key
        user = await self.db["users"].find_one({"_id": ObjectId(user_id)})
        
        # Determine which API key to use
        api_key = None
        if user and user.get("byok_groq_key"):
            # Decrypt user's BYOK key
            encrypted_key = user["byok_groq_key"]
            api_key = self.encryption_service.decrypt_api_key(encrypted_key)
            if not api_key:
                raise RuntimeError("Failed to decrypt BYOK API key")
        else:
            # Use server key
            api_key = self.settings.groq_api_key
            if not api_key:
                raise RuntimeError("GROQ_API_KEY is not configured")
        
        # Call API
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        body = {
            "model": "llama3-8b-8192",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2048
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.settings.groq_api_url,
                headers=headers,
                json=body
            )
        
        if response.status_code != 200:
            raise RuntimeError(f"Groq API error: {response.status_code} - {response.text}")
        
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        tokens_used = data.get("usage", {}).get("total_tokens", 0)
        
        # Update rate limit (only for non-BYOK users)
        if not (user and user.get("byok_groq_key")):
            user_timezone = user.get("timezone", "UTC") if user else "UTC"
            await self.rate_limit_service.consume_budget(
                user_id, tokens_used, user_timezone
            )
        
        return {
            "content": content,
            "tokens_used": tokens_used
        }
    
    async def _get_or_create_session(
        self,
        user_id: ObjectId,
        question_id: ObjectId,
        tutor_mode: str
    ) -> ObjectId:
        """
        Get existing active session or create a new one.
        
        Returns session_id
        """
        # Look for active session (no end time)
        session = await self.db["tutor_sessions"].find_one({
            "user_id": user_id,
            "question_id": question_id,
            "session_end_time": None
        })
        
        if session:
            return session["_id"]
        
        # Create new session
        from ..models.tutor_session import TutorSession
        
        new_session = TutorSession(
            user_id=user_id,
            question_id=question_id,
            session_start_time=datetime.now(UTC),
            tutor_mode=tutor_mode,
            hints_used=0,
            messages_count=0,
            solved=False,
            time_spent_seconds=0,
            final_state="not_started"
        )
        
        result = await self.db["tutor_sessions"].insert_one(
            new_session.model_dump(by_alias=True)
        )
        
        return result.inserted_id
    
    async def _save_chat_messages_with_session(
        self,
        user_id: ObjectId,
        question_id: ObjectId,
        session_id: ObjectId,
        user_message: str,
        assistant_message: str,
        tutor_mode: str,
        tokens_used: int,
        code_hash: Optional[str]
    ) -> None:
        """Save chat messages with session linkage"""
        now = datetime.now(UTC)
        expires_at = now + timedelta(days=30)  # 30 day TTL
        
        # Save user message
        user_msg = ChatMessage(
            user_id=user_id,
            question_id=question_id,
            session_id=session_id,
            role="user",
            content=user_message,
            tutor_mode=tutor_mode,
            tokens_used=0,
            cached=False,
            code_hash=code_hash,
            expires_at=expires_at
        )
        await self.db["chat_messages"].insert_one(user_msg.model_dump(by_alias=True))
        
        # Save assistant message
        assistant_msg = ChatMessage(
            user_id=user_id,
            question_id=question_id,
            session_id=session_id,
            role="assistant",
            content=assistant_message,
            tutor_mode=tutor_mode,
            tokens_used=tokens_used,
            cached=False,
            code_hash=code_hash,
            expires_at=expires_at
        )
        await self.db["chat_messages"].insert_one(assistant_msg.model_dump(by_alias=True))
        
        # Update session message count
        await self.db["tutor_sessions"].update_one(
            {"_id": session_id},
            {"$inc": {"messages_count": 2}}
        )
    
    async def _update_session_hints(self, session_id: ObjectId) -> None:
        """Increment hints used counter for session"""
        await self.db["tutor_sessions"].update_one(
            {"_id": session_id},
            {"$inc": {"hints_used": 1}}
        )
    
    async def _get_session_hints_count(self, session_id: ObjectId) -> int:
        """Get current hints count for session"""
        session = await self.db["tutor_sessions"].find_one({"_id": session_id})
        return session.get("hints_used", 0) if session else 0
    
    async def store_session_summary(
        self,
        user_id: ObjectId,
        question_id: ObjectId,
        session_id: ObjectId,
        prompt_metadata: Dict[str, Any],
        ai_summary: str,
        code_hash: str
    ) -> None:
        """
        Store sanitized session summary (not full conversation).
        
        Requirements: 6.4
        
        Stores:
        - Prompt metadata (question_id, user_id, timestamp, mode)
        - AI-generated summary (max 500 characters)
        - Code hash only (not full code)
        
        Args:
            user_id: User ID
            question_id: Question ID
            session_id: Session ID
            prompt_metadata: Dict with tutor_mode, language, timestamp
            ai_summary: AI-generated summary (will be truncated to 500 chars)
            code_hash: Hash of user's code (not the full code)
        """
        # Truncate summary to 500 characters
        truncated_summary = ai_summary[:500] if ai_summary else ""
        
        # Update session with summary
        await self.db["tutor_sessions"].update_one(
            {"_id": session_id},
            {
                "$set": {
                    "ai_summary": truncated_summary,
                    "updated_at": datetime.now(UTC)
                }
            }
        )
        
        # Store metadata in a separate collection for analytics (optional)
        # This allows us to track usage patterns without storing full conversations
        await self.db["tutor_session_metadata"].update_one(
            {
                "session_id": session_id,
                "user_id": user_id,
                "question_id": question_id
            },
            {
                "$set": {
                    "tutor_mode": prompt_metadata.get("tutor_mode", "socratic"),
                    "language": prompt_metadata.get("language"),
                    "timestamp": prompt_metadata.get("timestamp", datetime.now(UTC)),
                    "code_hash": code_hash,
                    "summary": truncated_summary,
                    "updated_at": datetime.now(UTC)
                },
                "$setOnInsert": {
                    "created_at": datetime.now(UTC)
                }
            },
            upsert=True
        )
    
    async def reset_tutor_conversation(
        self,
        user_id: ObjectId,
        question_id: ObjectId
    ) -> None:
        """
        Clear conversation history for current question.
        
        Requirements: 6.5
        
        Clears:
        - All chat messages for user + question pair
        - Session summary
        
        Args:
            user_id: User ID
            question_id: Question ID
        """
        # Delete all chat messages for this user-question pair
        await self.db["chat_messages"].delete_many({
            "user_id": user_id,
            "question_id": question_id
        })
        
        # Clear session summary for active session
        await self.db["tutor_sessions"].update_many(
            {
                "user_id": user_id,
                "question_id": question_id,
                "session_end_time": None  # Only active sessions
            },
            {
                "$set": {
                    "ai_summary": None,
                    "messages_count": 0,
                    "updated_at": datetime.now(UTC)
                }
            }
        )
        
        # Clear session metadata
        await self.db["tutor_session_metadata"].delete_many({
            "user_id": user_id,
            "question_id": question_id
        })
    
    async def _check_rate_limit(self, user_id: str) -> None:
        """
        Check if user has exceeded rate limit
        
        Raises HTTPException if limit exceeded
        """
        # Get user to get timezone
        user = await self.db["users"].find_one({"_id": ObjectId(user_id)})
        user_timezone = user.get("timezone", "UTC") if user else "UTC"
        
        # Check rate limit using service
        is_allowed, info = await self.rate_limit_service.check_rate_limit(
            user_id, user_timezone
        )
        
        if not is_allowed:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "rate_budget_remaining": info["tokens_remaining"],
                    "reset_at": info["reset_at"],
                    "alternatives": ["cached_hints", "byok_mode"]
                }
            )
    
    async def _update_rate_limit(self, user_id: str, tokens_used: int) -> None:
        """Update rate limit counters"""
        # Get user to get timezone
        user = await self.db["users"].find_one({"_id": ObjectId(user_id)})
        user_timezone = user.get("timezone", "UTC") if user else "UTC"
        
        # Update using service
        await self.rate_limit_service.consume_budget(
            user_id, tokens_used, user_timezone
        )
    
    
    async def _get_conversation_history(
        self,
        user_id: str,
        question_id: str,
        limit: int = 5
    ) -> List[Dict[str, str]]:
        """Get recent conversation history"""
        cursor = self.db["chat_messages"].find({
            "user_id": ObjectId(user_id),
            "question_id": ObjectId(question_id)
        }).sort("created_at", -1).limit(limit * 2)  # Get last N exchanges
        
        messages = await cursor.to_list(length=limit * 2)
        
        # Convert to Groq format and reverse (oldest first)
        history = []
        for msg in reversed(messages):
            history.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        return history
    
    async def _save_chat_messages(
        self,
        user_id: str,
        question_id: str,
        user_message: str,
        assistant_message: str,
        tutor_mode: str,
        tokens_used: int
    ) -> None:
        """Save chat messages to database"""
        now = datetime.now(UTC)
        expires_at = now + timedelta(days=30)  # 30 day TTL
        
        # Save user message
        user_msg = ChatMessage(
            user_id=ObjectId(user_id),
            question_id=ObjectId(question_id),
            role="user",
            content=user_message,
            tutor_mode=tutor_mode,
            tokens_used=0,
            cached=False,
            expires_at=expires_at
        )
        await self.db["chat_messages"].insert_one(user_msg.model_dump(by_alias=True))
        
        # Save assistant message
        assistant_msg = ChatMessage(
            user_id=ObjectId(user_id),
            question_id=ObjectId(question_id),
            role="assistant",
            content=assistant_message,
            tutor_mode=tutor_mode,
            tokens_used=tokens_used,
            cached=False,
            expires_at=expires_at
        )
        await self.db["chat_messages"].insert_one(assistant_msg.model_dump(by_alias=True))
    
    def _get_cache_key(
        self,
        question_id: str,
        hint_level: int,
        tutor_mode: str,
        language: str
    ) -> str:
        """Generate cache key for hint"""
        key_str = f"{question_id}:{hint_level}:{tutor_mode}:{language}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    async def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached hint from database"""
        # Look for cached hint in chat_messages
        cached = await self.db["chat_messages"].find_one({
            "cached": True,
            "expires_at": {"$gt": datetime.now(UTC)}
        })
        
        return cached
    
    async def _get_cached_hint(
        self,
        user_id: str,
        question_id: str,
        hint_level: int
    ) -> Dict[str, Any]:
        """Get previously unlocked hint from cache"""
        # Find the hint in chat messages
        hint_msg = await self.db["chat_messages"].find_one({
            "user_id": ObjectId(user_id),
            "question_id": ObjectId(question_id),
            "hint_level": hint_level,
            "role": "assistant"
        })
        
        if hint_msg:
            return {
                "hint_content": hint_msg["content"],
                "tokens_used": 0,
                "cached": True
            }
        
        # If not found, regenerate
        return await self._generate_hint(user_id, question_id, hint_level)
    
    async def _cache_hint(
        self,
        cache_key: str,
        content: str,
        user_id: str,
        question_id: str,
        hint_level: int,
        tutor_mode: str
    ) -> None:
        """Cache hint response"""
        # Save as chat message with hint_level set
        expires_at = datetime.now(UTC) + timedelta(hours=24)
        
        hint_msg = ChatMessage(
            user_id=ObjectId(user_id),
            question_id=ObjectId(question_id),
            role="assistant",
            content=content,
            hint_level=hint_level,
            tutor_mode=tutor_mode,
            tokens_used=0,
            cached=True,
            expires_at=expires_at
        )
        await self.db["chat_messages"].insert_one(hint_msg.model_dump(by_alias=True))
    
    async def _increment_attempt(
        self,
        user_id: str,
        question_id: str
    ) -> None:
        """
        Increment attempt counter for a user-question pair.
        
        An attempt is recorded when:
        - User enters focus mode and stays ≥60 seconds
        - User unlocks hint level ≥2
        - User marks solved/unsolved
        
        Requirements: 11.1
        """
        now = datetime.now(UTC)
        
        await self.db["user_questions"].update_one(
            {
                "user_id": ObjectId(user_id),
                "question_id": ObjectId(question_id)
            },
            {
                "$inc": {"attempts": 1},
                "$set": {"last_attempt_at": now, "updated_at": now},
                "$setOnInsert": {
                    "solved": False,
                    "created_at": now
                }
            },
            upsert=True
        )


# Singleton instance
_tutor_service: Optional[TutorService] = None


def get_tutor_service(db=None):
    """Get or create tutor service instance"""
    global _tutor_service
    if _tutor_service is None:
        _tutor_service = TutorService(db)
    return _tutor_service
