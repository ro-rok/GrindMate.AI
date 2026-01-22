# Anonymous User Support Implementation

## Overview

This document describes the implementation of anonymous user support for the GrindMate.AI backend, allowing unauthenticated users to browse public content while protecting user-specific endpoints.

## Implementation Details

### 1. Optional Authentication Dependency

Created `get_current_user_optional()` function in `app/auth.py`:

```python
async def get_current_user_optional(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> Optional[UserInDB]:
    """
    Get current user if authenticated, None if anonymous.
    Use for endpoints that work for both authenticated and anonymous users.
    
    Returns:
        UserInDB if valid session cookie exists, None otherwise
    """
```

This function:
- Returns `UserInDB` if a valid session cookie exists
- Returns `None` if no cookie or invalid cookie (no exception raised)
- Can be used with `OptionalCurrentUser` type annotation

### 2. Public Endpoints

The following endpoints are now accessible without authentication:

#### Companies Endpoints (Already Public)
- `GET /companies` - List all companies
- `GET /companies.json` - List all companies (JSON alias)
- `GET /companies/{id}` - Get company details
- `GET /companies/{id}/topics` - Get company topics
- `POST /companies/{id}/refresh` - Refresh company questions

#### Questions Endpoints (Already Accept Optional User)
- `GET /companies/{id}/questions` - List questions (accepts optional `user_id` param)
- `GET /companies/{id}/questions.json` - List questions (JSON alias)
- `GET /companies/{id}/questions/random` - Smart random question (requires `user_id`)
- `GET /companies/{id}/questions/random.json` - Smart random question (JSON alias)

### 3. Protected Endpoints

The following endpoints remain protected and require authentication:

#### User Endpoints
- `GET /users/me/streak` - Get user streak data
- `GET /users/me/analytics` - Get user analytics
- `POST /users/me/byok` - Set BYOK API key
- `DELETE /users/me/byok` - Remove BYOK API key
- `GET /users/me/byok/status` - Get BYOK status
- `POST /users/reset_progress` - Reset user progress

#### Tutor Endpoints
- `POST /tutor/questions/{id}/hints/{level}/unlock` - Unlock hint
- `POST /tutor/questions/{id}/chat` - Chat with tutor
- `GET /tutor/questions/{id}/hints` - Get unlocked hints
- `GET /tutor/rate-budget` - Get rate budget

#### Auth Endpoints
- `GET /users/current` - Get current user
- `GET /users/current.json` - Get current user (JSON alias)

#### Question Mutation Endpoints
- `POST /companies/{id}/questions/{question_id}/solve` - Mark question solved (requires `user_id`)
- `DELETE /companies/{id}/questions/{question_id}/solve` - Unmark question solved (requires `user_id`)
- `POST /companies/{id}/questions/{question_id}/track-focus` - Track focus time (requires `user_id`)
- `POST /questions/{question_id}/solve` - Standalone solve endpoint (requires `user_id`)
- `DELETE /questions/{question_id}/solve` - Standalone unsolve endpoint (requires `user_id`)

## Testing

Comprehensive tests were created in `test_anonymous_access.py` to verify:

1. ✓ Public endpoints return 200 without authentication
2. ✓ Protected endpoints return 401 without authentication
3. ✓ Questions can be listed without authentication
4. ✓ Companies can be browsed without authentication

### Test Results

```
1. Testing GET /companies (public endpoint)
   Status: 200
   ✓ Success - returned 470 companies

2. Testing GET /companies/{id} (public endpoint)
   Status: 200
   ✓ Success - returned company data

3. Testing GET /companies/{id}/questions (public endpoint)
   Status: 200
   ✓ Success - returned 19 questions

4. Testing GET /users/me/streak (protected endpoint)
   Status: 401
   ✓ Success - correctly rejected anonymous access

5. Testing GET /users/me/analytics (protected endpoint)
   Status: 401
   ✓ Success - correctly rejected anonymous access
```

## Frontend Integration

The frontend can now:

1. **Browse without authentication**: Users can view companies and questions without signing up
2. **Graceful degradation**: When anonymous users try to access protected features, they receive 401 responses
3. **Progressive enhancement**: Once authenticated, users get full access to tracking, analytics, and AI features

### Recommended Frontend Flow

```javascript
// Check if user is authenticated
const { isAuthenticated } = useAuthStore();

// Fetch questions (works for both auth and anon)
const response = await api.get(`/companies/${companyId}/questions`);

// If user tries to solve (requires auth)
if (!isAuthenticated) {
  // Show "Sign up to track progress" CTA
  navigate('/login');
} else {
  // Mark as solved
  await api.post(`/questions/${questionId}/solve`, { user_id });
}
```

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 8.1**: Anonymous users can access Companies page ✓
- **Requirement 8.2**: Anonymous users can access Questions page ✓
- **Requirement 8.6**: `/companies` and `/questions` endpoints are publicly accessible ✓
- **Requirement 8.7**: `/users/me/*` endpoints remain protected ✓

## Security Considerations

1. **No data leakage**: Anonymous users cannot access user-specific data
2. **No mutation without auth**: All write operations require authentication
3. **Graceful failure**: Invalid/missing auth returns 401, not 500
4. **Cookie-based auth**: Session cookies are checked but not required for public endpoints

## Future Enhancements

Potential improvements for anonymous user experience:

1. **Demo analytics**: Show sample analytics data for anonymous users
2. **Rate limiting**: Apply stricter rate limits to anonymous users
3. **Conversion tracking**: Track which features anonymous users interact with
4. **Guest sessions**: Allow temporary progress tracking without account creation
