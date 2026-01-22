"""
Streak tracking service for GrindMate.AI

Handles timezone-aware streak calculations based on consecutive solve days.
Implements Requirements 10.1-10.7.
"""

from datetime import datetime, date, timedelta
from typing import Optional, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.utils.timezone import get_user_timezone


class StreakService:
    """Service for calculating and updating user streaks"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    def get_user_local_date(self, timezone: str) -> date:
        """
        Get current date in user's local timezone.
        
        Args:
            timezone: IANA timezone string (e.g., "America/Los_Angeles")
            
        Returns:
            Current date in user's timezone
        """
        try:
            tz = get_user_timezone(timezone)
            return datetime.now(tz).date()
        except Exception:
            # Fallback to UTC if timezone is invalid
            return datetime.utcnow().date()
    
    def calculate_streak(
        self,
        last_solve_date: Optional[date],
        current_date: date
    ) -> Tuple[int, bool]:
        """
        Calculate streak based on last solve date and current date.
        
        Args:
            last_solve_date: Date of last solve (None if never solved)
            current_date: Current date in user's timezone
            
        Returns:
            Tuple of (new_streak, is_consecutive)
            - new_streak: 1 if starting new streak, current_streak + 1 if consecutive
            - is_consecutive: True if this solve continues the streak
        """
        if last_solve_date is None:
            # First solve ever
            return (1, False)
        
        # Calculate days difference
        days_diff = (current_date - last_solve_date).days
        
        if days_diff == 0:
            # Same day - no streak change
            return (0, True)  # 0 means no increment
        elif days_diff == 1:
            # Consecutive day - increment streak
            return (1, True)  # Will be added to current_streak
        else:
            # Missed days - reset streak
            return (1, False)  # Start new streak at 1
    
    async def update_streak_on_solve(
        self,
        user_id: ObjectId,
        timezone: str
    ) -> dict:
        """
        Update user's streak when they solve a question.
        
        Args:
            user_id: User's ObjectId
            timezone: User's IANA timezone string
            
        Returns:
            Dictionary with streak update info:
            {
                "streak_updated": bool,
                "new_streak": int,
                "longest_streak": int,
                "milestone_reached": Optional[int]  # 7, 30, or 100
            }
        """
        # Get current user data
        user = await self.db["users"].find_one({"_id": user_id})
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        current_date = self.get_user_local_date(timezone)
        last_solve_date = user.get("last_solve_date")
        current_streak = user.get("current_streak", 0)
        longest_streak = user.get("longest_streak", 0)
        
        # Calculate new streak
        streak_increment, is_consecutive = self.calculate_streak(
            last_solve_date,
            current_date
        )
        
        # No update needed if solving on same day
        if streak_increment == 0:
            return {
                "streak_updated": False,
                "new_streak": current_streak,
                "longest_streak": longest_streak,
                "milestone_reached": None
            }
        
        # Calculate new streak value
        if is_consecutive:
            new_streak = current_streak + streak_increment
        else:
            new_streak = streak_increment  # Reset to 1
        
        # Update longest streak if needed
        new_longest_streak = max(longest_streak, new_streak)
        
        # Check for milestones
        milestone_reached = None
        if new_streak in [7, 30, 100] and new_streak > current_streak:
            milestone_reached = new_streak
        
        # Update database
        await self.db["users"].update_one(
            {"_id": user_id},
            {
                "$set": {
                    "current_streak": new_streak,
                    "longest_streak": new_longest_streak,
                    "last_solve_date": current_date,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "streak_updated": True,
            "new_streak": new_streak,
            "longest_streak": new_longest_streak,
            "milestone_reached": milestone_reached
        }
    
    async def update_streak_on_unsolve(
        self,
        user_id: ObjectId,
        timezone: str
    ) -> dict:
        """
        Update user's streak when they unmark a question as solved.
        
        This recalculates the streak by checking if there are any other
        solves on the last_solve_date. If not, we need to find the previous
        solve date and recalculate the streak.
        
        Args:
            user_id: User's ObjectId
            timezone: User's IANA timezone string
            
        Returns:
            Dictionary with streak update info
        """
        # Get current user data
        user = await self.db["users"].find_one({"_id": user_id})
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Get all solved questions for this user, sorted by solve date
        solved_questions = await self.db["user_questions"].find(
            {"user_id": user_id, "solved": True},
            sort=[("solved_at", -1)]
        ).to_list(None)
        
        if not solved_questions:
            # No more solved questions - reset streak
            await self.db["users"].update_one(
                {"_id": user_id},
                {
                    "$set": {
                        "current_streak": 0,
                        "last_solve_date": None,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return {
                "streak_updated": True,
                "new_streak": 0,
                "longest_streak": user.get("longest_streak", 0),
                "milestone_reached": None
            }
        
        # Recalculate streak from scratch based on remaining solved questions
        new_streak = await self._recalculate_streak_from_history(
            solved_questions,
            timezone
        )
        
        # Get the most recent solve date
        most_recent_solve = solved_questions[0]["solved_at"]
        try:
            tz = get_user_timezone(timezone)
            last_solve_date = most_recent_solve.astimezone(tz).date()
        except Exception:
            last_solve_date = most_recent_solve.date()
        
        # Update database
        await self.db["users"].update_one(
            {"_id": user_id},
            {
                "$set": {
                    "current_streak": new_streak,
                    "last_solve_date": last_solve_date,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "streak_updated": True,
            "new_streak": new_streak,
            "longest_streak": user.get("longest_streak", 0),
            "milestone_reached": None
        }
    
    async def _recalculate_streak_from_history(
        self,
        solved_questions: list,
        timezone: str
    ) -> int:
        """
        Recalculate streak from a list of solved questions.
        
        Args:
            solved_questions: List of solved user_questions, sorted by solved_at desc
            timezone: User's IANA timezone string
            
        Returns:
            Current streak count
        """
        if not solved_questions:
            return 0
        
        try:
            tz = get_user_timezone(timezone)
        except Exception:
            tz = get_user_timezone("UTC")
        
        # Convert all solve dates to user's timezone
        solve_dates = []
        for q in solved_questions:
            if q.get("solved_at"):
                try:
                    local_date = q["solved_at"].astimezone(tz).date()
                    solve_dates.append(local_date)
                except Exception:
                    local_date = q["solved_at"].date()
                    solve_dates.append(local_date)
        
        if not solve_dates:
            return 0
        
        # Get unique dates and sort descending
        unique_dates = sorted(set(solve_dates), reverse=True)
        
        # Calculate streak from most recent date backwards
        streak = 1
        for i in range(len(unique_dates) - 1):
            current_date = unique_dates[i]
            next_date = unique_dates[i + 1]
            days_diff = (current_date - next_date).days
            
            if days_diff == 1:
                # Consecutive day
                streak += 1
            else:
                # Gap in streak - stop counting
                break
        
        return streak
    
    async def get_calendar_heatmap_data(
        self,
        user_id: ObjectId,
        timezone: str,
        days: int = 30
    ) -> list[dict]:
        """
        Get calendar heatmap data for the last N days.
        
        Args:
            user_id: User's ObjectId
            timezone: User's IANA timezone string
            days: Number of days to include (default 30)
            
        Returns:
            List of dictionaries with date and count:
            [{"date": "2025-01-22", "count": 3}, ...]
        """
        try:
            tz = get_user_timezone(timezone)
        except Exception:
            tz = get_user_timezone("UTC")
        
        current_date = datetime.now(tz).date()
        start_date = current_date - timedelta(days=days - 1)
        
        # Get all solved questions in the date range
        solved_questions = await self.db["user_questions"].find(
            {
                "user_id": user_id,
                "solved": True,
                "solved_at": {"$exists": True}
            }
        ).to_list(None)
        
        # Count solves per date
        date_counts = {}
        for q in solved_questions:
            if q.get("solved_at"):
                try:
                    local_date = q["solved_at"].astimezone(tz).date()
                except Exception:
                    local_date = q["solved_at"].date()
                
                if start_date <= local_date <= current_date:
                    date_str = local_date.isoformat()
                    date_counts[date_str] = date_counts.get(date_str, 0) + 1
        
        # Build result with all dates in range
        result = []
        for i in range(days):
            date_obj = start_date + timedelta(days=i)
            date_str = date_obj.isoformat()
            result.append({
                "date": date_str,
                "count": date_counts.get(date_str, 0)
            })
        
        return result
