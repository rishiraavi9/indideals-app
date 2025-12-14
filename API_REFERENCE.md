# API Reference - IndiaDeals

Base URL: `http://localhost:3001/api` (Development)
Base URL: `https://your-domain.com/api` (Production)

---

## Authentication

All authenticated endpoints require the `Authorization` header:
```
Authorization: Bearer <access-token>
```

### POST /auth/signup
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "Password123!@#"
}
```

**Response: (201)**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "avatarUrl": null,
    "reputation": 0,
    "emailVerified": false
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "a1b2c3..."
}
```

### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123!@#"
}
```

**Response: (200)**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "emailVerified": false
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "a1b2c3..."
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "a1b2c3..."
}
```

**Response: (200)**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "d4e5f6..."
}
```

### POST /auth/logout
Logout and revoke refresh token.

**Request:**
```json
{
  "refreshToken": "a1b2c3..."
}
```

**Response: (200)**
```json
{
  "message": "Logged out successfully"
}
```

### POST /auth/logout-all
Logout from all devices. **Requires authentication.**

**Response: (200)**
```json
{
  "message": "Logged out from all devices successfully"
}
```

### GET /auth/me
Get current user profile. **Requires authentication.**

**Response: (200)**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "avatarUrl": null,
    "reputation": 0,
    "emailVerified": false
  }
}
```

---

## Password Reset

### POST /auth/forgot-password
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response: (200)**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

### POST /auth/reset-password
Reset password using token from email.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewPassword123!@#"
}
```

**Response: (200)**
```json
{
  "message": "Password has been reset successfully"
}
```

---

## Email Verification

### POST /auth/send-verification
Send email verification link. **Requires authentication.**

**Response: (200)**
```json
{
  "message": "Verification email sent"
}
```

### POST /auth/verify-email
Verify email address using token.

**Request:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response: (200)**
```json
{
  "message": "Email verified successfully"
}
```

---

## Deals

### GET /deals
Get all deals with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `category` (optional): Filter by category ID
- `sort` (optional): Sort by (hot, new, top) (default: hot)

**Response: (200)**
```json
{
  "deals": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### GET /deals/:id
Get deal by ID.

**Response: (200)**
```json
{
  "id": "uuid",
  "title": "Deal title",
  "description": "Deal description",
  "price": 1999,
  "originalPrice": 2999,
  "discountPercentage": 33,
  "merchant": "Amazon",
  "url": "https://...",
  "imageUrl": "https://...",
  "userId": "uuid",
  "categoryId": "uuid",
  "upvotes": 10,
  "downvotes": 2,
  "commentCount": 5,
  "createdAt": "2025-12-14T..."
}
```

### POST /deals
Create a new deal. **Requires authentication.**

**Request:**
```json
{
  "title": "Sony WH-1000XM5 Headphones",
  "description": "Noise cancelling headphones on sale",
  "price": 19999,
  "originalPrice": 29999,
  "merchant": "Amazon",
  "url": "https://amazon.in/...",
  "imageUrl": "https://...",
  "categoryId": "uuid"
}
```

**Response: (201)**
```json
{
  "id": "uuid",
  "title": "Sony WH-1000XM5 Headphones",
  ...
}
```

### PUT /deals/:id
Update deal. **Requires authentication and ownership.**

**Request:** Same as POST /deals

**Response: (200)**
```json
{
  "id": "uuid",
  "title": "Updated title",
  ...
}
```

### DELETE /deals/:id
Delete deal. **Requires authentication and ownership.**

**Response: (200)**
```json
{
  "message": "Deal deleted successfully"
}
```

---

## Voting

### POST /deals/:id/vote
Vote on a deal. **Requires authentication.**

**Request:**
```json
{
  "voteType": 1  // 1 for upvote, -1 for downvote
}
```

**Response: (200)**
```json
{
  "upvotes": 11,
  "downvotes": 2
}
```

---

## Comments

### GET /deals/:id/comments
Get comments for a deal.

**Response: (200)**
```json
{
  "comments": [
    {
      "id": "uuid",
      "content": "Great deal!",
      "userId": "uuid",
      "username": "user123",
      "upvotes": 5,
      "downvotes": 0,
      "createdAt": "2025-12-14T...",
      "replies": [...]
    }
  ]
}
```

### POST /deals/:id/comments
Create comment. **Requires authentication.**

**Request:**
```json
{
  "content": "Thanks for sharing!",
  "parentId": "uuid"  // Optional, for replies
}
```

**Response: (201)**
```json
{
  "id": "uuid",
  "content": "Thanks for sharing!",
  "userId": "uuid",
  "createdAt": "2025-12-14T..."
}
```

### POST /comments/:id/vote
Vote on a comment. **Requires authentication.**

**Request:**
```json
{
  "voteType": 1  // 1 for upvote, -1 for downvote
}
```

**Response: (200)**
```json
{
  "upvotes": 6,
  "downvotes": 0
}
```

---

## Search

### GET /search/deals
Search for deals using Elasticsearch.

**Query Parameters:**
- `q` (required): Search query
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `category` (optional): Filter by category
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price

**Response: (200)**
```json
{
  "deals": [...],
  "total": 42,
  "page": 1,
  "limit": 20,
  "aggregations": {
    "categories": [...],
    "priceRanges": [...]
  }
}
```

### GET /search/autocomplete
Get autocomplete suggestions.

**Query Parameters:**
- `q` (required): Search query prefix

**Response: (200)**
```json
{
  "suggestions": [
    "sony headphones",
    "sony tv",
    "sony playstation"
  ]
}
```

---

## Categories

### GET /categories
Get all categories.

**Response: (200)**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic devices and accessories",
      "icon": "electronics"
    }
  ]
}
```

---

## GDPR

### GET /gdpr/export
Export all user data. **Requires authentication.**

**Response: (200)**
```json
{
  "exportDate": "2025-12-14T...",
  "user": {...},
  "deals": [...],
  "comments": [...],
  "votes": [...],
  "activity": [...],
  "dataRetentionPolicy": {...}
}
```

### DELETE /gdpr/delete-account
Delete user account and data. **Requires authentication.**

**Response: (200)**
```json
{
  "message": "Account deleted successfully",
  "deletedAt": "2025-12-14T...",
  "dataRetention": {
    "deleted": [...],
    "anonymized": [...],
    "reason": "Community benefit and legal requirements"
  }
}
```

### GET /gdpr/data-processing-info
Get data processing information. **Requires authentication.**

**Response: (200)**
```json
{
  "dataController": {...},
  "dataCollected": {...},
  "purposeOfProcessing": [...],
  "legalBasis": "...",
  "dataRetentionPeriod": {...},
  "yourRights": [...],
  "dataSecurity": [...],
  "thirdPartySharing": {...}
}
```

---

## Health & Monitoring

### GET /health
Comprehensive health check.

**Response: (200)**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-14T...",
  "uptime": 123456,
  "services": {
    "database": {"status": "up", "responseTime": 15},
    "redis": {"status": "up", "responseTime": 5},
    "elasticsearch": {"status": "up", "responseTime": 25}
  }
}
```

