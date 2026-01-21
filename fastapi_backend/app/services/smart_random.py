"""
Smart Random Question Selection Service for GrindMate.AI

Implements intelligent question selection weighted by:
- Timeframe (recent questions prioritized)
- Weakness (weak patterns/topics boosted)
- Difficulty (adaptive based on recent solve rate)
- Novelty (penalize recently selected questions)

Requirements: 5.1-5.11
"""

from typing import List, Dict, Any, Optional, Set
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import random


class PriorityScore:
    """Represents a question's priority score with breakdown"""
    def __init__(
        self,
        question_id: ObjectId,
        total_score: float,
        timeframe_weight: float,
        weakness_weight: float,
        difficulty_weight: float,
        novelty_weight: float,
        reason: str
    ):
        self.question_id = question_id
        self.total_score = total_score
        self.timeframe_weight = timeframe_weight
        self.weakness_weight = weakness_weight
        self.difficulty_weight = difficulty_weight
        self.novelty_weight = novelty_weight
        self.reason = reason
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "question_id": str(self.question_id),
            "total_score": self.total_score,
            "timeframe_weight": self.timeframe_weight,
            "weakness_weight": self.weakness_weight,
            "difficulty_weight": self.difficulty_weight,
            "novelty_weight": self.novelty_weight,
            "reason": self.reason
        }


