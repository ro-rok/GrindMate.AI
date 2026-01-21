# Pattern Mapping Service

## Overview

The Pattern Mapping Service provides intelligent pattern derivation from LeetCode question topics. It maps topics (like "array", "hash-table", "dynamic-programming") to problem-solving patterns (like "two-pointers", "sliding-window", "dp") to help users identify and practice specific algorithmic techniques.

## Architecture

### Components

1. **patterns_v1.json**: Configuration file containing topic-to-pattern mappings
2. **PatternService**: Service class that loads config and derives patterns
3. **Pattern Router**: FastAPI endpoints for pattern operations

### Pattern Configuration

The pattern configuration is stored in `app/config/patterns_v1.json` with the following structure:

```json
{
  "version": "1.0.0",
  "description": "Topic to pattern mappings for LeetCode questions",
  "mappings": {
    "array": ["two-pointers", "sliding-window", "prefix-sum"],
    "hash-table": ["hash-table"],
    "dynamic-programming": ["dynamic-programming"],
    ...
  },
  "pattern_descriptions": {
    "two-pointers": "Use two pointers to traverse data structure from different positions",
    "sliding-window": "Maintain a window of elements that slides through the data",
    ...
  }
}
```

### Hot-Reload Capability

In development mode (`ENVIRONMENT=development`), the pattern service automatically checks if the config file has been modified and reloads it. This allows you to update pattern mappings without restarting the server.

**How it works:**
1. Service tracks the last modification time of `patterns_v1.json`
2. On each `derive_patterns()` call in dev mode, it checks if file was modified
3. If modified, it reloads the config automatically
4. In production, hot-reload is disabled for performance

## API Endpoints

### GET /patterns

Get all available patterns with descriptions.

**Response:**
```json
[
  {
    "name": "two-pointers",
    "description": "Use two pointers to traverse data structure from different positions"
  },
  {
    "name": "sliding-window",
    "description": "Maintain a window of elements that slides through the data"
  },
  ...
]
```

### POST /patterns/derive

Derive patterns from comma-separated topics.

**Request:**
```json
{
  "topics": "array,hash-table,dynamic-programming"
}
```

**Response:**
```json
{
  "topics": "array,hash-table,dynamic-programming",
  "patterns": [
    "dynamic-programming",
    "hash-table",
    "prefix-sum",
    "sliding-window",
    "two-pointers"
  ]
}
```

### GET /patterns/info

Get information about the current pattern configuration.

**Response:**
```json
{
  "version": "1.0.0",
  "last_loaded": "2025-01-22T10:30:00",
  "topic_count": 71,
  "pattern_count": 34,
  "config_path": "/app/config/patterns_v1.json"
}
```

### POST /patterns/reload

Manually trigger a config reload (useful in development).

**Response:**
```json
{
  "message": "Pattern config reloaded successfully",
  "reloaded": true,
  "info": {
    "version": "1.0.0",
    "last_loaded": "2025-01-22T10:35:00",
    "topic_count": 71,
    "pattern_count": 34,
    "config_path": "/app/config/patterns_v1.json"
  }
}
```

## Usage Examples

### In Python Service

```python
from app.services.pattern_service import get_pattern_service

# Get the singleton instance
pattern_service = get_pattern_service()

# Derive patterns from topics
topics = "array,hash-table,two-pointers"
patterns = pattern_service.derive_patterns(topics)
# Returns: ['hash-table', 'prefix-sum', 'sliding-window', 'two-pointers']

# Get pattern description
description = pattern_service.get_pattern_description("two-pointers")
# Returns: "Use two pointers to traverse data structure from different positions"

# Get all patterns
all_patterns = pattern_service.get_all_patterns()
# Returns: [{"name": "...", "description": "..."}, ...]

# Get config info
info = pattern_service.get_config_info()
# Returns: {"version": "1.0.0", "last_loaded": "...", ...}
```

### In Frontend (JavaScript)

