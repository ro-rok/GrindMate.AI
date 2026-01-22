# Company GraphQL Import Guide

## Overview

The Company GraphQL Import feature allows you to import LeetCode questions for specific companies using GraphQL data instead of CSV files. It works exactly like the "Populate" button but gives you more control and flexibility.

## Key Features

✅ **Includes ALL questions** - SOLVED, TO_DO, and ATTEMPTED (configurable)
✅ **Company-specific** - Associates questions with a company and timeframe
✅ **Stores frequency** - Preserves frequency data from GraphQL
✅ **Stores topics** - Converts topic array to comma-separated string
✅ **Upserts questions** - Updates existing, creates new
✅ **Preserves progress** - Doesn't delete questions or user data

## How It Works

### 1. Data Flow

```
GraphQL Dump → Parser → Normalizer → Filter (optional) → Database
```

### 2. Database Storage

Questions are stored with:
- `company_id`: ObjectId of the company
- `timeframe`: One of: `30_days`, `60_days`, `90_days`, `more_than_six_months`, `all_time`
- `source`: `"graphql_import"`
- `topics`: Comma-separated string (e.g., "Array, Hash Table, String")
- `frequency`: Integer value from GraphQL
- `acceptance_rate`: Float value (acRate from GraphQL)
- `status`: SOLVED, TO_DO, or ATTEMPTED
- All other standard question fields

### 3. Comparison with CSV Import

| Feature | CSV Import (Populate) | GraphQL Import |
|---------|----------------------|----------------|
| Data Source | GitHub CSV files | LeetCode GraphQL API |
| Trigger | Automatic/Manual button | Manual admin import |
| Topics Format | Comma-separated string | Comma-separated string |
| Frequency | From CSV | From GraphQL |
| Status | Not included | SOLVED/TO_DO/ATTEMPTED |
| Source | `"github_csv"` | `"graphql_import"` |

## API Endpoints

### Preview Import

**POST** `/api/admin/import/graphql-dump/company-preview`

Preview import without making database changes.

**Request:**
```json
{
  "raw": "{\"data\": {\"favoriteQuestionList\": {...}}}",
  "company_id": "507f1f77bcf86cd799439011",
  "timeframe": "30_days",
  "exclude_solved": false
}
```

**Response:**
```json
{
  "counts": {
    "total": 119,
    "valid": 119,
    "invalid": 0,
    "would_create": 50,
    "would_update": 69,
    "would_skip": 0,
    "filtered_solved": 0
  },
  "duplicates": [],
  "sample": [...],
  "errors": []
}
```

### Commit Import

**POST** `/api/admin/import/graphql-dump/company-commit`

Commit import and update database.

**Request:** Same as preview

**Response:**
```json
{
  "counts": {
    "total": 119,
    "created": 50,
    "updated": 69,
    "skipped": 0,
    "invalid": 0,
    "filtered_solved": 0
  },
  "import_id": "507f1f77bcf86cd799439012",
  "errors": []
}
```

## Usage Instructions

### From Admin Portal

1. Open Admin Portal (CTRL+SHIFT+A)
2. Click "Company Import" tab
3. Select company from dropdown
4. Select timeframe (30 Days, 3 Months, etc.)
5. (Optional) Check "Exclude SOLVED questions" if you only want unsolved
6. Paste GraphQL dump in textarea
7. Click "Preview Import" to see what will happen
8. Review the preview (counts, sample questions, errors)
9. Click "Apply Import" to commit changes

### Getting GraphQL Data

1. Open LeetCode and navigate to your favorites or company questions
2. Open Browser DevTools (F12)
3. Go to Network tab
4. Find the GraphQL request
5. Click Response tab
6. Copy the raw JSON response
7. Paste into the textarea

**Tip:** Use `copy(JSON.stringify(data))` in the console for clean JSON.

## Timeframe Options

- `30_days` - Questions from last 30 days
- `60_days` - Questions from last 3 months
- `90_days` - Questions from last 6 months
- `more_than_six_months` - Questions older than 6 months
- `all_time` - All questions ever

## Filtering Options

### Include All Questions (Default)

```json
{
  "exclude_solved": false
}
```

This includes:
- ✅ SOLVED questions
- ✅ TO_DO questions
- ✅ ATTEMPTED questions

### Exclude Solved Questions

```json
{
  "exclude_solved": true
}
```

This includes:
- ❌ SOLVED questions (filtered out)
- ✅ TO_DO questions
- ✅ ATTEMPTED questions

## Data Mapping

### GraphQL → Database

