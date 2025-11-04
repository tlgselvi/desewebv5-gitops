# API Reference - Dese EA Plan v6.8.0

**Version:** 6.8.0  
**Last Updated:** 2025-01-27  
**Base URL:** `https://api.dese.ai/api/v1` (Production) | `http://localhost:3001/api/v1` (Development)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Permissions API](#permissions-api)
3. [Privacy/GDPR API](#privacy-gdpr-api)
4. [RBAC API](#rbac-api)
5. [MCP Servers](#mcp-servers)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Versioning](#versioning)

---

## Authentication

All API endpoints require authentication via JWT Bearer token.

### Request Format

```http
Authorization: Bearer <jwt_token>
```

### Getting a Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "roles": ["user", "admin"]
  }
}
```

---

## Permissions API

### List All Permissions

```http
GET /api/v1/permissions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "resource": "finbot.accounts",
      "action": "read",
      "description": "Read access to financial accounts",
      "category": "finance",
      "createdAt": "2025-01-27T10:00:00Z",
      "updatedAt": "2025-01-27T10:00:00Z",
      "roles": [
        {
          "id": "uuid",
          "name": "finance_manager"
        }
      ]
    }
  ],
  "count": 1
}
```

**Required Permission:** `system.permissions:read`

### Get Permission by ID

```http
GET /api/v1/permissions/{id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "resource": "finbot.accounts",
    "action": "read",
    "description": "Read access to financial accounts",
    "category": "finance",
    "roles": []
  }
}
```

**Required Permission:** `system.permissions:read`

### Create Permission

```http
POST /api/v1/permissions
Authorization: Bearer <token>
Content-Type: application/json

{
  "resource": "finbot.accounts",
  "action": "read",
  "description": "Read access to financial accounts",
  "category": "finance"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "resource": "finbot.accounts",
    "action": "read",
    "description": "Read access to financial accounts",
    "category": "finance",
    "createdAt": "2025-01-27T10:00:00Z",
    "updatedAt": "2025-01-27T10:00:00Z"
  }
}
```

**Required Permission:** `system.permissions:write`

### Update Permission

```http
PUT /api/v1/permissions/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Updated description",
  "category": "analytics"
}
```

**Required Permission:** `system.permissions:write`

### Delete Permission

```http
DELETE /api/v1/permissions/{id}
Authorization: Bearer <token>
```

**Required Permission:** `system.permissions:write`

### Assign Role to Permission

```http
POST /api/v1/permissions/{permissionId}/roles/{roleId}
Authorization: Bearer <token>
```

**Required Permission:** `system.permissions:write`

### Remove Role from Permission

```http
DELETE /api/v1/permissions/{permissionId}/roles/{roleId}
Authorization: Bearer <token>
```

**Required Permission:** `system.permissions:write`

---

## Privacy/GDPR API

### Request Data Export

```http
POST /api/v1/privacy/export
Authorization: Bearer <token>
```

**Response:**
```json
{
  "ok": true,
  "fileUrl": "https://storage.example.com/exports/user-123-export.json",
  "message": "Your data export is ready"
}
```

**Required Permission:** `*:read` (own data)

### Request Data Deletion

```http
POST /api/v1/privacy/delete
Authorization: Bearer <token>
```

**Response:**
```json
{
  "ok": true,
  "message": "Your data has been deleted"
}
```

**Required Permission:** `*:delete` (own data)

### Anonymize User Data

```http
POST /api/v1/privacy/anonymize/user
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "uuid"
}
```

**Required Permission:** `system.audit:write` (admin only)

### Anonymize Old Audit Logs

```http
POST /api/v1/privacy/anonymize/old-logs
Authorization: Bearer <token>
Content-Type: application/json

{
  "retentionDays": 400
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Old audit logs anonymized",
  "retentionDays": 400,
  "rowsAffected": 1250
}
```

**Required Permission:** `system.audit:write` (admin only)

### Get Anonymization Statistics

```http
GET /api/v1/privacy/anonymize/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "totalAuditLogs": 50000,
    "anonymizedLogs": 12000,
    "logsWithUserIds": 38000,
    "logsWithIPs": 45000
  }
}
```

**Required Permission:** `system.audit:read` (admin only)

### Scheduler Management

#### Get Scheduler Status

```http
GET /api/v1/privacy/anonymize/scheduler/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "running": true,
    "intervalMs": 3600000,
    "retentionDays": 400
  }
}
```

#### Start Scheduler

```http
POST /api/v1/privacy/anonymize/scheduler/start
Authorization: Bearer <token>
```

#### Stop Scheduler

```http
POST /api/v1/privacy/anonymize/scheduler/stop
Authorization: Bearer <token>
```

---

## RBAC API

### List Roles

```http
GET /api/v1/rbac/roles
Authorization: Bearer <token>
```

### Create Role

```http
POST /api/v1/rbac/roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "finance_manager"
}
```

### Get Role Permissions

```http
GET /api/v1/rbac/roles/{id}/permissions
Authorization: Bearer <token>
```

---

## MCP Servers

### FinBot MCP Server

**Base URL:** `http://localhost:5555`

#### Health Check
```http
GET /finbot/health
```

#### Query
```http
POST /finbot/query
Content-Type: application/json

{
  "query": "Get financial accounts"
}
```

#### Correlation Run
```http
POST /finbot/correlation/run
Content-Type: application/json

{}
```

### MuBot MCP Server

**Base URL:** `http://localhost:5556`

#### Health Check
```http
GET /mubot/health
```

### DESE MCP Server

**Base URL:** `http://localhost:5557`

#### Health Check
```http
GET /dese/health
```

### Observability MCP Server

**Base URL:** `http://localhost:5558`

#### Health Check
```http
GET /observability/health
```

#### Metrics
```http
GET /observability/metrics
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "timestamp": "2025-01-27T10:00:00Z",
  "details": {
    "field": "additional context"
  }
}
```

### Common Error Codes

- `unauthenticated` (401) - Missing or invalid authentication token
- `forbidden` (403) - Insufficient permissions
- `not_found` (404) - Resource not found
- `validation_error` (400) - Request validation failed
- `internal_error` (500) - Server error

---

## Rate Limiting

API endpoints are rate-limited:

- **Authenticated users:** 100 requests/minute
- **Admin users:** 1000 requests/minute
- **MCP servers:** 1000 requests/minute

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706352000
```

---

## Versioning

API versioning is handled via URL path:

- Current version: `/api/v1`
- Future versions: `/api/v2`, `/api/v3`, etc.

Version is specified in the `apiVersion` configuration.

---

## Swagger Documentation

Interactive API documentation is available at:

- **Development:** `http://localhost:3001/api-docs`
- **Production:** `https://api.dese.ai/api-docs`

OpenAPI JSON specification:
- `/api-docs.json`

---

## Support

For API support, contact:
- **Email:** dev@dese.ai
- **Documentation:** [https://docs.dese.ai](https://docs.dese.ai)

---

**Last Updated:** 2025-01-27  
**Version:** 6.8.0

