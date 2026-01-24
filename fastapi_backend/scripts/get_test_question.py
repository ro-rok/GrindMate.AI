"""Get a test question ID for testing"""
import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Connect to MongoDB
client = MongoClient(os.getenv('MONGODB_URI'))
db = client['leetcode_tracker']

# Count questions
count = db.questions.count_documents({})
print(f"Total questions in database: {count}")

if count > 0:
    # Get first question
    q = db.questions.find_one()
    print(f"\nQuestion ID: {q['_id']}")
    print(f"Title: {q.get('title', 'N/A')}")
    print(f"TitleSlug: {q.get('titleSlug', 'N/A')}")
    print(f"Link: {q.get('link', 'N/A')}")
    
    # Get company
    c = db.companies.find_one({'_id': q['company_id']})
    if c:
        print(f"Company: {c['name']}")
        print(f"Company Slug: {c.get('slug', 'N/A')}")
        company_id = c.get('slug', str(c['_id']))
        print(f"\nTest URL: http://localhost:8000/companies/{company_id}/questions/{q['_id']}/leetcode-content")
else:
    print("No questions in database!")
