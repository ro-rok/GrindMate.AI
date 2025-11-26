import json
from typing import Any, Dict, Optional

import httpx
from bs4 import BeautifulSoup
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from ..config import get_settings
from ..db import get_database


async def scrape_question_text(link: str) -> str:
    """
    Port of ChatsController#scrape_question_text using LeetCode GraphQL.
    """
    slug = link.rstrip("/").split("/")[-1]
    url = "https://leetcode.com/graphql"
    query = """
    query getQuestion($slug: String!) {
      question(titleSlug: $slug) {
        content
      }
    }
    """
    payload = {"query": query, "variables": {"slug": slug}}

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json",
                },
            )
            resp.raise_for_status()
    except httpx.HTTPError:
        return "Please paste the question text here."

    data = resp.json()
    html = (
        data.get("data", {})
        .get("question", {})
        .get("content")
    )
    if not html:
        return "Please paste the question text here."

    text = BeautifulSoup(html, "html.parser").get_text().strip()
    return text[:1500]


async def generate_chat_reply(
    question_id: str,
    message: Optional[str],
    question_text: Optional[str],
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Dict[str, Any]:
    """
    Port of ChatsController#create using Groq's chat completions API.
    """
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set in environment variables")

    if db is None:
        db = get_database()

    q_doc = await db["questions"].find_one({"_id": ObjectId(question_id)})
    if not q_doc:
        raise ValueError("Question not found")

    if not question_text:
        question_text = await scrape_question_text(q_doc["link"])

    system_msg = (
        "You are an expert LeetCode tutor and competitive programming coach. "
        "Be precise, logical, structured, and helpful — especially for debugging."
    )

    user_msg_combined = f"""
LeetCode Question Title:
{q_doc.get('title')}

LeetCode Problem Description:
{question_text}

Student Input:
{message or ''}

Please:
- Detect logical/syntax issues in code
- Provide a correct code if needed
- Explain the solution with time and space complexity
- If a more optimal solution exists, provide that too
- Walk through the solution step by step with an example
- Explain time and space complexity
- Include brief conceptual insights if useful
"""

    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg_combined},
        ],
        "temperature": 0.5,
        "max_tokens": 3072,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            settings.groq_api_url,
            headers=headers,
            content=json.dumps(body),
        )

    if resp.status_code != 200:
        raise RuntimeError(f"AI service unavailable: {resp.status_code}")

    data = resp.json()
    reply_text = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content")
        or "No reply found"
    )

    usage_headers = {
        "request_limit": resp.headers.get("x-ratelimit-limit-requests"),
        "requests_left": resp.headers.get("x-ratelimit-remaining-requests"),
        "token_limit": resp.headers.get("x-ratelimit-limit-tokens"),
        "tokens_left": resp.headers.get("x-ratelimit-remaining-tokens"),
    }

    return {"reply": reply_text, "usage": usage_headers}