class SmartRandomService:
    """Service for intelligent question selection"""
    
    # Timeframe weights (Requirements 5.3)
    TIMEFRAME_WEIGHTS = {
        "30_days": 3,
        "90_days": 2,
        "more_than_six_months": 1,
        "all_time": 0
    }
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    def _calculate_timeframe_weight(self, timeframe: str) -> float:
        """
        Calculate timeframe weight.
        
        Requirements: 5.3
        30d=3, 3mo=2, 6mo=1, all=0
        
        Args:
            timeframe: Question timeframe
            
        Returns:
            Weight value (0-3)
        """
        return self.TIMEFRAME_WEIGHTS.get(timeframe, 0)
    
    def _calculate_weakness_weight(
        self,
        question_patterns: List[str],
        weak_patterns: Set[str]
    ) -> float:
        """
        Calculate weakness weight.
        
        Requirements: 5.4
        Weak pattern = 2x boost
        
        Args:
            question_patterns: List of patterns for the question
            weak_patterns: Set of user's weak patterns
            
        Returns:
            Weight value (0 or 2)
        """
        # If any pattern is weak, boost by 2
        for pattern in question_patterns:
            if pattern in weak_patterns:
                return 2.0
        return 0.0
    
    def _calculate_difficulty_weight(
        self,
        difficulty: str,
        recent_solve_rate: float
    ) -> float:
        """
        Calculate difficulty weight based on recent solve rate.
        
        Requirements: 5.5
        - If solve rate > 70%: boost Medium/Hard (challenge user)
        - If solve rate < 40%: boost Easy (ease up)
        - If solve rate 40-70%: neutral weighting
        
        Args:
            difficulty: Question difficulty (EASY, MEDIUM, HARD)
            recent_solve_rate: User's recent solve rate (0-1)
            
        Returns:
            Weight value (0-2)
        """
        difficulty = difficulty.upper()
        
        if recent_solve_rate > 0.7:
            # User is doing well, challenge them
            weights = {"EASY": 0, "MEDIUM": 1, "HARD": 2}
        elif recent_solve_rate < 0.4:
            # User is struggling, ease up
            weights = {"EASY": 2, "MEDIUM": 1, "HARD": 0}
        else:
            # Neutral
            weights = {"EASY": 1, "MEDIUM": 1, "HARD": 1}
        
        return weights.get(difficulty, 1)
    
    def _calculate_novelty_weight(
        self,
        question_id: ObjectId,
        recent_selections: List[ObjectId]
    ) -> float:
        """
        Calculate novelty weight to penalize recently selected questions.
        
        Requirements: 5.6, 5.7
        Penalize questions in last 10 selections
        
        Args:
            question_id: Question ObjectId
            recent_selections: List of recently selected question IDs (last 10)
            
        Returns:
            Weight value (-2 to 0)
        """
        if question_id not in recent_selections:
            return 0.0
        
        # Find position in recent selections (0 = most recent)
        try:
            position = recent_selections.index(question_id)
            # Penalize more heavily for more recent selections
            # Position 0 (most recent) = -2, Position 9 (oldest) = -0.2
            penalty = -2.0 * (1 - position / 10)
            return penalty
        except ValueError:
            return 0.0
    
    async def calculate_priority_score(
        self,
        question: Dict[str, Any],
        weak_patterns: Set[str],
        recent_solve_rate: float,
        recent_selections: List[ObjectId]
    ) -> PriorityScore:
        """
        Calculate composite priority score for a question.
        
        Requirements: 5.2
        Priority_Score = TimeframeWeight + WeaknessWeight + DifficultyWeight + NoveltyWeight
        
        Args:
            question: Question document from database
            weak_patterns: Set of user's weak patterns
            recent_solve_rate: User's recent solve rate (0-1)
            recent_selections: List of recently selected question IDs
            
        Returns:
            PriorityScore object with breakdown
        """
        question_id = question["_id"]
        timeframe = question.get("timeframe", "all_time")
        difficulty = question.get("difficulty", "MEDIUM")
        patterns = question.get("patterns", [])
        
        # Calculate individual weights
        timeframe_weight = self._calculate_timeframe_weight(timeframe)
        weakness_weight = self._calculate_weakness_weight(patterns, weak_patterns)
        difficulty_weight = self._calculate_difficulty_weight(difficulty, recent_solve_rate)
        novelty_weight = self._calculate_novelty_weight(question_id, recent_selections)
        
        # Calculate total score
        total_score = (
            timeframe_weight +
            weakness_weight +
            difficulty_weight +
            novelty_weight
        )
        
        # Generate reason
        reasons = []
        if weakness_weight > 0:
            weak_pattern = next((p for p in patterns if p in weak_patterns), None)
            if weak_pattern:
                reasons.append(f"Weak pattern: {weak_pattern}")
        if timeframe_weight >= 2:
            reasons.append(f"Recent question ({timeframe})")
        if difficulty_weight >= 2:
            reasons.append(f"Appropriate difficulty ({difficulty})")
        if novelty_weight < -1:
            reasons.append("Recently selected (penalized)")
        
        reason = ", ".join(reasons) if reasons else "Standard priority"
        
        return PriorityScore(
            question_id=question_id,
            total_score=total_score,
            timeframe_weight=timeframe_weight,
            weakness_weight=weakness_weight,
            difficulty_weight=difficulty_weight,
            novelty_weight=novelty_weight,
            reason=reason
        )
    
    async def get_weak_patterns(self, user_id: ObjectId) -> Set[str]:
        """
        Get set of weak patterns for a user.
        
        A pattern is weak if solve rate < 50% and attempts >= 3.
        
        Args:
            user_id: User's ObjectId
            
        Returns:
            Set of weak pattern names
        """
        # Get all user questions with attempts
        user_questions = await self.db["user_questions"].find({
            "user_id": user_id,
            "attempts": {"$gte": 1}
        }).to_list(None)
        
        if not user_questions:
            return set()
        
        # Get question details to extract patterns
        question_ids = [uq["question_id"] for uq in user_questions]
        questions = await self.db["questions"].find({
            "_id": {"$in": question_ids}
        }).to_list(None)
        
        # Create map of question_id -> patterns
        question_patterns_map = {}
        for q in questions:
            if q.get("patterns"):
                question_patterns_map[q["_id"]] = q["patterns"]
        
        # Calculate solve rate per pattern
        pattern_stats: Dict[str, Dict[str, int]] = {}
        
        for uq in user_questions:
            question_id = uq["question_id"]
            patterns = question_patterns_map.get(question_id, [])
            is_solved = uq.get("solved", False)
            
            for pattern in patterns:
                if pattern not in pattern_stats:
                    pattern_stats[pattern] = {"attempts": 0, "solved": 0}
                
                pattern_stats[pattern]["attempts"] += 1
                if is_solved:
                    pattern_stats[pattern]["solved"] += 1
        
        # Identify weak patterns
        weak_patterns = set()
        for pattern, stats in pattern_stats.items():
            attempts = stats["attempts"]
            solved = stats["solved"]
            
            # Must have at least 3 attempts
            if attempts >= 3:
                solve_rate = solved / attempts
                
                # Weak if solve rate < 50%
                if solve_rate < 0.5:
                    weak_patterns.add(pattern)
        
        return weak_patterns
    
    async def get_recent_solve_rate(self, user_id: ObjectId, last_n: int = 10) -> float:
        """
        Get user's recent solve rate for last N questions.
        
        Args:
            user_id: User's ObjectId
            last_n: Number of recent questions to consider
            
        Returns:
            Solve rate (0-1), defaults to 0.5 if no data
        """
        # Get last N user questions ordered by last_attempt_at
        user_questions = await self.db["user_questions"].find({
            "user_id": user_id,
            "attempts": {"$gte": 1}
        }).sort("last_attempt_at", -1).limit(last_n).to_list(None)
        
        if not user_questions:
            return 0.5  # Default to neutral
        
        solved_count = sum(1 for uq in user_questions if uq.get("solved", False))
        return solved_count / len(user_questions)
    
    async def get_recent_selections(self, user_id: ObjectId, last_n: int = 10) -> List[ObjectId]:
        """
        Get user's recent smart random selections.
        
        Requirements: 5.7, 5.11
        Track last 10 selections to avoid repeats
        
        Args:
            user_id: User's ObjectId
            last_n: Number of recent selections to retrieve
            
        Returns:
            List of question ObjectIds (most recent first)
        """
        # For now, we'll use a simple approach: get last N questions with last_attempt_at
        # In a full implementation, we'd have a separate collection for selection history
        user_questions = await self.db["user_questions"].find({
            "user_id": user_id,
            "last_attempt_at": {"$exists": True}
        }).sort("last_attempt_at", -1).limit(last_n).to_list(None)
        
        return [uq["question_id"] for uq in user_questions]
    
    async def select_smart_random(
        self,
        user_id: ObjectId,
        filters: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Select a question using smart random algorithm.
        
        Requirements: 5.1-5.11
        
        Algorithm:
        1. Filter to unsolved questions matching filters
        2. Calculate Priority_Score for each question
        3. Sort by score descending
        4. Select from top 20% using weighted random
        5. Record selection in history
        
        Args:
            user_id: User's ObjectId
            filters: Query filters (company_id, timeframe, difficulty, topics, patterns)
            
        Returns:
            Selected question document with priority_score and reason, or None if no questions
        """
        # Get user's weak patterns
        weak_patterns = await self.get_weak_patterns(user_id)
        
        # Get user's recent solve rate
        recent_solve_rate = await self.get_recent_solve_rate(user_id)
        
        # Get user's recent selections
        recent_selections = await self.get_recent_selections(user_id)
        
        # Build query for unsolved questions
        query = dict(filters)
        
        # Exclude solved questions (Requirement 5.1)
        solved_questions = await self.db["user_questions"].find({
            "user_id": user_id,
            "solved": True
        }).to_list(None)
        solved_ids = [uq["question_id"] for uq in solved_questions]
        
        if solved_ids:
            query["_id"] = {"$nin": solved_ids}
        
        # Get all matching questions
        questions = await self.db["questions"].find(query).to_list(None)
        
        if not questions:
            return None
        
        # Calculate priority scores for all questions
        scored_questions = []
        for question in questions:
            score = await self.calculate_priority_score(
                question=question,
                weak_patterns=weak_patterns,
                recent_solve_rate=recent_solve_rate,
                recent_selections=recent_selections
            )
            scored_questions.append((question, score))
        
        # Sort by score descending
        scored_questions.sort(key=lambda x: x[1].total_score, reverse=True)
        
        # Select from top 20% using weighted random (Requirement 5.1)
        top_20_percent = max(1, len(scored_questions) // 5)
        top_questions = scored_questions[:top_20_percent]
        
        # Weighted random selection (higher score = higher probability)
        # Use scores as weights (shift to positive if needed)
        min_score = min(score.total_score for _, score in top_questions)
        if min_score < 0:
            # Shift all scores to be positive
            weights = [score.total_score - min_score + 1 for _, score in top_questions]
        else:
            weights = [score.total_score + 1 for _, score in top_questions]
        
        # Select using weighted random
        selected_question, selected_score = random.choices(
            top_questions,
            weights=weights,
            k=1
        )[0]
        
        # Add priority_score and reason to question
        result = dict(selected_question)
        result["priority_score"] = selected_score.total_score
        result["reason"] = selected_score.reason
        
        return result
