"""
Quick diagnostic script to test the /tutor/chat endpoint
"""
import asyncio
import httpx

async def test_tutor_chat():
    """Test the tutor chat endpoint"""
    
    # You'll need to replace these with actual values
    base_url = "http://localhost:8000"
    
    # Test data
    payload = {
        "question_id": "YOUR_QUESTION_ID_HERE",  # Replace with actual question ID
        "message": "Can you help me understand this problem?",
        "tutor_mode": "socratic"
    }
    
    headers = {
        "Content-Type": "application/json",
        # Add your auth token here if needed
        # "Authorization": "Bearer YOUR_TOKEN"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{base_url}/tutor/chat",
                json=payload,
                headers=headers
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 500:
                print("\n500 Error detected!")
                print("This usually means:")
                print("1. Question ID doesn't exist")
                print("2. Question has no content/statement")
                print("3. Groq API key is invalid")
                print("4. Database connection issue")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_tutor_chat())
