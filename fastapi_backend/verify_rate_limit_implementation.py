"""
Simple verification script to check RateLimitService implementation

This script verifies the code structure without running it.
"""

import ast
import sys


def verify_implementation():
    """Verify the RateLimitService implementation"""
    print("=" * 80)
    print("Verifying RateLimitService Implementation")
    print("=" * 80)
    print()
    
    # Read the rate_limit_service.py file
    with open("app/services/rate_limit_service.py", "r") as f:
        code = f.read()
    
    # Parse the code
    try:
        tree = ast.parse(code)
        print("✓ Code syntax is valid")
    except SyntaxError as e:
        print(f"✗ Syntax error: {e}")
        return False
    
    # Find the RateLimitService class
    rate_limit_class = None
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == "RateLimitService":
            rate_limit_class = node
            break
    
    if not rate_limit_class:
        print("✗ RateLimitService class not found")
        return False
    
    print("✓ RateLimitService class found")
    
    # Check for required methods
    required_methods = [
        "check_tutor_rate_limit",
        "increment_tutor_request_count",
        "reset_tutor_rate_limit_if_expired"
    ]
    
    found_methods = []
    for node in rate_limit_class.body:
        if isinstance(node, ast.AsyncFunctionDef):
            found_methods.append(node.name)
    
    print()
    print("Checking for required methods:")
    all_found = True
    for method in required_methods:
        if method in found_methods:
            print(f"  ✓ {method}")
        else:
            print(f"  ✗ {method} - NOT FOUND")
            all_found = False
    
    if not all_found:
        return False
    
    # Check method signatures
    print()
    print("Verifying method signatures:")
    
    for node in rate_limit_class.body:
        if isinstance(node, ast.AsyncFunctionDef):
            if node.name == "check_tutor_rate_limit":
                # Check parameters
                args = [arg.arg for arg in node.args.args if arg.arg != "self"]
                if "user_id" in args:
                    print(f"  ✓ check_tutor_rate_limit has user_id parameter")
                else:
                    print(f"  ✗ check_tutor_rate_limit missing user_id parameter")
                    all_found = False
            
            elif node.name == "increment_tutor_request_count":
                args = [arg.arg for arg in node.args.args if arg.arg != "self"]
                if "user_id" in args:
                    print(f"  ✓ increment_tutor_request_count has user_id parameter")
                else:
                    print(f"  ✗ increment_tutor_request_count missing user_id parameter")
                    all_found = False
            
            elif node.name == "reset_tutor_rate_limit_if_expired":
                args = [arg.arg for arg in node.args.args if arg.arg != "self"]
                if "user_id" in args:
                    print(f"  ✓ reset_tutor_rate_limit_if_expired has user_id parameter")
                else:
                    print(f"  ✗ reset_tutor_rate_limit_if_expired missing user_id parameter")
                    all_found = False
    
    # Check user model
    print()
    print("Checking user model:")
    with open("app/models/user.py", "r") as f:
        user_code = f.read()
    
    if "is_premium" in user_code:
        print("  ✓ is_premium field added to user model")
    else:
        print("  ✗ is_premium field NOT found in user model")
        all_found = False
    
    # Check tutor_rate_limit model
    print()
    print("Checking tutor_rate_limit model:")
    try:
        with open("app/models/tutor_rate_limit.py", "r") as f:
            model_code = f.read()
        
        if "TutorRateLimit" in model_code:
            print("  ✓ TutorRateLimit model created")
        else:
            print("  ✗ TutorRateLimit model NOT found")
            all_found = False
    except FileNotFoundError:
        print("  ✗ tutor_rate_limit.py file NOT found")
        all_found = False
    
    # Check init_db.py for indexes
    print()
    print("Checking database indexes:")
    with open("app/init_db.py", "r") as f:
        init_db_code = f.read()
    
    if "tutor_rate_limits" in init_db_code:
        print("  ✓ tutor_rate_limits indexes added to init_db.py")
    else:
        print("  ✗ tutor_rate_limits indexes NOT found in init_db.py")
        all_found = False
    
    print()
    print("=" * 80)
    if all_found:
        print("✅ All implementation requirements verified!")
        print("=" * 80)
        return True
    else:
        print("✗ Some requirements are missing")
        print("=" * 80)
        return False


if __name__ == "__main__":
    success = verify_implementation()
    sys.exit(0 if success else 1)
