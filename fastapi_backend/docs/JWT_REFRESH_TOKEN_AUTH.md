# JWT Refresh Token Authentication Implementation

## Overview

This document describes the JWT refresh token authentication system implemented for GrindMate.AI, including token rotation, CSRF protection, and security best practices.

## Architecture

### Token Types

1. **Access Token (JWT)**
   - Short-lived: 15 minutes
   - Stored in HttpOnly cookie (`session`)
   - Used for API authentication
   - Contains: `sub` (user_id), `exp` (expiration), `type` ("access")

2. **Refresh Token**
   - Long-lived: 7 days sliding window
   - Stored in HttpOnly cookie (`refresh_token`)
   - Used to obtain new access tokens
   - Cryptographically secure random string (64 characters)
   - Hashed before storage in database

3. **CSRF Token**
   - Same lifetime as refresh token (7 days)
   - Stored in non-HttpOnly cookie (`csrf_token`)
   - Also returned in response body on login/register
   - Frontend must send in `X-CSRF-Token` header for state-changing requests

### Token Rotation

The system implements **refresh token rotation** for enhanced security:

1. When a refresh token is used, it is immediately revoked
2. A new refresh token is issued with the same `token_family_id`
3. If a revoked token is reused, it indicates a potential attack
4. All tokens in the family are revoked to prevent further compromise

### Token Family

Each refresh token belongs to a **token family** identified by a UUID:
- All tokens issued from the same login session share a family ID
- Enables detection of token reuse attacks
- Allows revoking all tokens from a compromised session

## Database Schema

### refresh_tokens Collection

```python
{
    "_id": ObjectId,
    "user_id": ObjectId,
    "token_family_id": str,  # UUID for rotation detection
    "token_hash": str,       # SHA-256 hash of token
    "expires_at": datetime,  # TTL for automatic cleanup
    "created_at": datetime,
    "revoked": bool,
    "revoked_at": datetime | None
}
```

### Indexes

- `token_hash` - Fast token lookup
- `token_family_id` - Revoke entire family on reuse
- `(user_id, revoked)` - Query user's active tokens
- `expires_at` - TTL index for automatic cleanup

## API Endpoints

### POST /users (Register)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "csrf_token": "random_token_string"
}
```

**Cookies Set:**
- `session` (access token, 15 min)
- `refresh_token` (refresh token, 7 days)
- `csrf_token` (CSRF token, 7 days)

### POST /users/sign_in (Login)

Same as register endpoint.

### POST /auth/refresh (Refresh Token)

**Request:** No body required (uses refresh token cookie)

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "csrf_token": "new_csrf_token"
}
```

**Cookies Set:**
- New `session` (access token, 15 min)
- New `refresh_token` (refresh token, 7 days)
- New `csrf_token` (CSRF token, 7 days)

**Error Cases:**
- 401: Token not found, expired, or revoked
- 401: Token reuse detected (all family tokens revoked)

### DELETE /users/sign_out (Logout)

**Request:** No body required

**Response:** 204 No Content

**Actions:**
- Revokes refresh token in database
- Clears all auth cookies

## CSRF Protection

### Double-Submit Cookie Pattern

1. **On Login/Register:**
   - Generate random CSRF token
   - Store in non-HttpOnly cookie (readable by JS)
   - Return in response body (frontend stores in memory/localStorage)

2. **On State-Changing Requests (POST/PUT/DELETE/PATCH):**
   - Frontend sends CSRF token in `X-CSRF-Token` header
   - Middleware validates header matches cookie
   - Request rejected if mismatch or missing

### Exempt Paths

The following paths don't require CSRF validation:
- `/users` (register)
- `/users/sign_in` (login)
- `/auth/refresh` (uses refresh token cookie)
- Public endpoints (docs, health checks)

## Security Features

### 1. Token Rotation

- Refresh tokens are single-use
- New token issued on each refresh
- Prevents token replay attacks

### 2. Reuse Detection

- Revoked tokens tracked in database
- Reusing a revoked token triggers family revocation
- Protects against stolen token attacks

### 3. HttpOnly Cookies