```javascript
// Get all patterns
const response = await fetch('http://localhost:8000/patterns');
const patterns = await response.json();

// Derive patterns from topics
const deriveResponse = await fetch('http://localhost:8000/patterns/derive', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ topics: 'array,hash-table,dynamic-programming' })
});
const result = await deriveResponse.json();
console.log(result.patterns); // ['dynamic-programming', 'hash-table', ...]
```

## Updating Existing Questions

After implementing the pattern service, you need to populate the `patterns` field for existing questions. Use the provided script:

```bash
cd fastapi_backend
python scripts/update_question_patterns.py
```

This script will:
1. Fetch all questions from the database
2. Derive patterns from each question's topics
3. Update the `patterns` field in the database

## Adding New Patterns

To add new pattern mappings:

1. Edit `app/config/patterns_v1.json`
2. Add new topic mappings in the `mappings` section
3. Add pattern descriptions in the `pattern_descriptions` section
4. In development, the changes will be hot-reloaded automatically
5. In production, restart the server or call `POST /patterns/reload`

**Example:**
```json
{
  "mappings": {
    "new-topic": ["new-pattern"],
    ...
  },
  "pattern_descriptions": {
    "new-pattern": "Description of the new pattern",
    ...
  }
}
```

## Integration with Question Model

The Question model includes a `patterns` field:

```python
class QuestionPublic(MongoModel):
    title: str
    link: str
    difficulty: str
    topics: Optional[str] = None
    patterns: List[str] = []  # Derived from topics
    ...
```

When creating or updating questions, derive patterns using the service:

```python
from app.services.pattern_service import get_pattern_service

pattern_service = get_pattern_service()

# When creating/updating a question
question_data = {
    "title": "Two Sum",
    "topics": "array,hash-table",
    ...
}

# Derive patterns
patterns = pattern_service.derive_patterns(question_data["topics"])
question_data["patterns"] = patterns

# Save to database
await db["questions"].insert_one(question_data)
```

## Testing

### Unit Tests

Test the pattern derivation logic:

```python
def test_derive_patterns():
    pattern_service = get_pattern_service()
    
    # Test basic derivation
    patterns = pattern_service.derive_patterns("array,hash-table")
    assert "two-pointers" in patterns
    assert "hash-table" in patterns
    
    # Test empty topics
    patterns = pattern_service.derive_patterns("")
    assert patterns == []
    
    # Test case insensitivity
    patterns = pattern_service.derive_patterns("ARRAY,Hash-Table")
    assert len(patterns) > 0
```

### Integration Tests

Test the API endpoints:

```bash
cd fastapi_backend
python test_patterns_api.py
```

This will test all pattern endpoints and verify they work correctly.

## Performance Considerations

1. **Config Loading**: Config is loaded once at startup and cached in memory
2. **Hot-Reload**: Only enabled in development mode to avoid performance overhead
3. **Pattern Derivation**: O(n) where n is the number of topics (typically small)
4. **Memory Usage**: Config file is ~10KB, negligible memory footprint

## Troubleshooting

### Config Not Loading

**Problem**: Pattern service returns empty patterns

**Solution**: 
- Check that `app/config/patterns_v1.json` exists
- Check file permissions
- Check logs for error messages

### Hot-Reload Not Working

**Problem**: Changes to config file not reflected

**Solution**:
- Ensure `ENVIRONMENT=development` is set
- Call `POST /patterns/reload` manually
- Restart the server

### Patterns Not Matching

**Problem**: Topics not mapping to expected patterns

**Solution**:
- Check topic spelling in config file
- Topics are case-insensitive and whitespace-trimmed
- Check for comma-separated format: "array,hash-table" not "array, hash-table"

## Future Enhancements

1. **Pattern Versioning**: Support multiple pattern config versions
2. **User-Defined Patterns**: Allow users to create custom pattern mappings
3. **Pattern Analytics**: Track which patterns users struggle with
4. **Pattern Recommendations**: Suggest patterns based on user history
5. **Pattern Difficulty**: Add difficulty ratings to patterns
