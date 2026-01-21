#!/usr/bin/env python3
"""
Standalone script to create MongoDB indexes.

This script can be run independently to create all necessary indexes
without starting the full application.

Usage:
    python -m scripts.create_indexes
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db import get_database
from app.init_db import create_indexes, list_indexes


async def main():
    """Create all MongoDB indexes."""
    print("=" * 80)
    print("GrindMate.AI - MongoDB Index Creation")
    print("=" * 80)
    print()
    
    db = get_database()
    
    # Create indexes
    await create_indexes(db)
    
    print()
    print("=" * 80)
    print("Verifying indexes...")
    print("=" * 80)
    print()
    
    # List all indexes for verification
    indexes = await list_indexes(db)
    
    for collection_name, collection_indexes in indexes.items():
        print(f"\n📁 {collection_name}:")
        for index_name, index_info in collection_indexes.items():
            if index_name == "_id_":
                continue  # Skip default _id index
            
            keys = index_info.get("key", [])
            unique = " [UNIQUE]" if index_info.get("unique", False) else ""
            ttl = f" [TTL: {index_info.get('expireAfterSeconds')}s]" if "expireAfterSeconds" in index_info else ""
            text = " [TEXT]" if any(v == "text" for k, v in keys) else ""
            
            print(f"  • {index_name}{unique}{ttl}{text}")
            print(f"    Keys: {keys}")
    
    print()
    print("=" * 80)
    print("✅ Index creation complete!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
