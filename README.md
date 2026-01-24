# GrindMate.AI

<!-- Center the logo -->
<img src="./leetcode-tracker-frontend/public/logo-bg.webp" alt="GrindMate.AI Logo" class="logo"/>

> **GrindMate.AI** is your AI-powered LeetCode study companion—filter and practice company-specific questions, track progress, and get instant AI help on any problem.

---

## 🚀 Features

### Core Features
- **Company & Timeframe Filters**  
    *Drill into the exact company and timeframe (30 days / 3 months / 6 months / all time)*  
- **Progress Tracking**  
    *Mark questions solved/unsolved, track streaks, and revisit your hard ones*  
- **AI-Powered Tutor**  
    *Get personalized help with multiple tutoring modes (Socratic, ELI5, Interview)*  
- **Smart Random Selection**  
    *AI-powered question selection based on your weak areas and learning patterns*  
- **Focus Mode**  
    *Distraction-free environment with integrated AI tutor panel*

### AI Tutor Features
- **Multiple Tutoring Modes**
  - Socratic: Guided learning through questions
  - ELI5: Simple explanations for beginners
  - Interview: Practice technical interviews
- **Session History**  
    *Review past sessions with AI-generated insights and recommendations*
- **Feedback System**  
    *Rate tutor responses and help improve the experience*
- **Code Analysis**  
    *Submit your code for review and optimization suggestions*

### Advanced Features
- **BYOK (Bring Your Own Key)**  
    *Use your own Groq API key for unlimited AI tutor access*
- **Rate Limit Management**  
    *Fair usage with 25,000 tokens and 30 requests per day (free tier)*
- **Admin Analytics Dashboard**  
    *Track engagement, costs, and user satisfaction (admin only)*
- **Company Import System**  
    *Bulk import questions from various sources with validation*

---

## 🏗️ Tech Stack

```yaml
backend:
    framework: FastAPI (Python 3.11+)
    database: MongoDB (via Motor async driver)
    auth: JWT tokens (access + refresh with rotation)
    AI: Groq Llama3-8B-8192
    encryption: Fernet (AES-128) for BYOK keys
    rate_limiting: Token bucket with timezone support
    CORS: FastAPI CORS middleware

frontend:
    framework: React 18 + Vite
    styling: Tailwind CSS
    state: Zustand
    routing: React Router v6
    animation: Framer Motion
    UI: Custom component library
    CI/CD: GitHub Actions → Vercel
```

### 📦 Installation

**Prerequisites**
- Python 3.11+
- Node.js 18+
- MongoDB 5.0+

**Backend Setup**

```bash
# Clone repository
git clone https://github.com/your-org/grindmate.git
cd grindmate/fastapi_backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add:
# - GROQ_API_KEY (get from https://console.groq.com)
# - MONGODB_URI (your MongoDB connection string)
# - SECRET_KEY (generate with: openssl rand -hex 32)
# - ENCRYPTION_KEY (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Create database indexes
python -c "
import asyncio
from app.db import get_database
from app.db_indexes import create_all_indexes
asyncio.run(create_all_indexes(get_database()))
"

# Run the server
uvicorn app.main:app --reload --port 8000
```

**Frontend Setup**

```bash
cd leetcode-tracker-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and set:
# VITE_API_URL=http://localhost:8000

# Run development server
npm run dev
```

**Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 💡 Usage

### Getting Started
1. **Sign Up / Log In**  
   Create an account or log in to start tracking your progress

2. **Browse Questions**  
   - Filter by company and timeframe
   - Use smart random selection for personalized practice
   - Mark questions as solved/unsolved

3. **Use Focus Mode**  
   - Click on any question to enter distraction-free focus mode
   - Access the AI tutor panel on the right
   - Choose your preferred tutoring mode (Socratic, ELI5, Interview)

4. **Get AI Help**  
   - Ask questions about the problem
   - Submit your code for review
   - Get hints and explanations
   - Track your session history

5. **Enable BYOK (Optional)**  
   - Go to Profile page
   - Enter your Groq API key in the BYOK section
   - Enjoy unlimited AI tutor access

### For Admins
- Access analytics dashboard at `/admin/analytics/dashboard`
- Monitor user engagement, costs, and satisfaction
- Track rate limit usage and optimize accordingly
- Review user feedback and improve the experience

## 📣 Thanks & Credits