| GraphQL Field | Database Field | Type | Notes |
|---------------|----------------|------|-------|
| `title` | `title` | String | Question title |
| `titleSlug` | `titleSlug` | String | URL slug |
| `questionFrontendId` | `questionFrontendId` | String | Display ID (e.g., "1") |
| `link` | `link` | String | Full LeetCode URL |
| `difficulty` | `difficulty` | String | EASY/MEDIUM/HARD |
| `paidOnly` | `paidOnly` | Boolean | Premium question |
| `status` | `status` | String | SOLVED/TO_DO/ATTEMPTED |
| `frequency` | `frequency` | Integer | Frequency value |
| `acRate` | `acceptance_rate` | Float | Acceptance rate (0-1) |
| `topicTags[].name` | `topics` | String | Comma-separated |

### Topics Conversion

**GraphQL:**
```json
{
  "topicTags": [
    {"name": "Array", "slug": "array"},
    {"name": "Hash Table", "slug": "hash-table"}
  ]
}
```

**Database:**
```json
{
  "topics": "Array, Hash Table"
}
```

## Audit Logging

All import operations are logged:

- `company_import_preview` - Preview operation
- `company_import_commit` - Commit operation
- `company_import_preview_error` - Preview error
- `company_import_commit_error` - Commit error

Logs include:
- Actor (user_id and email)
- Company ID and name
- Timeframe
- Counts (created, updated, etc.)
- Timestamp
- IP address and user agent

## Import Batch Tracking

Each commit creates an import batch record:

```json
{
  "type": "company_graphql",
  "company_id": ObjectId("..."),
  "timeframe": "30_days",
  "exclude_solved": false,
  "created_at": "2025-01-22T...",
  "actor": "user_id",
  "actor_email": "admin@example.com",
  "payload_hash": "sha256...",
  "counts": {...},
  "question_refs": [ObjectId("..."), ...],
  "errors": []
}
```

## Rate Limiting

- **10 requests per hour** per admin user
- Applies to both preview and commit operations
- Shared with regular GraphQL import endpoints

## Error Handling

### Parsing Errors (400)

```json
{
  "error": "Could not parse input",
  "hint": "Paste the raw response JSON from the Network tab"
}
```

### Validation Errors (400)

```json
{
  "error": "Invalid company_id"
}
```

### Not Found (404)

```json
{
  "error": "Company not found"
}
```

### Rate Limit (429)

```json
{
  "error": "Rate limit exceeded. Maximum 10 import requests per hour."
}
```

## Best Practices

1. **Always preview first** - Check counts and sample questions before committing
2. **Use clean JSON** - Use `JSON.stringify()` to get clean JSON from browser
3. **Check for duplicates** - Review duplicate warnings in preview
4. **Review errors** - Fix validation errors before committing
5. **Monitor frequency** - Ensure frequency values are being captured
6. **Verify topics** - Check that topics are being stored correctly

## Troubleshooting

### "Could not parse input"

- Make sure you're copying raw JSON, not formatted text
- Use `JSON.stringify(data)` in browser console
- Check that JSON is complete (not truncated)

### "Company not found"

- Verify company exists in database
- Check company_id is valid ObjectId format

### "Invalid timeframe"

- Must be one of: `30_days`, `60_days`, `90_days`, `more_than_six_months`, `all_time`

### Questions not showing up

- Check if they were filtered out (exclude_solved=true)
- Verify company_id and timeframe match your query
- Check audit logs for errors

### Frequency not stored

- Verify GraphQL response includes `frequency` field
- Check normalizer is extracting frequency correctly
- Review sample questions in preview

## Examples

### Import All Questions for Google (30 Days)

```bash
curl -X POST http://localhost:8000/api/admin/import/graphql-dump/company-commit \
  -H "Content-Type: application/json" \
  -d '{
    "raw": "{\"data\": {...}}",
    "company_id": "507f1f77bcf86cd799439011",
    "timeframe": "30_days",
    "exclude_solved": false
  }'
```

### Import Only Unsolved Questions

```bash
curl -X POST http://localhost:8000/api/admin/import/graphql-dump/company-commit \
  -H "Content-Type: application/json" \
  -d '{
    "raw": "{\"data\": {...}}",
    "company_id": "507f1f77bcf86cd799439011",
    "timeframe": "30_days",
    "exclude_solved": true
  }'
```

## Support

For issues or questions:
1. Check backend logs for `[DEBUG]` messages
2. Review audit logs in admin portal
3. Verify GraphQL data format matches expected structure
4. Check GRAPHQL_IMPORT_GUIDE.md for general import help
