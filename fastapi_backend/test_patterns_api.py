"""
Integration test for pattern API endpoints.
Run this after starting the FastAPI server.
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_get_all_patterns():
    """Test GET /patterns endpoint."""
    print("\n=== Testing GET /patterns ===")
    response = requests.get(f"{BASE_URL}/patterns")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        patterns = response.json()
        print(f"Number of patterns: {len(patterns)}")
        print(f"First 3 patterns:")
        for pattern in patterns[:3]:
            print(f"  - {pattern['name']}: {pattern['description']}")
        return True
    else:
        print(f"Error: {response.text}")
        return False

def test_derive_patterns():
    """Test POST /patterns/derive endpoint."""
    print("\n=== Testing POST /patterns/derive ===")
    
    test_cases = [
        "array,hash-table,dynamic-programming",
        "graph,tree,dfs",
        "string,two-pointers,sliding-window",
        "linked-list,fast-slow-pointers"
    ]
    
    for topics in test_cases:
        print(f"\nTopics: {topics}")
        response = requests.post(
            f"{BASE_URL}/patterns/derive",
            json={"topics": topics}
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Derived patterns: {result['patterns']}")
        else:
            print(f"Error: {response.text}")
            return False
    
    return True

def test_get_config_info():
    """Test GET /patterns/info endpoint."""
    print("\n=== Testing GET /patterns/info ===")
    response = requests.get(f"{BASE_URL}/patterns/info")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        info = response.json()
        print(f"Config info:")
        print(json.dumps(info, indent=2))
        return True
    else:
        print(f"Error: {response.text}")
        return False

def test_reload_config():
    """Test POST /patterns/reload endpoint."""
    print("\n=== Testing POST /patterns/reload ===")
    response = requests.post(f"{BASE_URL}/patterns/reload")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Reload result:")
        print(json.dumps(result, indent=2))
        return True
    else:
        print(f"Error: {response.text}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Pattern API Integration Tests")
    print("=" * 60)
    print("\nMake sure the FastAPI server is running on http://localhost:8000")
    print("Start it with: cd fastapi_backend && uvicorn app.main:app --reload")
    
    input("\nPress Enter to continue...")
    
    results = []
    results.append(("GET /patterns", test_get_all_patterns()))
    results.append(("POST /patterns/derive", test_derive_patterns()))
    results.append(("GET /patterns/info", test_get_config_info()))
    results.append(("POST /patterns/reload", test_reload_config()))
    
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{status}: {test_name}")
    
    all_passed = all(result[1] for result in results)
    print("\n" + ("All tests passed!" if all_passed else "Some tests failed."))
