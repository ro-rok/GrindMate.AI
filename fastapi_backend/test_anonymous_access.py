"""
Test script for anonymous user access to public endpoints.

This script tests that:
1. Public endpoints (/companies, /questions) work without authentication
2. Protected endpoints (/users/me/*) return 401 without authentication
"""

import sys

# Add parent directory to path
sys.path.insert(0, '.')

from fastapi.testclient import TestClient
from app.main import app


def test_anonymous_access():
    """Test that anonymous users can access public endpoints"""
    
    print("Testing anonymous access to public endpoints...")
    print("-" * 60)
    
    with TestClient(app) as client:
        # Test 1: GET /companies (should work without auth)
        print("\n1. Testing GET /companies (public endpoint)")
        response = client.get("/companies")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✓ Success - returned {len(response.json())} companies")
        else:
            print(f"   ✗ Failed - expected 200, got {response.status_code}")
        
        # Test 2: GET /companies/{id} (should work without auth)
        print("\n2. Testing GET /companies/{id} (public endpoint)")
        # First get a company ID
        companies_response = client.get("/companies")
        if companies_response.status_code == 200 and len(companies_response.json()) > 0:
            company_id = companies_response.json()[0]["id"]
            response = client.get(f"/companies/{company_id}")
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                print(f"   ✓ Success - returned company data")
            else:
                print(f"   ✗ Failed - expected 200, got {response.status_code}")
        else:
            print("   ⊘ Skipped - no companies available")
        
        # Test 3: GET /companies/{id}/questions (should work without auth)
        print("\n3. Testing GET /companies/{id}/questions (public endpoint)")
        if companies_response.status_code == 200 and len(companies_response.json()) > 0:
            company_id = companies_response.json()[0]["id"]
            response = client.get(f"/companies/{company_id}/questions")
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✓ Success - returned {data.get('total_count', 0)} questions")
            else:
                print(f"   ✗ Failed - expected 200, got {response.status_code}")
        else:
            print("   ⊘ Skipped - no companies available")
        
        # Test 4: GET /users/me/streak (should return 401 without auth)
        print("\n4. Testing GET /users/me/streak (protected endpoint)")
        response = client.get("/users/me/streak")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print(f"   ✓ Success - correctly rejected anonymous access")
        else:
            print(f"   ✗ Failed - expected 401, got {response.status_code}")
        
        # Test 5: GET /users/me/analytics (protected endpoint)
        print("\n5. Testing GET /users/me/analytics (protected endpoint)")
        response = client.get("/users/me/analytics")
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print(f"   ✓ Success - correctly rejected anonymous access")
        else:
            print(f"   ✗ Failed - expected 401, got {response.status_code}")
    
    print("\n" + "-" * 60)
    print("Test complete!")


if __name__ == "__main__":
    test_anonymous_access()
