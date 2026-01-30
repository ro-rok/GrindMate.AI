"""
Test script to verify CSRF token flow works correctly.
Run this after deploying to verify the fix.
"""
import requests
import sys

def test_csrf_flow(base_url="http://localhost:8000"):
    """Test the complete CSRF flow: login -> solve question"""
    
    print(f"Testing CSRF flow against {base_url}")
    print("=" * 60)
    
    # Step 1: Register/Login
    print("\n1. Logging in...")
    session = requests.Session()
    
    login_data = {
        "user": {
            "email": "test@example.com",
            "password": "testpassword123"
        }
    }
    
    try:
        response = session.post(f"{base_url}/users/sign_in.json", json=login_data)
        print(f"   Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"   Login failed: {response.text}")
            return False
        
        # Check cookies
        print(f"   Cookies received: {list(session.cookies.keys())}")
        
        csrf_cookie = session.cookies.get('csrf_token')
        if not csrf_cookie:
            print("   ❌ CSRF cookie not found!")
            return False
        
        print(f"   ✓ CSRF cookie present: {csrf_cookie[:20]}...")
        
        # Get CSRF token from response body
        csrf_token = response.json().get('csrf_token')
        if not csrf_token:
            print("   ❌ CSRF token not in response body!")
            return False
        
        print(f"   ✓ CSRF token in body: {csrf_token[:20]}...")
        
        # Verify they match
        if csrf_cookie != csrf_token:
            print("   ❌ CSRF cookie and body token don't match!")
            return False
        
        print("   ✓ CSRF tokens match")
        
    except Exception as e:
        print(f"   ❌ Login error: {e}")
        return False
    
    # Step 2: Make a POST request with CSRF token
    print("\n2. Testing POST request with CSRF token...")
    
    try:
        # Get user ID from login response
        user_id = response.json().get('id')
        if not user_id:
            print("   ❌ User ID not found in login response")
            return False
        
        # Try to solve a question (you'll need a valid question ID)
        # For now, just test any POST endpoint
        headers = {
            'X-CSRF-Token': csrf_token
        }
        
        # Test with a simple POST endpoint
        test_response = session.post(
            f"{base_url}/questions/test/solve.json?user_id={user_id}",
            headers=headers
        )
        
        print(f"   Status: {test_response.status_code}")
        
        if test_response.status_code == 403:
            print(f"   ❌ CSRF validation failed: {test_response.text}")
            return False
        
        # 404 is OK - means CSRF passed but question not found
        if test_response.status_code in [200, 404]:
            print("   ✓ CSRF validation passed")
            return True
        
        print(f"   Response: {test_response.text}")
        
    except Exception as e:
        print(f"   ❌ POST request error: {e}")
        return False
    
    return True


if __name__ == "__main__":
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    success = test_csrf_flow(base_url)
    
    print("\n" + "=" * 60)
    if success:
        print("✓ CSRF flow test PASSED")
        sys.exit(0)
    else:
        print("❌ CSRF flow test FAILED")
        sys.exit(1)
