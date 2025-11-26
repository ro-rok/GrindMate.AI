# GrindMate.AI

<!-- Center the logo -->
<img src="./leetcode-tracker-frontend/public/logo-bg.webp" alt="GrindMate.AI Logo" class="logo"/>

> **GrindMate.AI** is your AI-powered LeetCode study companion—filter and practice company-specific questions, track progress, and get instant AI help on any problem.

---

## 🚀 Features

- **Company & Timeframe Filters**  
    *Drill into the exact company and timeframe (30 days / 3 months / 6 months / all time)*  
- **Progress Tracking**  
    *Mark questions solved/unsolved and revisit your hard ones*  
- **AI-Powered Chat**  
    *Ask our integrated AI tutor for hints, code reviews, and full walkthroughs*  
- **Random Practice**  
    *Grab a random unsolved question for surprise drills*  
- **One-Click Populate**  
    *Import curated LeetCode data in bulk*

---

## 🏗️ Tech Stack

```yaml
backend:
    language: Ruby on Rails (API-only)
    auth: Devise (cookie-based sessions)
    AI: GROQ Llama3 via Faraday + HTTPX
    scraping: Nokogiri + LeetCode GraphQL
    CORS: rack-cors

frontend:
    framework: React 18 + Vite
    styling: Tailwind CSS + Styled-Components
    state: React Hooks
    animation: GSAP
    CI/CD: GitHub Actions → Heroku / Vercel
```

### 📦 Installation

**Backend**

```bash
git clone https://github.com/your-org/grindmate-backend.git
cd grindmate-backend
bundle install
bundle exec rails mongoid:create_indexes
# set GROQ_API_KEY + MONGODB_URI in .env
rails s -p 3000
```

**Frontend**

```bash
cd leetcode-tracker-frontend
npm install
# set VITE_API_URL=http://localhost:3000 in .env
npm run dev
```

## 💡 Usage

- Sign Up / Log In  
- Populate your first company’s questions  
- Select a company and timeframe tab  
- Solve or Unsolve questions; track status  
- Ask AI for hints or full solutions via the chat icon  
- Grab a random practice card for extra drills  

## 📣 Thanks & Credits

Huge thanks to @liquidslr for the original company-wise LeetCode dataset and inspiration!

## 🧪 Testing

- Backend: `bin/rails test`
- Frontend: `npm test`

## 🗄️ Migrating SQL data to MongoDB

The API now persists everything in MongoDB via Mongoid. To copy your
existing PostgreSQL (or SQLite) data into Mongo, install the optional
`data_migration` bundle group and run:

```bash
# install optional dependencies if needed
BUNDLE_WITH=data_migration bundle install

# dry-run the transfer first
SQL_MIGRATION_URL=postgres://user:pass@localhost:5432/leetcode_tracker \
DRY_RUN=true \
bin/rails data:migrate_sql_to_mongo

# actual import
SQL_MIGRATION_URL=postgres://user:pass@localhost:5432/leetcode_tracker \
bin/rails data:migrate_sql_to_mongo
```

`SQL_MIGRATION_URL` (or `DATABASE_URL`) must point at your legacy SQL
database. Set `DRY_RUN=true` to verify what would be imported without
writing to Mongo.

## 🔧 Deployment

- Heroku (Rails API)  
- Vercel (React front-end)  

## 🎉 License

MIT © Rohan Khanna
