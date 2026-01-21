# Smart Random Question Selection

## Overview

The Smart Random service implements intelligent question selection for GrindMate.AI, replacing uniform random selection with a weighted algorithm that prioritizes questions based on multiple factors.

## Requirements

Implements Requirements 5.1-5.11 from the GrindMate.AI specification.

## Algorithm

### Priority Score Calculation

Each question receives a Priority Score calculated as:

```
Priority_Score = TimeframeWeight + WeaknessWeight + DifficultyWeight + NoveltyWeight
```

### Weight Components

#### 1. Timeframe Weight (0-3)
Prioritizes recent company questions:
- `30_days`: 3 points
- `90_days`: 2 points
- `more_than_six_months`: 1 point
- `all_time`: 0 points

**Requirement**: 5.3

#### 2. Weakness Weight (0 or 2)
Boosts questions with patterns the user struggles with:
- If question has any weak pattern: +2 points
- Otherwise: 0 points

A pattern is considered "weak" if:
- User has attempted ≥3 questions with that pattern
- Solve rate < 50% for that pattern

**Requirement**: 5.4

#### 3. Difficulty Weight (0-2)
Adapts to user's recent performance:

**If recent solve rate > 70%** (user doing well):
- EASY: 0 points
- MEDIUM: 1 point
- HARD: 2 points

**If recent solve rate < 40%** (user struggling):
- EASY: 2 points
- MEDIUM: 1 point
- HARD: 0 points

**If recent solve rate 40-70%** (neutral):
- All difficulties: 1 point

**Requirement**: 5.5

#### 4. Novelty Weight (-2 to 0)
Penalizes recently selected questions:
- Not in last 10 selections: 0 points
- In last 10 selections: -2 to -0.2 points (more recent = higher penalty)

Formula: `-2.0 * (1 - position / 10)` where position 0 is most recent

**Requirements**: 5.6, 5.7

### Selection Process

1. **Filter**: Get all unsolved questions matching user's filters (company, timeframe, difficulty, topics, patterns)
2. **Score**: Calculate Priority Score for each question
3. **Sort**: Order questions by score (descending)
4. **Select**: Choose from top 20% using weighted random selection
5. **Track**: Record selection to avoid repeats

**Requirements**: 5.1, 5.8, 5.9, 5.10, 5.11

## API Usage

### Endpoint

```
GET /companies/{company_id}/questions/random
GET /companies/{company_id}/questions/random.json
```

### Query Parameters

- `user_id` (required): User's ObjectId
- `timeframe` (optional): "30_days", "90_days", "more_than_six_months", "all_time"
- `difficulty` (optional): "EASY", "MEDIUM", "HARD"
- `topics` (optional): Comma-separated topic names
- `patterns` (optional): Comma-separated pattern names

### Response

```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Two Sum",
  "link": "https://leetcode.com/problems/two-sum/",
  "difficulty": "MEDIUM",
  "frequency": 100,
  "acceptance_rate": 0.49,
  "timeframe": "30_days",
  "topics": "array,hash-table",
  "patterns": ["two-pointers", "hash-table"],
  "company_id": "507f1f77bcf86cd799439012",
  "priority_score": 7.5,
  "reason": "Weak pattern: dynamic-programming, Recent question (30_days)"
}
```

### Error Responses

**401 Unauthorized**: Missing or invalid `user_id`
```json
{
  "detail": "user_id required for smart random selection"
}
```

**404 Not Found**: No unsolved questions matching filters
```json
{
  "detail": "No unsolved questions matching filters"
}
```

## Service API

### SmartRandomService

```python
from app.services.smart_random import SmartRandomService

service = SmartRandomService(db)
```

#### Methods

##### `select_smart_random(user_id, filters)`
Main selection method.

**Parameters**:
- `user_id` (ObjectId): User's ID
- `filters` (dict): Query filters

**Returns**: Question document with `priority_score` and `reason` fields, or None

##### `calculate_priority_score(question, weak_patterns, recent_solve_rate, recent_selections)`
Calculate priority score for a single question.

**Returns**: `PriorityScore` object with breakdown

##### `get_weak_patterns(user_id)`
Get set of user's weak patterns.

**Returns**: Set of pattern names

##### `get_recent_solve_rate(user_id, last_n=10)`
Get user's solve rate for last N questions.

**Returns**: Float between 0 and 1

##### `get_recent_selections(user_id, last_n=10)`
Get user's recent question selections.

**Returns**: List of question ObjectIds

## Implementation Details

### Files Created

1. **`app/services/smart_random.py`**: Core service implementation
2. **`app/models/question.py`**: Added `SmartRandomResponse` model
3. **`app/routers/questions.py`**: Updated random endpoints

### Dependencies

- `motor`: MongoDB async driver
- `bson`: ObjectId handling
- `random`: Weighted random selection

### Database Queries

The service performs the following queries:

1. Get user's question attempts (for weak patterns)
2. Get question details (for pattern mapping)
3. Get user's solved questions (for filtering)
4. Get matching questions (for selection pool)

All queries use existing indexes for performance.

## Testing

### Manual Testing

Use the test script:

```bash
cd fastapi_backend
python test_smart_random.py
```

### API Testing

```bash
# Get smart random question
curl "http://localhost:8000/companies/{company_id}/questions/random?user_id={user_id}&timeframe=30_days"
```

## Future Enhancements

1. **Selection History Collection**: Create dedicated collection to track smart random selections (currently uses `last_attempt_at` as proxy)

2. **Caching**: Cache weak patterns and recent solve rate per user session

3. **A/B Testing**: Compare smart random vs uniform random for user engagement

4. **Personalization**: Add user preferences for weight adjustments

5. **Analytics**: Track which weight components are most effective

## Performance Considerations

- **Query Optimization**: Uses existing indexes on `user_questions` and `questions`
- **Memory**: Loads all matching questions into memory for scoring (acceptable for typical query sizes)
- **Computation**: O(n) scoring where n = number of matching questions
- **Selection**: O(n log n) sorting, then O(1) weighted random from top 20%

For large question sets (>1000), consider:
- Sampling before scoring
- Caching scores per user
- Pre-computing weak patterns

## Related Documentation

- [Pattern Service](./PATTERN_SERVICE.md)
- [Analytics Service](../app/services/analytics_service.py)
- [Requirements](../../.kiro/specs/grindmate-cinematic-transformation/requirements.md) - Section 5
