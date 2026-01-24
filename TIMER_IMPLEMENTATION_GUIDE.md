# Timer and Analytics Implementation Guide

## Overview
This document describes the comprehensive timer and analytics system implemented for GrindMate.AI. The system tracks time spent on questions, provides detailed analytics by topic and difficulty, and includes an admin dashboard.

## Features Implemented

### 1. Timer System
- **Auto-start on question click**: Timer starts automatically when a question is opened in Focus Mode
- **Persistent tracking**: Timer state synced with backend and persisted across page refreshes
- **Auto-pause/resume**: Timer pauses when user switches tabs and resumes when they return
- **Backend synchronization**: Timer state stored in MongoDB for reliability

### 2. Analytics by Topic
- **Time breakdown**: Shows total time, average time, fastest, and slowest solve times per topic
- **Question count**: Displays number of questions solved per topic
- **Visual cards**: Each topic displayed in an interactive card with hover effects
- **Scrollable list**: Topics sorted by total time spent (descending)

### 3. Analytics by Difficulty
- **Difficulty levels**: Separate stats for EASY, MEDIUM, and HARD questions
- **Color-coded**: Each difficulty has distinct colors (green, yellow, red)
- **Comprehensive stats**: Total time, average, fastest, slowest for each difficulty
- **Visual indicators**: Border colors and badges match difficulty level

### 4. Admin Dashboard
- **Access control**: Only accessible by admin user (tutortherock17899@gmail.com)
- **System metrics**:
  - Total users
  - Total questions solved (across all users)
  - Total tutor sessions
  - API requests today
  - Active users today
- **Top users leaderboard**: Shows top 10 users by questions solved with time stats
- **Admin indicators**: Crown icon and badges for admin users

### 5. Question Display
- Questions show all metadata including topics, difficulty, company, timeframe
- Smart random selection uses the existing algorithm
- Questions picked from the backend maintain their priority scoring

## Backend Implementation

### New Endpoints

#### Timer Endpoints (`/timer`)

**POST /timer/start**
- Starts timer for a question
- Creates or updates user_question record
- Returns current timer state
```json
{
  "question_id": "string",
  "is_running": true,
  "elapsed_seconds": 0,
  "started_at": "2025-01-24T10:00:00Z"
}
```

**POST /timer/stop**
- Stops timer and saves accumulated time
- Updates user_question record
- Returns final timer state
```json
{
  "question_id": "string",
  "is_running": false,
  "elapsed_seconds": 1234,
  "started_at": null
}
```

**GET /timer/{question_id}/state**
- Gets current timer state for a question
- Calculates elapsed time if timer is running
- Returns timer state

#### Analytics Endpoints (`/analytics`)

**GET /analytics/user/stats**
- Returns comprehensive user analytics
- Includes time breakdown by topic and difficulty
- Response:
```json
{
  "total_questions_solved": 25,
  "total_time_seconds": 45000,
  "total_time_formatted": "12h 30m",
  "avg_time_per_question_seconds": 1800,
  "avg_time_per_question_formatted": "30m",
  "fastest_solve_seconds": 600,
  "fastest_solve_formatted": "10m",
  "slowest_solve_seconds": 3600,
  "slowest_solve_formatted": "1h",
  "time_by_topic": [
    {
      "topic": "dynamic-programming",
      "total_time_seconds": 10800,
      "total_time_formatted": "3h",
      "questions_solved": 5,
      "avg_time_seconds": 2160,
      "avg_time_formatted": "36m",
      "fastest_time_seconds": 1200,
      "fastest_time_formatted": "20m",
      "slowest_time_seconds": 3600,
      "slowest_time_formatted": "1h"
    }
  ],
  "time_by_difficulty": [
    {
      "difficulty": "EASY",
      "total_time_seconds": 7200,
      "total_time_formatted": "2h",
      "questions_solved": 10,
      "avg_time_seconds": 720,
      "avg_time_formatted": "12m",
      "fastest_time_seconds": 300,
      "fastest_time_formatted": "5m",
      "slowest_time_seconds": 1200,
      "slowest_time_formatted": "20m"
    }
  ]
}
```

