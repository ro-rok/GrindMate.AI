# Question Flow Improvements

## Problem
When clicking on a question, it was automatically marking it as "solved" after 1 second without asking the user what they actually did.

## Solution
Created a new modal dialog that appears after clicking a question, asking the user what they want to do:

### New Features

1. **Question Action Modal** (`QuestionActionModal.jsx`)
   - Appears after clicking any question
   - Provides 4 clear options:

   ✅ **Solved it!**
   - Marks question as solved
   - Updates streak
   - Shows success toast

   🤔 **I'm stuck**
   - Opens Focus Mode with AI Tutor
   - Doesn't mark as solved
   - Provides hints and chat support

   👀 **Just looking**
   - Closes modal
   - No changes to progress
   - For browsing/reviewing questions

   ↩️ **Mark as unsolved** (only if already solved)
   - Removes from solved list
   - Updates streak accordingly

2. **AI Tutor Integration**
   - Backend endpoints already exist:
     - `/questions/{id}/hints/{level}/unlock` - Progressive hint system (6 levels)
     - `/questions/{id}/chat` - Chat with AI tutor
   - Three tutor modes:
     - **Socratic**: Guides with questions
     - **ELI5**: Explains like you're 5
     - **Interviewer**: Simulates interview scenario
   - Focus Mode page ready for implementation

3. **Backend Fix**
   - Fixed `datetime.date` vs `datetime.datetime` issue in `streak_service.py`
   - MongoDB BSON requires `datetime.datetime` objects
   - Now properly converts dates when storing/retrieving

## Files Changed

### Frontend
- ✅ `leetcode-tracker-frontend/src/components/question/QuestionActionModal.jsx` (NEW)
- ✅ `leetcode-tracker-frontend/src/pages/QuestionList.jsx` (UPDATED)
- ✅ `leetcode-tracker-frontend/src/pages/FocusMode.jsx` (IMPLEMENTED)

### Backend
- ✅ `fastapi_backend/app/services/streak_service.py` (FIXED)

## Focus Mode Features

The Focus Mode is now fully implemented with:

### Layout
- **Split-screen design**: Question details on left, AI tutor on right
- **Responsive**: Adapts to different screen sizes
- **Full-screen**: Distraction-free environment

### AI Tutor Sidebar (Right Panel)

1. **Tutor Mode Selector**
   - 🤔 **Socratic**: Guides you with questions to help you think
   - 👶 **ELI5**: Explains concepts in simple terms
   - 💼 **Interview**: Simulates interview scenario with follow-ups

2. **Progressive Hint Ladder** (6 levels)
   - Level 1: Gentle nudge
   - Level 2: Key insight
   - Level 3: Approach
   - Level 4: Algorithm
   - Level 5: Pseudocode
   - Level 6: Full solution
   - Must unlock sequentially (can't skip levels)
   - Visual feedback: 🔒 locked, 🔓 available, ✓ unlocked

3. **Chat Interface**
   - Real-time conversation with AI tutor
   - Message history with user/assistant distinction
   - Auto-scrolls to latest message
   - Can include code snippets for specific feedback

4. **Error Handling**
   - Displays API errors inline
   - Dismissible error messages
   - Loading states for async operations

### Question Panel (Left Side)

1. **Question Details**
   - Title with difficulty badge (Easy/Medium/Hard)
   - Frequency indicator
   - Topic tags
   - Direct link to LeetCode

2. **Code Input Area**
   - Large textarea for pasting code
   - Monospace font for readability
   - Optional - can chat without code
   - Code is sent with chat messages for context

3. **Actions**
   - ✅ **Mark Solved** button in header
   - Automatically navigates back after marking solved
   - Close button with Esc keyboard shortcut

## How It Works Now

1. User clicks on a question card
2. LeetCode link opens in new tab
3. Modal appears asking "How did it go?"
4. User selects their action:
   - Solved → Updates progress
   - Stuck → Opens AI tutor
   - Just looking → Closes modal
   - Unsolve → Removes from solved

## Next Steps (Optional)

1. ✅ **Implement Focus Mode UI** - COMPLETED!
   - Split-screen layout with question on left, AI tutor on right
   - Progressive hint ladder (6 levels, unlock sequentially)
   - Three tutor modes: Socratic 🤔, ELI5 👶, Interview 💼
   - Chat interface with message history
   - Code input area for getting specific feedback
   - Mark as solved button
   - Keyboard shortcut: `Esc` to close

2. **Add keyboard shortcuts**
   - ✅ `Esc` to close modal - DONE
   - `1-4` for quick action selection in modal
   - `Ctrl+Enter` to send chat message

3. **Track "stuck" events**
   - Analytics for which questions users get stuck on
   - Help identify difficult problems
   - Track which hints are most helpful

4. **Add "Review" option**
   - For questions already solved
   - Opens in read-only mode with solution notes
   - Show previous attempts and hints used
