"""
Test script for LeetCode GraphQL API
Tests fetching question content using the GraphQL endpoint
"""

import requests
import json
import sys

def test_leetcode_graphql(title_slug):
    """
    Test fetching question details from LeetCode GraphQL API
    
    Args:
        title_slug: The question's title slug (e.g., 'two-sum', 'valid-anagram')
    """
    
    # GraphQL endpoint
    url = "https://leetcode.com/graphql"
    
    # GraphQL query
    query = """
    query getQuestionDetail($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
            questionId
            title
            content
            difficulty
            exampleTestcases
            hints
            topicTags {
                name
                slug
            }
            codeSnippets {
                lang
                langSlug
                code
            }
            stats
            likes
            dislikes
        }
    }
    """
    
    # Request payload
    payload = {
        "query": query,
        "variables": {
            "titleSlug": title_slug
        }
    }
    
    # Headers
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://leetcode.com/problems/",
        "Origin": "https://leetcode.com"
    }
    
    print(f"\n{'='*60}")
    print(f"Testing LeetCode GraphQL API")
    print(f"{'='*60}")
    print(f"Title Slug: {title_slug}")
    print(f"URL: {url}")
    print(f"\nSending request...")
    
    try:
        # Make the request
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        # Parse response
        if response.status_code == 200:
            data = response.json()
            
            # Check if we got data
            if data.get('data') and data['data'].get('question'):
                question = data['data']['question']
                
                print(f"\n{'='*60}")
                print(f"✅ SUCCESS - Question Found!")
                print(f"{'='*60}")
                print(f"Question ID: {question.get('questionId')}")
                print(f"Title: {question.get('title')}")
                print(f"Difficulty: {question.get('difficulty')}")
                print(f"Likes: {question.get('likes')}")
                print(f"Dislikes: {question.get('dislikes')}")
                
                # Topics
                if question.get('topicTags'):
                    topics = [tag['name'] for tag in question['topicTags']]
                    print(f"Topics: {', '.join(topics)}")
                
                # Content preview
                if question.get('content'):
                    content = question['content']
                    content_preview = content[:200] + "..." if len(content) > 200 else content
                    print(f"\nContent Preview:")
                    print(f"{content_preview}")
                else:
                    print(f"\n⚠️  No content available")
                
                # Hints
                if question.get('hints'):
                    print(f"\nHints: {len(question['hints'])} available")
                    for i, hint in enumerate(question['hints'][:2], 1):
                        print(f"  {i}. {hint[:100]}...")
                
                # Code snippets
                if question.get('codeSnippets'):
                    languages = [snippet['lang'] for snippet in question['codeSnippets']]
                    print(f"\nCode Templates: {', '.join(languages)}")
                
                # Save full response to file
                output_file = f"leetcode_response_{title_slug}.json"
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f"\n✅ Full response saved to: {output_file}")
                
                return True
            else:
                print(f"\n{'='*60}")
                print(f"❌ FAILED - Question Not Found")
                print(f"{'='*60}")
                print(f"Response: {json.dumps(data, indent=2)}")
                return False
        else:
            print(f"\n{'='*60}")
            print(f"❌ FAILED - HTTP Error")
            print(f"{'='*60}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"\n❌ FAILED - Request Timeout")
        return False
    except requests.exceptions.RequestException as e:
        print(f"\n❌ FAILED - Request Error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ FAILED - Unexpected Error: {e}")
        return False


def test_multiple_questions():
    """Test multiple common LeetCode questions"""
    
    test_cases = [
        "two-sum",
        "valid-anagram",
        "reverse-linked-list",
        "best-time-to-buy-and-sell-stock",
        "maximum-subarray"
    ]
    
    print(f"\n{'='*60}")
    print(f"Testing Multiple Questions")
    print(f"{'='*60}")
    
    results = {}
    for slug in test_cases:
        success = test_leetcode_graphql(slug)
        results[slug] = success
        print("\n")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    successful = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"Successful: {successful}/{total}")
    
    for slug, success in results.items():
        status = "✅" if success else "❌"
        print(f"{status} {slug}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Test specific question
        title_slug = sys.argv[1]
        test_leetcode_graphql(title_slug)
    else:
        # Test multiple questions
        test_multiple_questions()
