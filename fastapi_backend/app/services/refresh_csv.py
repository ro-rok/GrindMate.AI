import csv
import urllib.parse
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


async def refresh_company_questions(company_id: str):
    """
    Port of GithubCsvImporter.refresh_company! for a single company.
    Uses MongoDB only - no SQL dependencies.
    """
    db: AsyncIOMotorDatabase = get_database()
    company = await db["companies"].find_one({"_id": ObjectId(company_id)})
    if not company:
        print(f"[Importer] ⚠️  Company {company_id} not found")
        return

    company_name = company.get("name", "")
    print(f"[Importer] 🚀 Starting import for {company_name}")

    # Get all existing question links for this company
    old_links = [
        doc["link"]
        async for doc in db["questions"].find(
            {"company_id": company["_id"]}, {"link": 1}
        )
    ]
    new_links: list[str] = []
    now = datetime.utcnow()

    async with httpx.AsyncClient(timeout=60.0) as client:
        for timeframe, fname in FILE_MAP.items():
            folder = urllib.parse.quote(company_name, safe="")
            file_name = urllib.parse.quote(fname, safe="")
            url = f"{RAW_BASE}/{folder}/{file_name}"
            print(f"[Importer] 📥 Fetching {timeframe} → {url}")

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
                
                new_links.append(link)
                print(f"[Importer]   ➡️  Row: {title}")

                # Check if question already exists
                existing = await db["questions"].find_one(
                    {
                        "link": link,
                        "company_id": company["_id"],
                        "timeframe": timeframe
                    }
                )

                update_doc = {
                    "title": title,
                    "link": link,
                    "difficulty": row.get("Difficulty", "").strip(),
                    "frequency": int(row.get("Frequency") or 0),
                    "acceptance_rate": float(row.get("Acceptance Rate") or 0.0),
                    "topics": row.get("Topics", "").strip(),
                    "company_id": company["_id"],
                    "timeframe": timeframe,
                    "updated_at": now,
                }

                if existing:
                    # Update existing question - preserve legacy_id and company_legacy_id if they exist
                    # Don't overwrite legacy fields that were set during SQLite migration
                    update_doc["updated_at"] = now
                    # Preserve legacy_id if it exists
                    if "legacy_id" in existing:
                        update_doc["legacy_id"] = existing["legacy_id"]
                    # Preserve company_legacy_id if it exists
                    if "company_legacy_id" in existing:
                        update_doc["company_legacy_id"] = existing["company_legacy_id"]
                    
                    await db["questions"].update_one(
                        {"_id": existing["_id"]},
                        {"$set": update_doc}
                    )
                    print(f"[Importer]      ✔️  Updated Q#{existing['_id']}")
                else:
                    # Insert new question - no legacy_id needed (not from SQLite migration)
                    # But preserve company_legacy_id if company has it
                    if "legacy_id" in company:
                        update_doc["company_legacy_id"] = company["legacy_id"]
                    update_doc["created_at"] = now
                    result = await db["questions"].insert_one(update_doc)
                    print(f"[Importer]      ✔️  Saved Q#{result.inserted_id}")

    # Mark removed questions (questions that were in old_links but not in new_links)
    removed = set(old_links) - set(new_links)
    if removed:
        print(f"[Importer] 🗑️  Marking {len(removed)} removed questions")
        for link in removed:
            q = await db["questions"].find_one(
                {"company_id": company["_id"], "link": link}
            )
            if q:
                metadata = q.get("metadata") or {}
                if "removed_on" not in metadata:
                    metadata["removed_on"] = datetime.utcnow().date().isoformat()
                await db["questions"].update_one(
                    {"_id": q["_id"]},
                    {"$set": {"metadata": metadata}},
                )
                print(f"[Importer]      🗑️  Marked removed {link}")

    print(f"[Importer] ✅ Done importing for {company_name}")


