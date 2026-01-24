"""
Populate code templates for questions from LeetCode GraphQL API
This script fetches code snippets for each question and stores them in the database
"""

import os
import sys
import asyncio
from pymongo import MongoClient
from dotenv import load_dotenv
import httpx

# Load environment variables
load_dotenv()

# Connect to MongoDB
client = MongoClient(os.getenv('MONGODB_URI'))
db = client['leetcode_tracker']


async def fetch_leetcode_content(title_slug: str):
    """Fetch question content from LeetCode GraphQL API"""
    
    url = "https://leetcode.com/graphql"
    
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
    
    payload = {
        "query": query,
        "variables": {"titleSlug": title_slug}
    }
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://leetcode.com/problems/",
        "Origin": "https://leetcode.com"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.post(url, json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('data') and data['data'].get('question'):
                    return data['data']['question']
            return None
    except Exception as e:
        print(f"Error fetching content for {title_slug}: {e}")
        return None


def extract_title_slug(link: str) -> str:
    """Extract title slug from LeetCode link"""
    if not link or 'leetcode.com/problems/' not in link:
        return None
    
    try:
        parts = link.split('/problems/')
        if len(parts) > 1:
            slug = parts[1].rstrip('/').split('/')[0]
            return slug
    except:
        pass
    
    return None


async def populate_question_content(question_id, title_slug):
    """Fetch and store LeetCode content for a question"""
    
    print(f"Fetching content for: {title_slug}")
    
    content = await fetch_leetcode_content(title_slug)
    
    if not content:
        print(f"  ❌ Failed to fetch content")
        return False
    
    # Prepare update data
    update_data = {
        "leetcode_content": content.get('content'),
        "leetcode_hints": content.get('hints', []),
        "leetcode_example_testcases": content.get('exampleTestcases'),
        "leetcode_code_snippets": content.get('codeSnippets', []),
        "leetcode_stats": content.get('stats'),
        "leetcode_likes": content.get('likes'),
        "leetcode_dislikes": content.get('dislikes'),
    }
    
    # Update topic tags if available
    if content.get('topicTags'):
        topics = [tag['name'] for tag in content['topicTags']]
        update_data['topics'] = ', '.join(topics)
    
    # Update the question in database
    result = db.questions.update_one(
        {"_id": question_id},
        {"$set": update_data}
    )
    
    if result.modified_count > 0:
        print(f"  ✅ Updated with {len(content.get('codeSnippets', []))} code templates")
        return True
    else:
        print(f"  ⚠️  No changes made")
        return False


async def populate_all_questions():
    """Populate content for all questions in database"""
    
    print("="*60)
    print("Populating LeetCode Content for Questions")
    print("="*60)
    
    # Get all questions
    questions = list(db.questions.find())
    
    if not questions:
        print("No questions found in database!")
        return
    
    print(f"Found {len(questions)} questions\n")
    
    success_count = 0
    failed_count = 0
    skipped_count = 0
    
    for i, question in enumerate(questions, 1):
        title = question.get('title', 'Unknown')
        question_id = question['_id']
        
        print(f"[{i}/{len(questions)}] {title}")
        
        # Get title slug
        title_slug = question.get('titleSlug')
        
        if not title_slug:
            # Try to extract from link
            link = question.get('link')
            if link:
                title_slug = extract_title_slug(link)
        
        if not title_slug:
            print(f"  ⚠️  No titleSlug or valid link - skipping")
            skipped_count += 1
            continue
        
        # Check if already has content
        if question.get('leetcode_content'):
            print(f"  ℹ️  Already has content - skipping")
            skipped_count += 1
            continue
        
        # Fetch and populate
        success = await populate_question_content(question_id, title_slug)
        
        if success:
            success_count += 1
        else:
            failed_count += 1
        
        # Small delay to avoid rate limiting
        await asyncio.sleep(0.5)
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Total: {len(questions)}")
    print(f"✅ Success: {success_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"⚠️  Skipped: {skipped_count}")


async def populate_single_question(question_title: str):
    """Populate content for a single question by title"""
    
    print("="*60)
    print(f"Populating Content for: {question_title}")
    print("="*60)
    
    # Find question
    question = db.questions.find_one({"title": question_title})
    
    if not question:
        print(f"Question '{question_title}' not found in database!")
        return
    
    # Get title slug
    title_slug = question.get('titleSlug')
    
    if not title_slug:
        link = question.get('link')
        if link:
            title_slug = extract_title_slug(link)
    
    if not title_slug:
        print("No titleSlug or valid link found!")
        return
    
    # Fetch and populate
    await populate_question_content(question['_id'], title_slug)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Populate specific question
        question_title = " ".join(sys.argv[1:])
        asyncio.run(populate_single_question(question_title))
    else:
        # Populate all questions
        asyncio.run(populate_all_questions())
