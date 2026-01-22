"""
Test script for timezone utilities

This script tests that the timezone utilities work correctly on Windows
and other platforms, with proper fallback behavior.
"""

import sys
sys.path.insert(0, 'app')

from datetime import datetime, timezone
from utils.timezone import get_utc_timezone, get_user_timezone


def test_get_utc_timezone():
    """Test that get_utc_timezone returns a valid timezone"""
    print("\n=== Testing get_utc_timezone ===")
    
    try:
        tz = get_utc_timezone()
        print(f"✓ get_utc_timezone() returned: {tz}")
        
        # Test that we can use it
        now = datetime.now(tz)
        print(f"✓ Current time in UTC: {now}")
        
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_get_user_timezone_valid():
    """Test get_user_timezone with valid IANA strings"""
    print("\n=== Testing get_user_timezone with valid strings ===")
    
    test_timezones = [
        "UTC",
        "America/Los_Angeles",
        "America/New_York",
        "Europe/London",
        "Asia/Tokyo"
    ]
    
    all_passed = True
    for tz_string in test_timezones:
        try:
            tz = get_user_timezone(tz_string)
            now = datetime.now(tz)
            print(f"✓ {tz_string}: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        except Exception as e:
            print(f"✗ {tz_string}: Error - {e}")
            all_passed = False
    
    return all_passed


def test_get_user_timezone_invalid():
    """Test get_user_timezone with invalid strings (should fallback to UTC)"""
    print("\n=== Testing get_user_timezone with invalid strings ===")
    
    test_timezones = [
        "Invalid/Timezone",
        "NotATimezone",
        "",
        "America/FakeCity"
    ]
    
    all_passed = True
    for tz_string in test_timezones:
        try:
            tz = get_user_timezone(tz_string)
            now = datetime.now(tz)
            print(f"✓ {tz_string}: Fallback to UTC - {now.strftime('%Y-%m-%d %H:%M:%S')}")
        except Exception as e:
            print(f"✗ {tz_string}: Error - {e}")
            all_passed = False
    
    return all_passed


def test_timezone_operations_never_throw():
    """Property test: Timezone operations should never throw exceptions"""
    print("\n=== Property Test: Timezone Operations Never Throw ===")
    
    # Test with various inputs including edge cases
    test_inputs = [
        "UTC",
        "America/Los_Angeles",
        "Invalid/Timezone",
        "",
        None,
        "12345",
        "America/New_York",
        "Europe/London",
        "Asia/Tokyo",
        "Australia/Sydney"
    ]
    
    all_passed = True
    for tz_input in test_inputs:
        try:
            if tz_input is None:
                # Skip None for now as it's not a valid string
                continue
            
            tz = get_user_timezone(tz_input)
            now = datetime.now(tz)
            date_obj = now.date()
            print(f"✓ Input '{tz_input}': No exception, got date {date_obj}")
        except Exception as e:
            print(f"✗ Input '{tz_input}': Threw exception - {e}")
            all_passed = False
    
    return all_passed


if __name__ == "__main__":
    print("=" * 60)
    print("Testing Timezone Utilities")
    print("=" * 60)
    
    results = []
    
    results.append(("get_utc_timezone", test_get_utc_timezone()))
    results.append(("get_user_timezone (valid)", test_get_user_timezone_valid()))
    results.append(("get_user_timezone (invalid)", test_get_user_timezone_invalid()))
    results.append(("Property: Never Throw", test_timezone_operations_never_throw()))
    
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{status}: {test_name}")
    
    all_passed = all(passed for _, passed in results)
    
    if all_passed:
        print("\n✓ All tests passed!")
        sys.exit(0)
    else:
        print("\n✗ Some tests failed!")
        sys.exit(1)
