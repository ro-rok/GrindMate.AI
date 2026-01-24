# Fix Company Name Issue

## Problem
The company page is showing the company ID (hash) instead of the company name because the company document in MongoDB is missing the `name` field.

## Solution Options

### Option 1: Using Python Script (Recommended)

Run the provided Python script to interactively add names to companies:

```bash
cd fastapi_backend
python fix_company_names.py
```

The script will:
1. List all companies in your database
2. Show which ones are missing names
3. Prompt you to enter a name for each company

### Option 2: Using MongoDB Shell

If you know the company ID and name, you can update it directly:

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/leetcode_tracker

# Update a specific company (replace the ID and name)
db.companies.updateOne(
  { _id: ObjectId("69271a5b4a856b4d1cb47be1") },
  { $set: { name: "Google" } }
)
```

### Option 3: Update All Companies at Once

If you have multiple companies and know their names:

```javascript
// In MongoDB shell
db.companies.updateOne(
  { _id: ObjectId("69271a5b4a856b4d1cb47be1") },
  { $set: { name: "Google" } }
);

db.companies.updateOne(
  { _id: ObjectId("ANOTHER_ID_HERE") },
  { $set: { name: "Amazon" } }
);

// Add more as needed...
```

### Option 4: Check Current Company Data

To see what data your company currently has:

```bash
mongosh mongodb://localhost:27017/leetcode_tracker

# View all companies
db.companies.find().pretty()

# View specific company
db.companies.findOne({ _id: ObjectId("69271a5b4a856b4d1cb47be1") })
```

## After Fixing

Once you've added the `name` field to your company document:

1. Refresh the page in your browser
2. The company name should now appear instead of the ID
3. The warning message (if visible) should disappear

## Prevention

When creating new companies in the future, always include the `name` field:

```javascript
db.companies.insertOne({
  name: "Company Name",
  legacy_id: 123  // optional
})
```
