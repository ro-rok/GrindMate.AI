# FastAPI Backend for LeetCode Tracker

This is the FastAPI backend that replaces the Rails backend. It uses **MongoDB only** (no SQL databases).

## Features

- ✅ MongoDB-only data layer (uses `grindmate-db` database)
- ✅ User authentication with JWT cookies
- ✅ Companies and questions management
- ✅ CSV refresh from GitHub (background tasks)
- ✅ Chat integration with Groq API
- ✅ CORS configured for frontend (including Vercel deployment)

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Create `.env` file:**
   ```bash
   # MongoDB Configuration
   MONGODB_URI= 
   MONGODB_DB_NAME=grindmate-db

   # Security - Change this in production!
   SECRET_KEY=change-me-in-production-use-a-long-random-string

   # CORS - Comma-separated list of allowed frontend origins
   FRONTEND_ORIGINS=http://localhost:5173,http://localhost:3000,https://grindmate-ai.vercel.app

   # Backend URL (for CORS and redirects)
   BACKEND_BASE_URL=http://localhost:8000

   # Groq API for chat functionality
   GROQ_API_KEY=your-groq-api-key-here
   ```

3. **Run the server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

   Or for production:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

## API Endpoints

### Health Check
- `GET /health` - Check if MongoDB connection is working

### Ping
- `GET /ping` - Simple health check

### Authentication
- `POST /users` - Register new user
- `POST /users/sign_in` - Login (returns JWT in HttpOnly cookie)
- `DELETE /users/sign_out` - Logout
- `GET /users/current` - Get current user

### Users
- `POST /users/reset_progress` - Reset user's solved questions (optionally for a specific company)

### Companies
- `GET /companies` - List all companies
- `GET /companies/{id}` - Get company details (triggers CSV import if no questions)
- `POST /companies/{id}/refresh` - Manually trigger CSV refresh
- `GET /companies/{id}/topics` - Get unique topics for a company

### Questions
- `GET /companies/{company_id}/questions` - List questions with filters (timeframe, difficulty, topics)
- `GET /companies/{company_id}/questions/random` - Get random question
- `POST /companies/{company_id}/questions/{question_id}/solve` - Mark question as solved
- `DELETE /companies/{company_id}/questions/{question_id}/solve` - Mark question as unsolved

### Chat
- `POST /questions/{id}/chat` - Chat with AI about a question (requires GROQ_API_KEY)

## CSV Refresh Service

The CSV refresh service (`app/services/refresh_csv.py`) automatically imports questions from GitHub:
- Fetches CSV files from `https://raw.githubusercontent.com/liquidslr/leetcode-company-wise-problems/main`
- Supports multiple timeframes: 30_days, 60_days, 90_days, more_than_six_months, all_time
- Updates existing questions or creates new ones
- Marks removed questions in metadata

This runs automatically when:
- A company is accessed and has no questions
- `POST /companies/{id}/refresh` is called

## MongoDB Collections

The backend uses these MongoDB collections:
- `users` - User accounts
- `companies` - Company information
- `questions` - LeetCode questions
- `user_questions` - User's solved/unsolved questions tracking

All data is stored in MongoDB only - no SQL databases are used.

## Legacy ID Management

The existing MongoDB data includes `legacy_id` fields that were used during the SQLite → MongoDB migration. The FastAPI backend handles these as follows:

- **Existing records**: When updating existing records (questions, user_questions), the `legacy_id` fields are preserved if they exist
- **New records**: New records created by FastAPI (new questions from CSV, new users, new user_questions) do NOT get `legacy_id` fields since they're not from the SQLite migration
- **Optional fields**: All `legacy_id` fields are optional in the Pydantic models, so the code handles both cases gracefully

This means:
- ✅ Existing questions keep their `legacy_id` when refreshed from CSV
- ✅ New questions from CSV don't get `legacy_id` (not needed)
- ✅ New users don't get `legacy_id` (not needed)
- ✅ New `user_questions` inherit `user_legacy_id` and `question_legacy_id` from their related records if available

## Frontend Integration

Update your frontend `.env` to point to the FastAPI backend:
```bash
VITE_API_URL=http://localhost:8000
```

For production (Vercel), set:
```bash
VITE_API_URL=https://your-fastapi-backend-url
```