Huge thanks to @liquidslr for the original company-wise LeetCode dataset and inspiration!

## 🧪 Testing

**Backend Tests**

```bash
cd fastapi_backend

# Run all tests
pytest

# Run specific test file
pytest tests/test_rate_limit_service.py

# Run with coverage
pytest --cov=app --cov-report=html

# Manual testing scripts
python test_rate_limit_manual.py
python test_byok_manual.py
```

**Frontend Tests**

```bash
cd leetcode-tracker-frontend

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📊 Analytics & Monitoring

GrindMate.AI includes a comprehensive analytics system for tracking usage and performance.

**Available Metrics**
- User engagement (active users, sessions, satisfaction)
- Rate limit monitoring (hits, affected users, trends)
- API cost tracking (tokens, costs, BYOK savings)
- User feedback analysis (ratings, issues, trends)
- Database performance (sizes, indexes, optimization)

**Admin Endpoints**
```bash
# Comprehensive dashboard
GET /admin/analytics/dashboard?days=30

# Specific metrics
GET /admin/analytics/engagement?days=7
GET /admin/analytics/rate-limits?days=30
GET /admin/analytics/costs?days=30
GET /admin/analytics/feedback?days=30
GET /admin/analytics/database-performance
```

**Documentation**
- Setup: `ANALYTICS_IMPLEMENTATION_SUMMARY.md`
- Usage: `ANALYTICS_MONITORING_GUIDE.md`
- Quick Reference: `ANALYTICS_QUICK_REFERENCE.md`

## 🔧 Deployment

**Backend (FastAPI)**
- Recommended: Railway, Render, or AWS ECS
- Requirements: Python 3.11+, MongoDB connection
- Environment variables: See `.env.example`

**Frontend (React)**
- Recommended: Vercel or Netlify
- Build command: `npm run build`
- Output directory: `dist`

**Production Checklist**
- [ ] Set up MongoDB with proper indexes
- [ ] Configure environment variables
- [ ] Generate production ENCRYPTION_KEY
- [ ] Set up CORS for frontend domain
- [ ] Configure rate limits appropriately
- [ ] Set up monitoring and alerts
- [ ] Test BYOK functionality
- [ ] Review security settings

**Deployment Guides**
- BYOK: `BYOK_DEPLOYMENT_CHECKLIST.md`
- Analytics: `ANALYTICS_IMPLEMENTATION_SUMMARY.md`

## 📚 Documentation

### Feature Documentation
- **BYOK (Bring Your Own Key)**
  - `BYOK_README.md` - Complete overview
  - `BYOK_USER_GUIDE.md` - User-facing guide
  - `BYOK_QUICK_START.md` - Quick setup
  - `BYOK_IMPLEMENTATION_SUMMARY.md` - Technical details
  - `BYOK_DEPLOYMENT_CHECKLIST.md` - Production deployment

- **Analytics & Monitoring**
  - `ANALYTICS_MONITORING_GUIDE.md` - Comprehensive guide
  - `ANALYTICS_IMPLEMENTATION_SUMMARY.md` - Technical details
  - `ANALYTICS_QUICK_REFERENCE.md` - Quick reference

- **Focus Mode & AI Tutor**
  - `FOCUS_MODE_GUIDE.md` - Focus mode features
  - `IMPLEMENTATION_SUMMARY.md` - AI tutor implementation
  - `.kiro/specs/focus-mode-ai-tutor-enhancement/` - Detailed specs

### API Documentation
- Interactive API docs: http://localhost:8000/docs
- OpenAPI schema: http://localhost:8000/openapi.json

## 🔐 Security Features

- **Authentication**: JWT tokens with refresh token rotation
- **Encryption**: Fernet (AES-128) for sensitive data
- **Rate Limiting**: Token bucket algorithm with timezone support
- **CORS**: Configurable cross-origin resource sharing
- **Admin Controls**: Role-based access control
- **Data Privacy**: Automatic data cleanup with TTL indexes

## 🎯 Rate Limits

**Free Tier**
- 25,000 tokens per day
- 30 requests per day
- Resets at midnight in user's timezone

**BYOK Users**
- Unlimited tokens
- Unlimited requests
- Use your own Groq API key

**Admin Users**
- Unlimited access
- No rate limits
- Full analytics access

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🎉 License

MIT © Rohan Khanna

---

**Built with ❤️ by developers, for developers**
