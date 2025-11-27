# API Getting Started Guide

## Overview

Dese EA Plan v7.0 Enterprise API provides comprehensive endpoints for managing Finance, CRM, Inventory, IoT, HR, and Service modules. This guide will help you get started with the API.

## Base URL

- **Development:** `http://localhost:3000`
- **Production:** `https://api.dese.ai`

## API Version

All API endpoints are versioned under `/api/v1/`.

## Authentication

The API uses JWT (JSON Web Token) authentication. You need to include a valid JWT token in the Authorization header for all protected endpoints.

### Getting a Token

#### Option 1: Google OAuth (Production)

1. Navigate to: `GET /api/v1/auth/google`
2. Complete Google OAuth flow
3. You will be redirected with a token in the URL parameter

#### Option 2: Mock Login (Development Only)

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@example.com"}'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "22222222-2222-2222-2222-222222222222",
    "email": "admin@example.com",
    "role": "admin",
    "organizationId": "11111111-1111-1111-1111-111111111111"
  }
}
```

### Using the Token

Include the token in the Authorization header:

```bash
curl -X GET http://localhost:3000/api/v1/finance/invoices \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## API Documentation

Interactive API documentation is available at:
- **Swagger UI:** `http://localhost:3000/api-docs`
- **OpenAPI JSON:** `http://localhost:3000/api-docs.json`

## Common Use Cases

### 1. Create an Invoice

```bash
curl -X POST http://localhost:3000/api/v1/finance/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "uuid-here",
    "type": "sales",
    "items": [
      {
        "description": "Product A",
        "quantity": 2,
        "unitPrice": 100.00,
        "taxRate": 18
      }
    ]
  }'
```

### 2. Get Stock Levels

```bash
curl -X GET http://localhost:3000/api/v1/inventory/levels \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get IoT Devices

```bash
curl -X GET http://localhost:3000/api/v1/iot/devices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "error_type",
  "message": "Human-readable error message",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {}
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API requests are rate-limited to prevent abuse:
- **Window:** 15 minutes
- **Max Requests:** 100 per window per IP

Rate limit headers are included in responses:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Remaining requests in window
- `X-RateLimit-Reset` - Time when limit resets

## Multi-tenancy

All API endpoints are multi-tenant aware. The system automatically filters data based on your organization ID from the JWT token. You don't need to specify `organizationId` in requests - it's automatically extracted from your authentication token.

## Next Steps

- Read the [Authentication Guide](./AUTHENTICATION.md)
- Check [Common Use Cases](./COMMON_USE_CASES.md)
- Review [Error Handling Guide](./ERROR_HANDLING.md)
- Explore [Integration Guides](../integrations/)