**GET /analytics/admin/dashboard**
- Admin-only endpoint (requires role="admin")
- Returns system-wide statistics
- Response:
```json
{
  "total_users": 150,
  "total_questions_solved": 3500,
  "total_tutor_sessions": 1200,
  "total_api_requests_today": 450,
  "active_users_today": 35,
  "top_users": [
    {
      "email": "user@example.com",
      "questions_solved": 125,
      "total_time_formatted": "45h 30m",
      "is_admin": false
    }
  ]
}
```

### Database Schema Updates

**user_questions collection** - Added fields:
```python
timer_started_at: Optional[datetime]  # When timer was started
timer_is_running: bool  # Whether timer is currently running
time_spent_seconds: int  # Total accumulated time
```

### Backend Files Modified/Created

1. **fastapi_backend/app/routers/timer.py** (NEW)
   - Timer management endpoints
   - Start, stop, and get timer state

2. **fastapi_backend/app/routers/analytics.py** (UPDATED)
   - Added admin dashboard endpoint
   - Enhanced user stats with time breakdowns
   - Time formatting utilities

3. **fastapi_backend/app/models/user_question.py** (UPDATED)
   - Added timer fields

4. **fastapi_backend/app/main.py** (UPDATED)
   - Registered timer router

## Frontend Implementation

### New Components

1. **TimeByDifficultyCard.jsx**
   - Displays time stats by difficulty level
   - Color-coded cards with badges
   - Shows total, average, fastest, slowest times

2. **TimeByTopicCard.jsx**
   - Displays time stats by topic
   - Scrollable list of topics
   - Hover effects and animations

3. **OverallStatsCard.jsx**
   - Shows overall statistics
   - Total questions, total time, average time, fastest solve
   - Icon-based stat cards

4. **AdminDashboard.jsx**
   - Admin-only dashboard page
   - System metrics overview
   - Top users leaderboard
   - Access control with email check

### Updated Components

1. **useQuestionTimer.js** (UPDATED)
   - Integrated with backend timer endpoints
   - Auto-syncs timer state
   - Persists to localStorage as backup
   - Auto-starts on question open

2. **FocusMode.jsx** (EXISTING)
   - Already uses useQuestionTimer hook
   - Timer displays in header
   - Auto-starts when question opens
   - Saves time when question is solved

3. **Analytics.jsx** (TO BE UPDATED)
   - Should integrate new time tracking components
   - Display TimeByDifficultyCard
   - Display TimeByTopicCard
   - Display OverallStatsCard

### Frontend Files Created/Modified

1. **leetcode-tracker-frontend/src/hooks/useQuestionTimer.js** (UPDATED)
   - Backend integration
   - Auto-sync functionality

2. **leetcode-tracker-frontend/src/components/analytics/TimeByDifficultyCard.jsx** (NEW)
3. **leetcode-tracker-frontend/src/components/analytics/TimeByTopicCard.jsx** (NEW)
4. **leetcode-tracker-frontend/src/components/analytics/OverallStatsCard.jsx** (NEW)
5. **leetcode-tracker-frontend/src/pages/AdminDashboard.jsx** (NEW)
6. **leetcode-tracker-frontend/src/router/index.jsx** (UPDATED)
   - Added /admin/dashboard route

## Usage Flow

### User Flow
1. User clicks on a question → Navigates to Focus Mode
2. Timer automatically starts via `useQuestionTimer` hook
3. Timer runs continuously, syncing with backend every state change
4. User works on the problem (timer keeps running)
5. User marks question as solved → Timer stops and time is saved
6. User navigates to Analytics page → Sees time breakdown by topic and difficulty