- Access and refresh tokens not accessible to JavaScript
- Prevents XSS attacks from stealing tokens

### 4. CSRF Protection

- Double-submit cookie pattern
- Protects against cross-site request forgery
- Required for all state-changing operations

### 5. Token Hashing

- Refresh tokens hashed (SHA-256) before storage
- Database compromise doesn't expose valid tokens

### 6. TTL Indexes

- Expired tokens automatically removed from database
- Reduces storage and improves query performance

### 7. Short-Lived Access Tokens

- 15-minute expiration limits exposure window
- Compromised access token has limited validity

## Frontend Integration

### Login Flow

```javascript
// 1. Login
const response = await fetch('/users/sign_in', {
  method: 'POST',
  credentials: 'include',  // Send/receive cookies
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();
// Store CSRF token for later use
localStorage.setItem('csrf_token', data.csrf_token);
```

### Making Authenticated Requests

```javascript
// 2. Make authenticated request
const csrfToken = localStorage.getItem('csrf_token');

const response = await fetch('/api/endpoint', {
  method: 'POST',
  credentials: 'include',  // Send cookies
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken  // CSRF protection
  },
  body: JSON.stringify(data)
});
```

### Handling Token Expiration

```javascript
// 3. Handle 401 errors (token expired)
if (response.status === 401) {
  // Try to refresh token
  const refreshResponse = await fetch('/auth/refresh', {
    method: 'POST',
    credentials: 'include'
  });
  
  if (refreshResponse.ok) {
    const refreshData = await refreshResponse.json();
    // Update CSRF token
    localStorage.setItem('csrf_token', refreshData.csrf_token);
    
    // Retry original request
    return fetch(originalUrl, originalOptions);
  } else {
    // Refresh failed, redirect to login
    window.location.href = '/login';
  }
}
```

### Logout Flow

```javascript
// 4. Logout
await fetch('/users/sign_out', {
  method: 'DELETE',
  credentials: 'include'
});

// Clear stored CSRF token
localStorage.removeItem('csrf_token');
```

## Configuration

### Environment Variables

```env
SECRET_KEY=your-secret-key-here  # For JWT signing
```

### Settings (config.py)

```python
access_token_cookie_name: str = "session"
refresh_token_cookie_name: str = "refresh_token"
csrf_token_cookie_name: str = "csrf_token"
access_token_expire_minutes: int = 15
refresh_token_expire_days: int = 7
```

## Testing

### Manual Testing with cURL

```bash
# 1. Login
curl -X POST http://localhost:8000/users/sign_in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt \
  -v

# 2. Make authenticated request
curl -X POST http://localhost:8000/api/endpoint \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf_token_from_login>" \
  -b cookies.txt \
  -d '{"data":"value"}'

# 3. Refresh token
curl -X POST http://localhost:8000/auth/refresh \
  -b cookies.txt \
  -c cookies.txt \
  -v

# 4. Logout
curl -X DELETE http://localhost:8000/users/sign_out \
  -b cookies.txt
```

## Maintenance

### Cleanup Expired Tokens

Expired tokens are automatically removed by MongoDB TTL indexes. No manual cleanup required.

### Monitoring

Monitor the following metrics:
- Token refresh rate
- Token reuse detection events
- Failed authentication attempts
- CSRF validation failures

## Security Considerations

### Production Deployment

1. **Enable HTTPS:**
   - Set `secure=True` in cookie settings
   - Ensures cookies only sent over encrypted connections

2. **Update CORS Settings:**
   - Restrict `allow_origins` to production domains
   - Set `allow_credentials=True` for cookie support

3. **Rotate Secret Key:**
   - Use strong, random secret key
   - Rotate periodically
   - Store securely (environment variables, secrets manager)

4. **Rate Limiting:**
   - Implement rate limiting on auth endpoints
   - Prevent brute force attacks

5. **Monitoring:**
   - Log authentication events
   - Alert on suspicious patterns (multiple reuse detections)

## References

- Requirements: 14.1-14.9
- Design Document: JWT Refresh Token Authentication section
- OWASP: Token-Based Authentication Best Practices
