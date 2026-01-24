# URL Slug Migration Guide

## Overview

This guide documents the migration from ID-based URLs to human-readable slug-based URLs for both companies and questions.

## Changes Made

### Before
- Companies: `/companies/69271a5b4a856b4d1cb47be1`
- Questions: `/questions/507f1f77bcf86cd799439011`

### After
- Companies: `/companies/amazon`
- Questions: `/questions/two-sum`

## Backend Changes

### 1. Company Slugs

**Files Modified:**
- `fastapi_backend/app/models/company.py` - Added `slug` field
- `fastapi_backend/app/routers/companies.py` - Updated all endpoints to accept company identifier (ID, slug, or name)
- `fastapi_backend/app/routers/questions.py` - Updated company routes to use identifiers
- `fastapi_backend/app/main.py` - Updated `.json` aliases

**Key Functions:**
```python
def slugify(text: str) -> str:
    """Convert company name to URL-friendly slug"""
    return text.lower().replace(" ", "-").replace(".", "").replace(",", "")

async def find_company_by_identifier(db, identifier: str):
    """Find company by ID, slug, or name"""
    # Tries: ObjectId -> slug -> name (case-insensitive) -> slugified name
```

**Endpoints Updated:**
- `GET /companies/{company_identifier}` - Get company by ID, slug, or name
- `POST /companies/{company_identifier}/refresh` - Refresh company questions
- `GET /companies/{company_identifier}/topics` - Get company topics
- `GET /companies/{company_identifier}/questions` - List company questions
- `GET /companies/{company_identifier}/questions.json` - List questions (JSON alias)
- `GET /companies/{company_identifier}/questions/random` - Random question
- `GET /companies/{company_identifier}/questions/random.json` - Random question (JSON alias)

### 2. Question Slugs

**Files Modified:**
- `fastapi_backend/app/models/question.py` - Updated `titleSlug` field documentation
- `fastapi_backend/app/routers/questions_standalone.py` - Updated all endpoints to accept question identifier

**Key Functions:**
```python
def slugify_question_title(title: str) -> str:
    """Convert question title to URL-friendly slug"""
    import re
    slug = re.sub(r'[^\w\s-]', '', title.lower())
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug.strip('-')

async def find_question_by_identifier(db, identifier: str):
    """Find question by ID, titleSlug, or title"""
    # Tries: ObjectId -> titleSlug -> slugified title
```

**Endpoints Updated:**
- `GET /questions/{question_identifier}` - Get question by ID, titleSlug, or title
- `POST /questions/{question_identifier}/solve` - Mark question as solved
- `POST /questions/{question_identifier}/solve.json` - Mark solved (JSON alias)
- `DELETE /questions/{question_identifier}/solve` - Mark question as unsolved
- `DELETE /questions/{question_identifier}/solve.json` - Mark unsolved (JSON alias)

## Frontend Changes

### 1. Utility Functions

**New File:** `leetcode-tracker-frontend/src/utils/slugify.js`

```javascript
// Helper functions for creating URL-friendly slugs
export function slugifyCompany(name)
export function slugifyQuestion(title)
export function getCompanyIdentifier(company)  // Prefers slug, falls back to slugified name or ID
export function getQuestionIdentifier(question) // Prefers titleSlug, falls back to slugified title or ID
```

### 2. Files Updated

**Company Navigation:**
- `leetcode-tracker-frontend/src/pages/CompanyList.jsx` - Uses `getCompanyIdentifier()`
- `leetcode-tracker-frontend/src/pages/Dashboard.jsx` - Uses `getCompanyIdentifier()`
- `leetcode-tracker-frontend/src/components/layout/Sidebar.jsx` - Uses `getCompanyIdentifier()`

**Question Navigation:**
- `leetcode-tracker-frontend/src/pages/FocusMode.jsx` - Uses `getQuestionIdentifier()`
- `leetcode-tracker-frontend/src/pages/QuestionList.jsx` - Uses `getQuestionIdentifier()`
- `leetcode-tracker-frontend/src/components/question/SmartRandomButton.jsx` - Uses `getQuestionIdentifier()`
- `leetcode-tracker-frontend/src/components/tutor/TutorSessionHistory.jsx` - Uses `getQuestionIdentifier()`

## Migration Scripts

### 1. Add Company Slugs

**Script:** `fastapi_backend/scripts/add_company_slugs.py`