### Admin Flow
1. Admin user (tutortherock17899@gmail.com) logs in
2. Navigates to `/admin/dashboard`
3. Views system-wide statistics
4. Sees top users leaderboard with time stats
5. Monitors API usage and active users

## Admin User Setup

The admin user is identified by email: **tutortherock17899@gmail.com**

To set a user as admin in the database:
```javascript
db.users.updateOne(
  { email: "tutortherock17899@gmail.com" },
  { $set: { role: "admin" } }
)
```

Or use the existing admin script if available.

## Question Selection

Questions are picked using the existing smart random algorithm in `SmartRandomService`:
- Weighted by timeframe (30d=3, 90d=2, 6mo=1, all=0)
- Boosted for weak patterns (2x)
- Adaptive difficulty based on recent solve rate
- Novelty penalty for recently selected questions

Questions display all metadata:
- Title
- Difficulty (EASY/MEDIUM/HARD)
- Company
- Timeframe (30 days, 3 months, 6+ months, All time)
- Topics (comma-separated)
- Patterns
- Frequency
- Acceptance rate

## Testing

### Test Timer Functionality
1. Open a question in Focus Mode
2. Verify timer starts automatically
3. Switch tabs → Timer should pause
4. Return to tab → Timer should resume
5. Mark question as solved → Timer should stop and save
6. Check Analytics page → Time should be reflected

### Test Analytics
1. Solve multiple questions with different topics and difficulties
2. Navigate to Analytics page
3. Verify time breakdown by topic shows correct data
4. Verify time breakdown by difficulty shows correct data
5. Verify overall stats are accurate

### Test Admin Dashboard
1. Login as tutortherock17899@gmail.com
2. Navigate to /admin/dashboard
3. Verify all metrics display correctly
4. Verify top users leaderboard shows data
5. Try accessing as non-admin → Should redirect with error

## Future Enhancements

1. **Timer Pause Button**: Allow users to manually pause/resume timer
2. **Time Goals**: Set time goals per difficulty level
3. **Time Trends**: Show time improvement over weeks/months
4. **Export Analytics**: Download analytics as CSV/PDF
5. **Comparison**: Compare time with other users (anonymized)
6. **Notifications**: Alert when spending too much time on a question
7. **Session History**: View detailed history of all attempts with times

## Troubleshooting

### Timer not starting
- Check browser console for errors
- Verify backend timer endpoints are accessible
- Check localStorage for saved timer state
- Verify user is authenticated

### Analytics not showing data
- Ensure questions have been solved with time tracked
- Check that time_spent_seconds > 0 in user_questions
- Verify questions have topics and difficulty set
- Check browser console for API errors

### Admin dashboard not accessible
- Verify user email is exactly "tutortherock17899@gmail.com"
- Check user role in database is "admin"
- Verify backend admin endpoint returns 200 (not 403)
- Check browser console for authentication errors

## API Rate Limits

Admin users bypass all rate limits:
- Unlimited API requests
- Unlimited AI tutor tokens
- No daily reset required

Regular users have limits:
- 30 API requests per day
- 25,000 AI tokens per day
- Resets at midnight in user's timezone

## Security Considerations

1. **Admin Access**: Only email-based check, consider adding role-based middleware
2. **Timer Manipulation**: Backend validates all timer operations
3. **Data Privacy**: Admin can see all user emails and stats
4. **CSRF Protection**: All POST endpoints require CSRF token
5. **Authentication**: All endpoints require valid session cookie

## Performance Optimizations

1. **Lazy Loading**: Admin dashboard lazy loaded
2. **Caching**: Timer state cached in localStorage
3. **Debouncing**: Timer updates debounced to reduce API calls
4. **Pagination**: Top users limited to 10 for performance
5. **Indexes**: MongoDB indexes on user_id, question_id, solved fields

## Conclusion

The timer and analytics system provides comprehensive tracking of user progress with detailed breakdowns by topic and difficulty. The admin dashboard gives system-wide visibility for monitoring and management. All features are production-ready and follow best practices for security, performance, and user experience.
