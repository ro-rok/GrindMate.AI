# Focus Mode - Quick Reference

## 🚀 What It Does

Opens LeetCode questions with full content, code templates, and hints - **automatically fetched and cached**.

## ⚡ Key Points

- **First visit**: Fetches from LeetCode (~500ms)
- **Repeat visits**: Instant from cache (~50ms)
- **No scripts needed**: Everything automatic
- **19+ languages**: Python3 auto-loads
- **Offline ready**: Works after first load

## 📋 Prerequisites

Questions need:
- `titleSlug` field, OR
- Valid LeetCode link

Run if needed:
```bash
cd fastapi_backend/scripts
python add_question_slugs.py
```

## 🎯 User Flow

1. Click question → Focus Mode opens
2. Content auto-fetches (or loads from cache)
3. Python3 template auto-loads in editor
4. Start coding!

## 🔧 API Endpoint

```
GET /companies/{company_id}/questions/{question_id}/leetcode-content
```

Returns:
- Problem description (HTML)
- Code templates (19+ languages)
- Hints
- Topic tags
- Stats (likes, acceptance rate)

## 💾 Caching

```
Request → Check DB → Cached? → Return instantly
                   → Not cached? → Fetch LeetCode → Cache → Return
```

## 🎨 Features

- ✅ Auto-fetch on open
- ✅ Smart caching
- ✅ Code templates
- ✅ Language switching
- ✅ Hints system
- ✅ Offline support
- ✅ Graceful fallbacks

## 🐛 Troubleshooting

**"Question description not available"**
- Question missing titleSlug/link
- Run `add_question_slugs.py`
- Or click "Open on LeetCode"

**Content not loading**
- Check backend is running
- Check question has valid titleSlug
- Check network connection

## 📊 Performance

| Action | Time |
|--------|------|
| First load | ~500ms |
| Cached load | ~50ms |
| Language switch | <10ms |

## 🎹 Keyboard Shortcuts

- `Esc` - Close Focus Mode
- `Ctrl+1` - Switch to Editor
- `Ctrl+2` - Switch to Notes
- `Ctrl+3` - Switch to AI Tutor
- `Ctrl+S` - Mark as solved
- `Ctrl+B` - Bookmark (coming soon)

## 📝 Database Fields

Auto-cached:
- `leetcode_content`
- `leetcode_code_snippets`
- `leetcode_hints`
- `leetcode_topic_tags`
- `leetcode_stats`
- `leetcode_cached_at`

## 🧪 Testing

```bash
# Test LeetCode API
python test_leetcode_graphql.py valid-anagram

# Test endpoint (replace IDs)
curl localhost:8000/companies/{slug}/questions/{id}/leetcode-content
```

## 📚 Documentation

- Full guide: `FOCUS_MODE_LEETCODE_INTEGRATION.md`
- Summary: `FOCUS_MODE_SUMMARY.md`
- This file: `FOCUS_MODE_QUICK_REF.md`

---

**TL;DR**: Open Focus Mode → Content auto-fetches → Start coding! 🎉
