# Migration Steps - Adding Slugs to URLs

## Prerequisites

Make sure MongoDB is running before running the migration scripts.

### Start MongoDB

**Windows:**
```powershell
# If MongoDB is installed as a service
net start MongoDB

# Or start manually
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath="C:\data\db"
```

**Mac/Linux:**
```bash
# If MongoDB is installed as a service
sudo systemctl start mongod

# Or start manually
mongod --dbpath=/data/db
```

**Docker:**
```bash
docker start mongodb
# Or if not created yet:
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Step 1: Run Company Slug Migration

This adds slugs to all existing companies in your database.

```bash
cd fastapi_backend
python scripts/add_company_slugs.py
```

**Expected Output:**
```
============================================================
Company Slug Migration
============================================================

Found 5 companies

Adding slugs...
  ✅ Google: Added slug 'google'
  ✅ Amazon: Added slug 'amazon'
  ✅ Microsoft: Added slug 'microsoft'
  ✅ Meta: Added slug 'meta'
  ✅ Apple: Added slug 'apple'

✅ Migration complete!
   Updated: 5
   Skipped: 0
   Total: 5
```

## Step 2: Run Question Slug Migration

This adds titleSlugs to all existing questions in your database.

```bash
cd fastapi_backend
python scripts/add_question_slugs.py
```

**Expected Output:**
```
============================================================
Question TitleSlug Migration
============================================================

Found 1250 questions

Adding titleSlugs...
  ✅ Two Sum: Added titleSlug 'two-sum'
  ✅ Add Two Numbers: Added titleSlug 'add-two-numbers'
  ✅ Longest Substring Without Repeating Characters: Added titleSlug 'longest-substring-without-repeating-characters'
  ... and 1247 more

✅ Migration complete!
   Updated: 1250
   Skipped: 0
   Total: 1250
```

## Step 3: Verify the Changes

### Check in MongoDB

```bash
mongosh

use leetcode_tracker

# Check companies have slugs
db.companies.find({}, {name: 1, slug: 1})

# Check questions have titleSlugs
db.questions.find({}, {title: 1, titleSlug: 1}).limit(5)
```

### Test the URLs

1. **Start the backend:**
   ```bash
   cd fastapi_backend
   uvicorn app.main:app --reload
   ```

2. **Start the frontend:**
   ```bash
   cd leetcode-tracker-frontend
   npm run dev
   ```

3. **Test company URLs:**
   - Old format (still works): `http://localhost:5173/companies/69271a5b4a856b4d1cb47be1`
   - New format: `http://localhost:5173/companies/amazon`

4. **Test question URLs:**
   - Old format (still works): `http://localhost:5173/focus/507f1f77bcf86cd799439011`
   - New format: `http://localhost:5173/focus/two-sum`

## Automatic Slug Generation

After running the migrations, slugs will be automatically generated for:

### New Questions
- **CSV Import:** When you click "Populate" on a company page, slugs are automatically generated
- **GraphQL Import:** When importing via Admin Portal, titleSlugs from LeetCode are used

### New Companies
Companies created in the future will need slugs added manually or via the migration script.

## Troubleshooting

### MongoDB Connection Error

**Error:**
```
pymongo.errors.ServerSelectionTimeoutError: localhost:27017: [WinError 10061] No connection could be made
```

**Solution:**
1. Make sure MongoDB is running (see "Start MongoDB" above)
2. Check MongoDB is listening on port 27017:
   ```bash
   netstat -an | findstr 27017  # Windows
   netstat -an | grep 27017     # Mac/Linux
   ```
3. Verify connection string in `.env`:
   ```
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=leetcode_tracker
   ```

### Slugs Not Showing in URLs

**Check:**
1. Did you run both migration scripts?
2. Did you restart the backend after running migrations?
3. Check browser console for errors
4. Verify slugs exist in database (see "Check in MongoDB" above)

### Duplicate Slug Errors

If you see errors about duplicate slugs:
1. This is rare but can happen with similar company/question names
2. The system will fall back to using IDs
3. You can manually update slugs in MongoDB to make them unique

## Rollback

If you need to rollback the changes:

### Remove Slugs from Database

```bash
mongosh

use leetcode_tracker

# Remove company slugs
db.companies.updateMany({}, {$unset: {slug: ""}})

# Remove question titleSlugs (only if they were added by migration)
# Be careful - GraphQL imports use titleSlug from LeetCode
db.questions.updateMany(
  {source: "github_csv"},
  {$unset: {titleSlug: ""}}
)
```

### Revert Code Changes

```bash
git checkout main  # or your previous branch
```

## Next Steps

After successful migration:
1. ✅ URLs are now human-readable
2. ✅ Old ID-based URLs still work (backward compatible)
3. ✅ New questions will automatically get slugs
4. ✅ Better SEO and user experience

You can now share URLs like:
- `https://yoursite.com/companies/google`
- `https://yoursite.com/focus/two-sum`

Instead of:
- `https://yoursite.com/companies/69271a5b4a856b4d1cb47be1`
- `https://yoursite.com/focus/507f1f77bcf86cd799439011`
