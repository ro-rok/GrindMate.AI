"""
Test script for checkpoint 3: Backend fixes complete
Tests all required endpoints to verify they return correct status codes.
"""
import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_public_endpoints():
    """Test public endpoints that should work without authentication"""
    print("\n=== Testing Public Endpoints ===")
    
    # Test GET /companies
    print("\n1. Testing GET /companies (should return 200)")
    try:
        response = requests.get(f"{BASE_URL}/companies")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            companies = response.json()
            print(f"   ✓ Success! Found {len(companies)} companies")
            return companies[0]["id"] if companies else None
        else:
            print(f"   ✗ Failed! Expected 200, got {response.status_code}")
            return None
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return None

def test_questions_endpoint(company_id):
    """Test questions endpoint"""
    print("\n2. Testing GET /companies/{company_id}/questions (should return 200)")
    if not company_id:
        print("   ✗ Skipped - no company ID available")
        return False
    
    try:
        response = requests.get(f"{BASE_URL}/companies/{company_id}/questions")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            questions = data.get("questions", [])
            print(f"   ✓ Success! Found {len(questions)} questions")
            return True
        else:
            print(f"   ✗ Failed! Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return False

def test_authenticated_endpoints():
    """Test authenticated endpoints"""
    print("\n=== Testing Authenticated Endpoints ===")
    
    # First, try to register or login a test user
    test_email = "test_checkpoint@example.com"
    test_password = "testpassword123"
    
    print("\n3. Attempting to login/register test user")
    
    # Try to login first
    session = requests.Session()
    try:
        login_response = session.post(
            f"{BASE_URL}/users/sign_in",
            json={"email": test_email, "password": test_password}
        )
        
        if login_response.status_code == 200:
            print("   ✓ Logged in successfully")
        elif login_response.status_code == 401:
            # User doesn't exist, try to register
            print("   User doesn't exist, registering...")
            register_response = session.post(
                f"{BASE_URL}/users",
                json={"email": test_email, "password": test_password}
            )
            if register_response.status_code == 201:
                print("   ✓ Registered successfully")
            else:
                print(f"   ✗ Registration failed: {register_response.status_code}")
                print(f"   Response: {register_response.text}")
                return False, False
        else:
            print(f"   ✗ Login failed: {login_response.status_code}")
            print(f"   Response: {login_response.text}")
            return False, False
    except Exception as e:
        print(f"   ✗ Error during authentication: {e}")
        return False, False
    
    # Test GET /users/me/streak
    print("\n4. Testing GET /users/me/streak (should return 200)")
    try:
        response = session.get(f"{BASE_URL}/users/me/streak")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Success! Current streak: {data.get('current_streak', 0)}")
            streak_ok = True
        else:
            print(f"   ✗ Failed! Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            streak_ok = False
    except Exception as e:
        print(f"   ✗ Error: {e}")
        streak_ok = False
    
    # Test GET /users/me/analytics
    print("\n5. Testing GET /users/me/analytics (should return 200)")
    try:
        response = session.get(f"{BASE_URL}/users/me/analytics")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Success! Total solved: {data.get('solve_stats', {}).get('total_solved', 0)}")
            analytics_ok = True
        else:
            print(f"   ✗ Failed! Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            analytics_ok = False
    except Exception as e:
        print(f"   ✗ Error: {e}")
        analytics_ok = False
    
    return streak_ok, analytics_ok

def main():
    print("=" * 60)
    print("Checkpoint 3: Backend Fixes Complete")
    print("=" * 60)
    
    # Test public endpoints
    company_id = test_public_endpoints()
    questions_ok = test_questions_endpoint(company_id)
    
    # Test authenticated endpoints
    streak_ok, analytics_ok = test_authenticated_endpoints()
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✓ GET /companies: {'PASS' if company_id else 'FAIL'}")
    print(f"✓ GET /companies/{{id}}/questions: {'PASS' if questions_ok else 'FAIL'}")
    print(f"✓ GET /users/me/streak: {'PASS' if streak_ok else 'FAIL'}")
    print(f"✓ GET /users/me/analytics: {'PASS' if analytics_ok else 'FAIL'}")
    
    all_passed = company_id and questions_ok and streak_ok and analytics_ok
    
    if all_passed:
        print("\n🎉 All tests PASSED! Backend fixes are complete.")
        return 0
    else:
        print("\n❌ Some tests FAILED. Please review the output above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
