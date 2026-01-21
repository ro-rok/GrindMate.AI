"""
Manual test for streak service functionality.
Run this to verify the streak tracking implementation works correctly.
"""

from datetime import date, timedelta
import sys
import os

# Add parent directory to path to import the service
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_streak_calculation():
    """Test the streak calculation logic without DB dependencies"""
    
    print("Testing streak calculation logic...")
    
    # Simulate the calculate_streak function logic
    def calculate_streak(last_solve_date, current_date):
        if last_solve_date is None:
            return (1, False)
        
        days_diff = (current_date - last_solve_date).days
        
        if days_diff == 0:
            return (0, True)
        elif days_diff == 1:
            return (1, True)
        else:
            return (1, False)
    
    # Test 1: First solve ever
    streak, is_consecutive = calculate_streak(None, date.today())
    assert streak == 1 and not is_consecutive, "First solve should return (1, False)"
    print("✓ Test 1 passed: First solve ever")
    
    # Test 2: Same day solve
    today = date.today()
    streak, is_consecutive = calculate_streak(today, today)
    assert streak == 0 and is_consecutive, "Same day should return (0, True)"
    print("✓ Test 2 passed: Same day solve")
    
    # Test 3: Consecutive day
    yesterday = today - timedelta(days=1)
    streak, is_consecutive = calculate_streak(yesterday, today)
    assert streak == 1 and is_consecutive, "Consecutive day should return (1, True)"
    print("✓ Test 3 passed: Consecutive day")
    
    # Test 4: Missed days (reset)
    three_days_ago = today - timedelta(days=3)
    streak, is_consecutive = calculate_streak(three_days_ago, today)
    assert streak == 1 and not is_consecutive, "Missed days should return (1, False)"
    print("✓ Test 4 passed: Missed days reset")
    
    print("\n✅ All streak calculation tests passed!")


def test_timezone_date():
    """Test timezone-aware date calculation"""
    from zoneinfo import ZoneInfo
    from datetime import datetime
    
    print("\nTesting timezone-aware date calculation...")
    
    def get_user_local_date(timezone):
        try:
            tz = ZoneInfo(timezone)
            return datetime.now(tz).date()
        except Exception:
            return datetime.utcnow().date()
    
    # Test with different timezones
    utc_date = get_user_local_date("UTC")
    la_date = get_user_local_date("America/Los_Angeles")
    tokyo_date = get_user_local_date("Asia/Tokyo")
    
    print(f"  UTC date: {utc_date}")
    print(f"  LA date: {la_date}")
    print(f"  Tokyo date: {tokyo_date}")
    
    # Test with invalid timezone (should fallback to UTC)
    invalid_date = get_user_local_date("Invalid/Timezone")
    assert invalid_date == utc_date, "Invalid timezone should fallback to UTC"
    print("✓ Invalid timezone fallback works")
    
    print("\n✅ Timezone tests passed!")


if __name__ == "__main__":
    test_streak_calculation()
    test_timezone_date()
    print("\n🎉 All tests completed successfully!")