### GET /health/live
Liveness probe (Kubernetes).

**Response: (200)**
```json
{
  "status": "alive"
}
```

### GET /health/ready
Readiness probe (Kubernetes).

**Response: (200)**
```json
{
  "status": "ready",
  "services": {
    "database": true,
    "redis": true,
    "elasticsearch": true
  }
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All API endpoints | 100 requests | 15 minutes |
| /auth/login | 5 attempts | 15 minutes |
| /auth/signup | 5 attempts | 15 minutes |
| /search/* | 20 requests | 1 minute |
| POST /deals | 10 deals | 1 hour |

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 14
Retry-After: 14
```

**Rate Limit Exceeded: (429)**
```json
{
  "error": "Too many requests, please try again later.",
  "retryAfter": 14
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid input",
  "details": [
    {
      "path": ["password"],
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "error": "You don't have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "error": "Not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests, please try again later.",
  "retryAfter": 14
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Error details (only in development)"
}
```

---

## Authentication Flow

### 1. Registration
```
POST /auth/signup
  ↓
Receive accessToken + refreshToken
  ↓
Store tokens securely
  ↓
(Optional) POST /auth/send-verification
```

### 2. Login
```
POST /auth/login
  ↓
Receive accessToken + refreshToken
  ↓
Store tokens securely
```

### 3. Making Authenticated Requests
```
Add header: Authorization: Bearer <accessToken>
  ↓
Make API request
  ↓
If 401 Unauthorized:
  → POST /auth/refresh with refreshToken
  → Receive new accessToken + refreshToken
  → Retry original request
```

### 4. Token Refresh
```
POST /auth/refresh
  ↓
Send refreshToken
  ↓
Receive new accessToken + refreshToken
  ↓
Update stored tokens
```

### 5. Logout
```
POST /auth/logout
  ↓
Send refreshToken
  ↓
Token revoked, user logged out
```

---

## Best Practices

### Security
1. **Always use HTTPS** in production
2. **Store tokens securely** (HttpOnly cookies or secure storage)
3. **Never expose refresh tokens** in URLs or logs
4. **Implement token rotation** - use new refresh token after each refresh
5. **Handle 401 errors** - automatically refresh tokens

### Performance
1. **Use caching** - Results are cached for performance
2. **Implement pagination** - Don't fetch all results at once
3. **Use search wisely** - Implement debouncing for autocomplete
4. **Monitor rate limits** - Check X-RateLimit headers

### Error Handling
```javascript
try {
  const response = await fetch('/api/deals', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.status === 401) {
    // Refresh token and retry
    await refreshAccessToken();
    // Retry request...
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    // Wait and retry...
  }

  const data = await response.json();
} catch (error) {
  // Handle network errors
}
```

---

**Last Updated**: December 14, 2025
**API Version**: 1.0.0
