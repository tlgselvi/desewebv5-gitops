# Authentication Guide

## Overview

Dese EA Plan API uses JWT (JSON Web Token) for authentication. All protected endpoints require a valid JWT token in the Authorization header.

## Authentication Methods

### 1. Google OAuth (Recommended for Production)

Google OAuth is the recommended authentication method for production environments.

#### Flow

1. **Initiate OAuth:**
   ```
   GET /api/v1/auth/google
   ```
   This redirects to Google's OAuth consent screen.

2. **OAuth Callback:**
   After user consent, Google redirects to:
   ```
   GET /api/v1/auth/google/callback?code=AUTHORIZATION_CODE
   ```

3. **Token Received:**
   The callback redirects to your frontend with a token:
   ```
   https://your-frontend.com/auth/callback?token=JWT_TOKEN
   ```

#### Configuration

Ensure these environment variables are set:
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `CORS_ORIGIN` - Your frontend URL for redirects

### 2. Mock Login (Development Only)

Mock login is available only in development mode or when explicitly enabled.

#### Request

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin@example.com"
}
```

#### Response

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "22222222-2222-2222-2222-222222222222",
    "email": "admin@example.com",
    "role": "admin",
    "organizationId": "11111111-1111-1111-1111-111111111111"
  },
  "warning": "This is a mock login endpoint. Use Google OAuth in production."
}
```

## Using JWT Tokens

### Token Structure

JWT tokens contain the following claims:

```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "role": "admin",
  "organizationId": "org-uuid",
  "permissions": ["admin", "mcp.dashboard.read"],
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Token Expiration

- **Default:** 24 hours
- **Configurable:** Set via `JWT_EXPIRES_IN` environment variable
- **Format:** Examples: `1h`, `24h`, `7d`

### Including Token in Requests

Add the token to the Authorization header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

Example:
```bash
curl -X GET http://localhost:3000/api/v1/finance/invoices \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Getting Current User

### Endpoint

```
GET /api/v1/auth/me
```

### Request

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response

```json
{
  "success": true,
  "user": {
    "id": "22222222-2222-2222-2222-222222222222",
    "email": "admin@example.com",
    "role": "admin",
    "organizationId": "11111111-1111-1111-1111-111111111111"
  }
}
```

## Role-Based Access Control (RBAC)

The API uses role-based access control. Common roles:

- **admin** - Full access to all modules
- **user** - Standard user access
- **viewer** - Read-only access

### Module Permissions

Each module requires specific permissions:

- `finance.read` / `finance.write`
- `crm.read` / `crm.write`
- `inventory.read` / `inventory.write`
- `iot.read` / `iot.write`
- `hr.read` / `hr.write`
- `service.read` / `service.write`

### Permission Errors

If you lack required permissions, you'll receive:

```json
{
  "error": "forbidden",
  "message": "Insufficient permissions. Required: finance.write",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Security Best Practices

1. **Never expose tokens** in client-side code or logs
2. **Use HTTPS** in production
3. **Store tokens securely** (e.g., httpOnly cookies, secure storage)
4. **Rotate tokens** regularly
5. **Validate tokens** on the client side before making requests
6. **Handle token expiration** gracefully

## Troubleshooting

### Token Expired

If your token expires, you'll receive:

```json
{
  "error": "unauthorized",
  "message": "Token expired",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Solution:** Re-authenticate to get a new token.

### Invalid Token

```json
{
  "error": "unauthorized",
  "message": "Invalid token",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Solution:** Check that:
- Token is correctly formatted
- Token hasn't been tampered with
- Token is from the correct environment

### Missing Token

```json
{
  "error": "unauthorized",
  "message": "Authentication required",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Solution:** Include the Authorization header with a valid token.

