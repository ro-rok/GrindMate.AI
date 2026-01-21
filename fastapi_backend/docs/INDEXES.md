# MongoDB Indexes Documentation

This document describes all MongoDB indexes created for GrindMate.AI and their purposes.

## Index Creation

Indexes are automatically created when the FastAPI application starts via the `lifespan` event handler in `main.py`.

### Manual Index Creation

To create indexes manually without starting the full application:

```bash
cd fastapi_backend
python -m scripts.create_indexes
```

## Index Definitions

### Questions Collection

#### 1. Compound Index: company_id + timeframe + difficulty
- **Name**: `idx_questions_company_timeframe_difficulty`
- **Keys**: `(company_id: ASC, timeframe: ASC, difficulty: ASC)`
- **Purpose**: Optimizes the main question list query when filtering by company, timeframe, and difficulty
- **Requirement**: 18.1

#### 2. Text Index: topics + title
- **Name**: `idx_questions_text_search`
- **Keys**: `(topics: TEXT, title: TEXT)`
- **Weights**: title=10, topics=5
- **Purpose**: Enables full-text search on question topics and titles
- **Requirement**: 18.2

#### 3. Multikey Index: patterns
- **Name**: `idx_questions_patterns`
- **Keys**: `(patterns: ASC)`
- **Purpose**: Enables filtering questions by problem-solving patterns
- **Requirement**: 18.2

### User Questions Collection

#### 4. Compound Index: user_id + solved
- **Name**: `idx_user_questions_user_solved`
- **Keys**: `(user_id: ASC, solved: ASC)`
- **Purpose**: Optimizes queries for user's progress tracking and solved questions
- **Requirement**: 18.3

#### 5. Unique Compound Index: user_id + question_id
- **Name**: `idx_user_questions_user_question_unique`
- **Keys**: `(user_id: ASC, question_id: ASC)`
- **Unique**: Yes
- **Purpose**: Ensures one record per user-question pair, prevents duplicates
- **Requirement**: 18.4

### Users Collection

#### 6. Unique Index: email
- **Name**: `idx_users_email_unique`
- **Keys**: `(email: ASC)`
- **Unique**: Yes
- **Purpose**: Optimizes authentication queries and ensures email uniqueness
- **Requirement**: 18.5

#### 7. Index: last_solve_date
- **Name**: `idx_users_last_solve_date`
- **Keys**: `(last_solve_date: ASC)`
- **Purpose**: Optimizes streak tracking and calculation queries
- **Requirement**: 18.5

### Chat Messages Collection

#### 8. Compound Index: user_id + question_id + created_at
- **Name**: `idx_chat_messages_user_question_created`
- **Keys**: `(user_id: ASC, question_id: ASC, created_at: DESC)`
- **Purpose**: Optimizes fetching conversation history for a user and question

#### 9. Compound Index: question_id + hint_level + tutor_mode
- **Name**: `idx_chat_messages_cache_lookup`
- **Keys**: `(question_id: ASC, hint_level: ASC, tutor_mode: ASC)`
- **Purpose**: Optimizes finding cached AI responses for hint ladder

#### 10. TTL Index: expires_at
- **Name**: `idx_chat_messages_ttl`
- **Keys**: `(expires_at: ASC)`
- **TTL**: 0 seconds (expires at the time specified in expires_at field)
- **Purpose**: Automatically removes expired chat messages
- **Requirement**: 18.6

### Hint Unlocks Collection

#### 11. Unique Compound Index: user_id + question_id + hint_level
- **Name**: `idx_hint_unlocks_user_question_level_unique`
- **Keys**: `(user_id: ASC, question_id: ASC, hint_level: ASC)`
- **Unique**: Yes
- **Purpose**: Ensures one unlock record per user-question-level combination

### Rate Limits Collection

#### 12. Unique Compound Index: user_id + date
- **Name**: `idx_rate_limits_user_date_unique`
- **Keys**: `(user_id: ASC, date: ASC)`
- **Unique**: Yes
- **Purpose**: Ensures one rate limit record per user per day

#### 13. TTL Index: expires_at
- **Name**: `idx_rate_limits_ttl`
- **Keys**: `(expires_at: ASC)`
- **TTL**: 0 seconds (expires at the time specified in expires_at field)
- **Purpose**: Automatically removes expired rate limit records
- **Requirement**: 18.6

## Index Performance Considerations

### Background Index Creation
All indexes are created with `background=True` to avoid blocking the application startup. This means:
- The application can start serving requests immediately
- Index creation happens asynchronously
- Large collections may take time to index

### TTL Indexes
TTL (Time To Live) indexes automatically delete documents after a specified time:
- `expireAfterSeconds=0` means the document expires at the exact time specified in the indexed field
- MongoDB runs a background thread that removes expired documents every 60 seconds
- There may be a delay between expiration time and actual deletion

### Text Indexes
Text indexes enable full-text search but have some limitations:
- Only one text index per collection
- Text indexes can be large and impact write performance
- Use weights to prioritize certain fields (title has higher weight than topics)

### Unique Indexes
Unique indexes enforce data integrity:
- Prevent duplicate entries
- Raise errors on insert/update violations
- Essential for email uniqueness and relationship constraints

## Monitoring Index Usage

To monitor index usage in production:

```javascript
// In MongoDB shell
db.questions.aggregate([{ $indexStats: {} }])
db.user_questions.aggregate([{ $indexStats: {} }])
db.users.aggregate([{ $indexStats: {} }])
db.chat_messages.aggregate([{ $indexStats: {} }])
db.hint_unlocks.aggregate([{ $indexStats: {} }])
db.rate_limits.aggregate([{ $indexStats: {} }])
```

## Troubleshooting

### Index Creation Failures
If index creation fails:
1. Check MongoDB logs for errors
2. Verify sufficient disk space
3. Check for existing conflicting indexes
4. Ensure MongoDB version supports all index types (3.2+)

### Duplicate Key Errors
If you encounter duplicate key errors after creating unique indexes:
1. Identify duplicate records: `db.collection.aggregate([{$group: {_id: "$field", count: {$sum: 1}}}, {$match: {count: {$gt: 1}}}])`
2. Clean up duplicates before creating the unique index
3. Re-run index creation

### Performance Issues
If queries are slow despite indexes:
1. Use `.explain("executionStats")` to verify index usage
2. Check if indexes are being used: look for `IXSCAN` in explain output
3. Consider compound index order (most selective fields first)
4. Monitor index size and memory usage

## References

- [MongoDB Index Documentation](https://docs.mongodb.com/manual/indexes/)
- [MongoDB TTL Indexes](https://docs.mongodb.com/manual/core/index-ttl/)
- [MongoDB Text Indexes](https://docs.mongodb.com/manual/core/index-text/)
- [MongoDB Compound Indexes](https://docs.mongodb.com/manual/core/index-compound/)