```bash
cd fastapi_backend
python scripts/add_company_slugs.py
```

This script:
- Finds all companies in MongoDB
- Generates slugs from company names
- Updates companies that don't have slugs
- Skips companies that already have slugs

### 2. Add Question Slugs

**Script:** `fastapi_backend/scripts/add_question_slugs.py`

```bash
cd fastapi_backend
python scripts/add_question_slugs.py
```

This script:
- Finds all questions in MongoDB
- Generates titleSlugs from question titles
- Updates questions that don't have titleSlugs
- Skips questions that already have titleSlugs

## Backward Compatibility

Both the backend and frontend maintain **full backward compatibility**:

### Backend
- All endpoints accept both old (ID) and new (slug) formats
- Lookup order: ID → slug → name (for companies) or title (for questions)
- No breaking changes to existing API contracts

### Frontend
- Helper functions gracefully fall back to IDs if slugs aren't available
- Works with both old and new data formats
- No changes required to existing API calls

## Testing

### Manual Testing

1. **Test Company URLs:**
   ```
   # Old format (still works)
   http://localhost:5173/companies/69271a5b4a856b4d1cb47be1
   
   # New format
   http://localhost:5173/companies/amazon
   ```

2. **Test Question URLs:**
   ```
   # Old format (still works)
   http://localhost:5173/focus/507f1f77bcf86cd799439011
   
   # New format
   http://localhost:5173/focus/two-sum
   ```

3. **Test API Endpoints:**
   ```bash
   # Company by slug
   curl http://localhost:8000/api/companies/amazon
   
   # Company by ID (still works)
   curl http://localhost:8000/api/companies/69271a5b4a856b4d1cb47be1
   
   # Question by slug
   curl http://localhost:8000/api/questions/two-sum
   
   # Question by ID (still works)
   curl http://localhost:8000/api/questions/507f1f77bcf86cd799439011
   ```

## Deployment Steps

1. **Deploy Backend Changes:**
   ```bash
   # Backend is backward compatible, deploy first
   cd fastapi_backend
   # Deploy your backend
   ```

2. **Run Migration Scripts:**
   ```bash
   # Add slugs to existing data
   python scripts/add_company_slugs.py
   python scripts/add_question_slugs.py
   ```

3. **Deploy Frontend Changes:**
   ```bash
   # Frontend will use slugs when available, IDs as fallback
   cd leetcode-tracker-frontend
   npm run build
   # Deploy your frontend
   ```

4. **Verify:**
   - Check that old URLs still work
   - Check that new slug URLs work
   - Verify navigation uses slugs

## Benefits

### 1. SEO Improvements
- Search engines prefer descriptive URLs
- Better indexing and ranking
- More meaningful search results

### 2. User Experience
- URLs are readable and memorable
- Users can guess URLs
- Easier to share and bookmark

### 3. Analytics
- Better tracking of popular companies/questions
- More meaningful URL reports
- Easier to identify traffic patterns

### 4. Developer Experience
- Easier debugging (can see what page you're on from URL)
- More intuitive API testing
- Better logs and error messages

## Edge Cases Handled

1. **Duplicate Slugs:** Unlikely for companies, but handled by falling back to ID
2. **Special Characters:** Removed from slugs (e.g., "C++" becomes "c")
3. **Spaces:** Converted to hyphens (e.g., "Two Sum" becomes "two-sum")
4. **Case Sensitivity:** All slugs are lowercase
5. **Missing Slugs:** Graceful fallback to ID-based URLs
6. **Legacy Data:** Old IDs continue to work indefinitely

## Future Enhancements

1. **Unique Slug Enforcement:** Add database index to ensure slug uniqueness
2. **Slug History:** Track slug changes for redirects
3. **Custom Slugs:** Allow admins to set custom slugs
4. **Slug Validation:** Prevent reserved words and invalid characters
5. **Automatic Redirects:** Redirect old ID URLs to new slug URLs (301)

## Rollback Plan

If issues arise:

1. **Frontend Only:** Revert frontend to use IDs
   - Change helper functions to always return IDs
   - No backend changes needed

2. **Full Rollback:** Revert both frontend and backend
   - Backend still accepts IDs
   - Remove slug lookups from endpoints
   - Frontend uses IDs exclusively

## Support

For issues or questions:
1. Check backend logs for `[DEBUG]` messages
2. Verify migration scripts ran successfully
3. Test with both ID and slug formats
4. Check browser console for frontend errors
