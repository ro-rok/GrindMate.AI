# Focus Mode - User Guide

## What is Focus Mode?

Focus Mode is a distraction-free environment for solving LeetCode problems with AI assistance. It provides progressive hints and interactive chat to help you learn without giving away the solution immediately.

## How to Access

1. Click on any question card
2. In the modal that appears, click **"🤔 I'm stuck"**
3. Focus Mode opens in full-screen

## Interface Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Focus Mode | Question Title              [✅ Mark Solved] [Close]│
├──────────────────────────────────┬──────────────────────────────┤
│                                  │  TUTOR MODE                  │
│  QUESTION DETAILS                │  [🤔 Socratic] [👶 ELI5]     │
│  ┌────────────────────────────┐  │  [💼 Interview]              │
│  │ Title: Two Sum             │  ├──────────────────────────────┤
│  │ Difficulty: Easy           │  │  PROGRESSIVE HINTS           │
│  │ Frequency: 1234            │  │  ┌────────────────────────┐  │
│  │ Topics: Array, Hash Table  │  │  │ 🔓 Hint 1: Gentle nudge│  │
│  │ [Open on LeetCode →]       │  │  │ ✓  Hint 2: Key insight │  │
│  └────────────────────────────┘  │  │ 🔒 Hint 3: Approach    │  │
│                                  │  │ 🔒 Hint 4: Algorithm   │  │
│  YOUR CODE (Optional)            │  │ 🔒 Hint 5: Pseudocode  │  │
│  ┌────────────────────────────┐  │  │ 🔒 Hint 6: Solution    │  │
│  │ def twoSum(nums, target):  │  │  └────────────────────────┘  │
│  │     # Your code here       │  ├──────────────────────────────┤
│  │                            │  │  CHAT HISTORY                │
│  │                            │  │  ┌────────────────────────┐  │
│  │                            │  │  │ You: How do I start?   │  │
│  │                            │  │  │ AI: What data structure│  │
│  │                            │  │  │     would help you...  │  │
│  │                            │  │  └────────────────────────┘  │
│  └────────────────────────────┘  ├──────────────────────────────┤
│                                  │  [Ask a question...] [Send]  │
└──────────────────────────────────┴──────────────────────────────┘
```

## Features

### 1. Tutor Modes

Choose how the AI helps you:

- **🤔 Socratic Mode** (Default)
  - Asks guiding questions
  - Helps you discover the solution yourself
  - Best for learning and understanding

- **👶 ELI5 Mode** (Explain Like I'm 5)
  - Simple, clear explanations
  - Breaks down complex concepts
  - Great for new topics

- **💼 Interview Mode**
  - Simulates real interview scenarios
  - Asks follow-up questions
  - Tests your understanding

### 2. Progressive Hint System

Six levels of hints, unlocked sequentially:

1. **Gentle Nudge** - Points you in the right direction
2. **Key Insight** - The main concept you need
3. **Approach** - High-level strategy
4. **Algorithm** - Specific algorithm to use
5. **Pseudocode** - Step-by-step logic
6. **Full Solution** - Complete implementation

**Rules:**
- Must unlock hints in order (can't skip)
- Once unlocked, hints appear in chat history
- Can't "un-see" a hint (choose wisely!)

### 3. Interactive Chat

Ask the AI tutor anything:
- "What data structure should I use?"
- "Is my approach correct?"
- "Can you explain this concept?"
- "What's the time complexity?"

**Pro Tips:**
- Paste your code in the code area for specific feedback
- Be specific in your questions
- Try to solve before asking for hints

### 4. Code Input Area

Optional textarea for your code:
- Paste your current solution
- AI can review and provide feedback
- Helps identify bugs or inefficiencies
- Not required - can chat without code

## Workflow Example

### Scenario: Stuck on "Two Sum" problem

1. **Start**: Click "I'm stuck" from question modal
2. **Read**: Review question details on left
3. **Think**: Try to solve on your own first
4. **Stuck?**: Unlock Hint 1 - "Think about what you're looking for"
5. **Still stuck?**: Ask in chat - "What data structure helps with lookups?"
6. **Progress**: AI guides you with questions
7. **Code**: Paste your attempt for feedback
8. **Unlock more**: Get Hint 2 if needed
9. **Solve**: Complete the problem
10. **Mark solved**: Click "✅ Mark Solved" button

## Keyboard Shortcuts

- `Esc` - Close Focus Mode
- `Enter` - Send chat message (when input is focused)

## Tips for Effective Learning

### Do's ✅
- Try solving for 10-15 minutes before asking for hints
- Start with Hint 1, don't jump to the solution
- Ask specific questions in chat
- Use Socratic mode for maximum learning
- Paste your code for personalized feedback

### Don'ts ❌
- Don't immediately unlock all hints
- Don't skip to Hint 6 (solution) right away
- Don't just copy-paste solutions
- Don't forget to mark as solved when done

## Rate Limits

To ensure fair usage:
- Token budget: 25,000 tokens
- Request limit: 30 requests
- Resets daily

If you hit limits:
- Wait for reset
- Use hints sparingly
- Ask focused questions

## Troubleshooting

**Chat not working?**
- Check your internet connection
- Verify you're logged in
- Try refreshing the page

**Hints locked?**
- Must unlock sequentially (1 → 2 → 3...)
- Can't skip levels
- Previous hint must be unlocked first

**Can't mark as solved?**
- Ensure you're logged in
- Check network connection
- Try again in a few seconds

## Privacy & Data

- Chat history is temporary
- Code snippets are not permanently stored
- Conversations are private to your session
- No data is shared with third parties

## Getting Help

If you encounter issues:
1. Check this guide
2. Try refreshing the page
3. Log out and log back in
4. Contact support if problem persists

---

**Happy Learning! 🚀**

Remember: The goal is to learn, not just to solve. Take your time, think through the problem, and use hints wisely!
