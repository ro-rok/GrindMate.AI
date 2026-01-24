import csv
import urllib.parse
import re
from datetime import datetime

import httpx
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..db import get_database


RAW_BASE = "https://raw.githubusercontent.com/liquidslr/leetcode-company-wise-problems/main"

FILE_MAP = {
    "30_days": "1. Thirty Days.csv",
    "60_days": "2. Three Months.csv",
    "90_days": "3. Six Months.csv",
    "more_than_six_months": "4. More Than Six Months.csv",
    "all_time": "5. All.csv",
}


def slugify_question_title(title: str) -> str:
    """Convert question title to URL-friendly slug"""
    # Remove special characters and convert to lowercase
    slug = re.sub(r'[^\w\s-]', '', title.lower())
    # Replace spaces with hyphens
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug.strip('-')


async def refresh_company_questions(company_id: str):
    """
    Port of GithubCsvImporter.refresh_company! for a single company.
    Uses MongoDB only - no SQL dependencies.
    
    This function:
    1. Fetches CSV files from GitHub for each timeframe
    2. Updates existing questions or inserts new ones
    3. Does NOT delete any questions - only marks them as removed if they're no longer in CSV
    4. Preserves user progress and solve history
    """
    db: AsyncIOMotorDatabase = get_database()
    company = await db["companies"].find_one({"_id": ObjectId(company_id)})
    if not company:
        print(f"[Importer] ⚠️  Company {company_id} not found")
        return

    company_name = company.get("name", "")
    print(f"[Importer] 🚀 Starting import for {company_name}")

    # Track all question links found in this import (per timeframe)
    # Key: timeframe, Value: set of links
    new_links_by_timeframe: dict[str, set[str]] = {}
    now = datetime.utcnow()

    async with httpx.AsyncClient(timeout=60.0) as client:
        for timeframe, fname in FILE_MAP.items():
            folder = urllib.parse.quote(company_name, safe="")
            file_name = urllib.parse.quote(fname, safe="")
            url = f"{RAW_BASE}/{folder}/{file_name}"
            print(f"[Importer] 📥 Fetching {timeframe} → {url}")

            new_links_by_timeframe[timeframe] = set()

            try:
                resp = await client.get(url, timeout=60.0)
                if resp.status_code == 404:
                    print(f"[Importer] ⚠️  {fname} not found (HTTP 404)")
                    continue
                resp.raise_for_status()
            except httpx.HTTPError as e:
                print(f"[Importer] ⚠️  Error fetching {fname}: {e}")
                continue
            except Exception as e:
                print(f"[Importer] ⚠️  Unexpected error fetching {fname}: {e}")
                continue

            csv_text = resp.text
            reader = csv.DictReader(csv_text.splitlines())
            
            for row in reader:
                title = row.get("Title", "").strip()
                link = row.get("Link", "").strip()
                if not link:
                    continue
                
                new_links_by_timeframe[timeframe].add(link)
                print(f"[Importer]   ➡️  Row: {title}")

                # Check if question already exists for this company and timeframe
                existing = await db["questions"].find_one(
                    {
                        "link": link,
                        "company_id": company["_id"],
                        "timeframe": timeframe
                    }
                )

                # Handle frequency - can be int or float string
                frequency_str = row.get("Frequency", "0").strip()
                try:
                    frequency = int(float(frequency_str)) if frequency_str else 0
                except (ValueError, TypeError):
                    frequency = 0
                
                # Handle acceptance rate
                acceptance_rate_str = row.get("Acceptance Rate", "0").strip()
                try:
                    acceptance_rate = float(acceptance_rate_str) if acceptance_rate_str else 0.0
                except (ValueError, TypeError):
                    acceptance_rate = 0.0
                
                # Generate titleSlug from title
                title_slug = slugify_question_title(title) if title else None
                
                update_doc = {
                    "title": title,
                    "link": link,
                    "difficulty": row.get("Difficulty", "").strip(),
                    "frequency": frequency,
                    "acceptance_rate": acceptance_rate,
                    "topics": row.get("Topics", "").strip(),
                    "company_id": company["_id"],
                    "timeframe": timeframe,
                    "source": "github_csv",
                    "updated_at": now,
                }
                
                # Add titleSlug if generated
                if title_slug:
                    update_doc["titleSlug"] = title_slug

                if existing:
                    # Update existing question
                    # Preserve legacy_id and company_legacy_id if they exist
                    if "legacy_id" in existing:
                        update_doc["legacy_id"] = existing["legacy_id"]
                    if "company_legacy_id" in existing:
                        update_doc["company_legacy_id"] = existing["company_legacy_id"]
                    
                    # Clear removed flag if it was previously marked as removed
                    if existing.get("metadata", {}).get("removed_on"):
                        update_doc["metadata"] = {
                            k: v for k, v in existing.get("metadata", {}).items()
                            if k != "removed_on"
                        }
                    
                    await db["questions"].update_one(
                        {"_id": existing["_id"]},
                        {"$set": update_doc}
                    )
                    print(f"[Importer]      ✔️  Updated Q#{existing['_id']}")
                else:
                    # Insert new question
                    if "legacy_id" in company:
                        update_doc["company_legacy_id"] = company["legacy_id"]
                    update_doc["created_at"] = now
                    result = await db["questions"].insert_one(update_doc)
                    print(f"[Importer]      ✔️  Saved Q#{result.inserted_id}")

    # Mark questions as removed if they're no longer in the CSV for their timeframe
    # This preserves the questions and user progress, just marks them as removed
    for timeframe, new_links in new_links_by_timeframe.items():
        if not new_links:
            continue
            
        # Get all existing questions for this company and timeframe
        existing_questions = db["questions"].find(
            {
                "company_id": company["_id"],
                "timeframe": timeframe
            }
        )
        
        async for q in existing_questions:
            link = q.get("link")
            if link and link not in new_links:
                # Question is no longer in CSV - mark as removed
                metadata = q.get("metadata") or {}
                if "removed_on" not in metadata:
                    metadata["removed_on"] = datetime.utcnow().date().isoformat()
                    await db["questions"].update_one(
                        {"_id": q["_id"]},
                        {"$set": {"metadata": metadata}},
                    )
                    print(f"[Importer]      🗑️  Marked removed: {q.get('title')} ({timeframe})")

    print(f"[Importer] ✅ Done importing for {company_name}")



