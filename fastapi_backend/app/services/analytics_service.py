"""
Analytics Service for GrindMate.AI

Handles weak topic detection, pattern analysis, and solve rate calculations.
Requirements: 11.1-11.7
"""

from typing import List, Dict, Any, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime


class WeakTopic:
    """Represents a weak topic with solve statistics"""
    def __init__(self, topic: str, solve_rate: float, attempts: int, solved: int):
        self.topic = topic
        self.solve_rate = solve_rate
        self.attempts = attempts
        self.solved = solved
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "topic": self.topic,
            "solve_rate": self.solve_rate,
            "attempts": self.attempts,
            "solved": self.solved
        }


class PatternStats:
    """Represents pattern statistics"""
    def __init__(self, pattern: str, solved: int, total: int):
        self.pattern = pattern
        self.solved = solved
        self.total = total
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "solved": self.solved,
            "total": self.total
        }


class AnalyticsService:
    """Service for calculating user analytics and weak topics"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def calculate_weak_topics(self, user_id: ObjectId) -> List[WeakTopic]:
        """
        Calculate weak topics for a user.
        
        A topic is considered weak if:
        - Solve rate < 50% (solved_attempts / total_attempts)
        - User has at least 3 attempts for that topic
        
        Requirements: 11.1, 11.2, 11.3
        
        Args:
            user_id: The user's ObjectId
            
        Returns:
            List of WeakTopic objects sorted by solve rate (lowest first)
        """
        # Get all user questions with attempt data
        user_questions = await self.db["user_questions"].find({
            "user_id": user_id,
            "attempts": {"$gte": 1}  # Only questions with at least 1 attempt
        }).to_list(None)
        
        if not user_questions:
            return []
        
        # Get question details to extract topics
        question_ids = [uq["question_id"] for uq in user_questions]
        questions = await self.db["questions"].find({
            "_id": {"$in": question_ids}
        }).to_list(None)
        
        # Create a map of question_id -> topics
        question_topics_map = {}
        for q in questions:
            if q.get("topics"):
                # Topics are comma-separated strings
                topics_list = [t.strip() for t in q["topics"].split(",") if t.strip()]
                question_topics_map[q["_id"]] = topics_list
        
        # Calculate solve rate per topic
        topic_stats: Dict[str, Dict[str, int]] = {}
        
        for uq in user_questions:
            question_id = uq["question_id"]
            topics = question_topics_map.get(question_id, [])
            is_solved = uq.get("solved", False)
            
            for topic in topics:
                if topic not in topic_stats:
                    topic_stats[topic] = {"attempts": 0, "solved": 0}
                
                topic_stats[topic]["attempts"] += 1
                if is_solved:
                    topic_stats[topic]["solved"] += 1
        
        # Identify weak topics
        weak_topics = []
        for topic, stats in topic_stats.items():
            attempts = stats["attempts"]
            solved = stats["solved"]
            
            # Requirement 11.3: Must have at least 3 attempts
            if attempts >= 3:
                solve_rate = solved / attempts
                
                # Requirement 11.2: Weak if solve rate < 50%
                if solve_rate < 0.5:
                    weak_topics.append(WeakTopic(
                        topic=topic,
                        solve_rate=solve_rate,
                        attempts=attempts,
                        solved=solved
                    ))
        
        # Sort by solve rate (lowest first)
        weak_topics.sort(key=lambda x: x.solve_rate)
        
        return weak_topics
    
    async def calculate_weak_patterns(self, user_id: ObjectId) -> List[WeakTopic]:
        """
        Calculate weak patterns for a user.
        
        A pattern is considered weak if:
        - Solve rate < 50% (solved_attempts / total_attempts)
        - User has at least 3 attempts for that pattern
        
        Requirements: 11.1, 11.2, 11.3
        
        Args:
            user_id: The user's ObjectId
            
        Returns:
            List of WeakTopic objects (representing patterns) sorted by solve rate
        """
        # Get all user questions with attempt data
        user_questions = await self.db["user_questions"].find({
            "user_id": user_id,
            "attempts": {"$gte": 1}
        }).to_list(None)
        
        if not user_questions:
            return []
        
        # Get question details to extract patterns
        question_ids = [uq["question_id"] for uq in user_questions]
        questions = await self.db["questions"].find({
            "_id": {"$in": question_ids}
        }).to_list(None)
        
        # Create a map of question_id -> patterns
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
        weak_patterns = []
        for pattern, stats in pattern_stats.items():
            attempts = stats["attempts"]
            solved = stats["solved"]
            
            # Must have at least 3 attempts
            if attempts >= 3:
                solve_rate = solved / attempts
                
                # Weak if solve rate < 50%
                if solve_rate < 0.5:
                    weak_patterns.append(WeakTopic(
                        topic=pattern,  # Using topic field for pattern name
                        solve_rate=solve_rate,
                        attempts=attempts,
                        solved=solved
                    ))
        
        # Sort by solve rate (lowest first)
        weak_patterns.sort(key=lambda x: x.solve_rate)
        
        return weak_patterns
    
    async def calculate_pattern_distribution(self, user_id: ObjectId) -> Dict[str, PatternStats]:
        """
        Calculate pattern distribution for a user.
        
        Returns solve statistics for all patterns the user has encountered.
        
        Requirements: 11.7
        
        Args:
            user_id: The user's ObjectId
            
        Returns:
            Dictionary mapping pattern name to PatternStats
        """
        # Get all user questions
        user_questions = await self.db["user_questions"].find({
            "user_id": user_id
        }).to_list(None)
        
        if not user_questions:
            return {}
        
        # Get question details to extract patterns
        question_ids = [uq["question_id"] for uq in user_questions]
        questions = await self.db["questions"].find({
            "_id": {"$in": question_ids}
        }).to_list(None)
        
        # Create a map of question_id -> patterns
        question_patterns_map = {}
        for q in questions:
            if q.get("patterns"):
                question_patterns_map[q["_id"]] = q["patterns"]
        
        # Calculate stats per pattern
        pattern_stats: Dict[str, Dict[str, int]] = {}
        
        for uq in user_questions:
            question_id = uq["question_id"]
            patterns = question_patterns_map.get(question_id, [])
            is_solved = uq.get("solved", False)
            
            for pattern in patterns:
                if pattern not in pattern_stats:
                    pattern_stats[pattern] = {"total": 0, "solved": 0}
                
                pattern_stats[pattern]["total"] += 1
                if is_solved:
                    pattern_stats[pattern]["solved"] += 1
        
        # Convert to PatternStats objects
        result = {}
        for pattern, stats in pattern_stats.items():
            result[pattern] = PatternStats(
                pattern=pattern,
                solved=stats["solved"],
                total=stats["total"]
            )
        
        return result
    
    async def calculate_solve_stats_by_difficulty(self, user_id: ObjectId) -> Dict[str, int]:
        """
        Calculate solve statistics by difficulty level.
        
        Requirements: 11.7
        
        Args:
            user_id: The user's ObjectId
            
        Returns:
            Dictionary with counts for EASY, MEDIUM, HARD
        """
        # Get all solved user questions
        user_questions = await self.db["user_questions"].find({
            "user_id": user_id,
            "solved": True
        }).to_list(None)
        
        if not user_questions:
            return {"EASY": 0, "MEDIUM": 0, "HARD": 0}
        
        # Get question details to extract difficulty
        question_ids = [uq["question_id"] for uq in user_questions]
        questions = await self.db["questions"].find({
            "_id": {"$in": question_ids}
        }).to_list(None)
        
        # Count by difficulty
        difficulty_counts = {"EASY": 0, "MEDIUM": 0, "HARD": 0}
        for q in questions:
            difficulty = q.get("difficulty", "").upper()
            if difficulty in difficulty_counts:
                difficulty_counts[difficulty] += 1
        
        return difficulty_counts
    
    async def calculate_recent_solve_rate(self, user_id: ObjectId, last_n: int = 10) -> float:
        """
        Calculate solve rate for the last N questions attempted.
        
        Used for difficulty ramping in smart random selection.
        
        Args:
            user_id: The user's ObjectId
            last_n: Number of recent questions to consider (default: 10)
            
        Returns:
            Solve rate as a float between 0 and 1
        """
        # Get last N user questions ordered by last_attempt_at
        user_questions = await self.db["user_questions"].find({
            "user_id": user_id,
            "attempts": {"$gte": 1}
        }).sort("last_attempt_at", -1).limit(last_n).to_list(None)
        
        if not user_questions:
            return 0.5  # Default to neutral if no data
        
        solved_count = sum(1 for uq in user_questions if uq.get("solved", False))
        return solved_count / len(user_questions)
