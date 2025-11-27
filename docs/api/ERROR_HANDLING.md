# Error Handling Guide

## Overview

All API errors follow a consistent format to make error handling predictable and straightforward.

## Error Response Format

All errors return a JSON object with the following structure:

```json
{
  "error": "error_type",
  "message": "Human-readable error message",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {}
}
```

## HTTP Status Codes

### Success Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content to return

### Client Error Codes

- `400 Bad Request` - Invalid request data or validation error
- `401 Unauthorized` - Authentication required or token invalid
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `405 Method Not Allowed` - HTTP method not allowed for endpoint
- `409 Conflict` - Resource conflict (e.g., duplicate entry)
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded

### Server Error Codes

- `500 Internal Server Error` - Unexpected server error
- `503 Service Unavailable` - Service temporarily unavailable

## Common Error Types

### 400 Bad Request

**Validation Error:**
```json
{
  "error": "validation_error",
  "message": "Invalid request data",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "field": "email",
    "reason": "Invalid email format"
  }
}
```

**Missing Required Field:**
```json
{
  "error": "missing_field",
  "message": "Required field 'name' is missing",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "field": "name"
  }
}
```

### 401 Unauthorized

**Missing Token:**
```json
{
  "error": "unauthorized",
  "message": "Authentication required",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Invalid Token:**
```json
{
  "error": "unauthorized",
  "message": "Invalid token",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Expired Token:**
```json
{
  "error": "unauthorized",
  "message": "Token expired",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 403 Forbidden

**Insufficient Permissions:**
```json
{
  "error": "forbidden",
  "message": "Insufficient permissions. Required: finance.write",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "required": "finance.write",
    "current": "finance.read"
  }
}
```

**Module Access Denied:**
```json
{
  "error": "forbidden",
  "message": "Access denied to module: finance",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 404 Not Found

**Resource Not Found:**
```json
{
  "error": "not_found",
  "message": "Resource not found",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "resource": "invoice",
    "id": "uuid-here"
  }
}
```

### 429 Too Many Requests

**Rate Limit Exceeded:**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later.",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "limit": 100,
    "window": "15 minutes",
    "retryAfter": 300
  }
}
```

Response headers include:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets
- `Retry-After`: Seconds to wait before retrying

### 500 Internal Server Error

**Unexpected Error:**
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Handling Best Practices

### 1. Always Check Status Codes

```javascript
const response = await fetch('/api/v1/finance/invoices', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

if (!response.ok) {
  const error = await response.json();
  // Handle error
}
```

### 2. Handle Specific Error Types

```javascript
try {
  const response = await fetch('/api/v1/finance/invoices', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    
    switch (error.error) {
      case 'unauthorized':
        // Redirect to login
        break;
      case 'forbidden':
        // Show permission error
        break;
      case 'validation_error':
        // Show validation errors
        break;
      default:
        // Show generic error
    }
  }
} catch (error) {
  // Handle network errors
}
```

### 3. Retry on Rate Limit

```javascript
async function makeRequest(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }
    
    return response;
  }
  
  throw new Error('Rate limit exceeded after retries');
}
```

### 4. Validate Before Sending

```javascript
function validateInvoice(data) {
  const errors = [];
  
  if (!data.accountId) {
    errors.push('accountId is required');
  }
  
  if (!data.items || data.items.length === 0) {
    errors.push('items array is required');
  }
  
  return errors;
}

const errors = validateInvoice(invoiceData);
if (errors.length > 0) {
  // Show validation errors before sending
  return;
}
```

## Zod Validation Errors

When using Zod schemas, validation errors are returned in a structured format:

```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": {
    "issues": [
      {
        "path": ["email"],
        "message": "Invalid email format"
      },
      {
        "path": ["age"],
        "message": "Expected number, received string"
      }
    ]
  }
}
```

## Network Errors

Network errors (connection failures, timeouts) should be handled separately:

```javascript
try {
  const response = await fetch('/api/v1/finance/invoices');
  // Handle response
} catch (error) {
  if (error instanceof TypeError) {
    // Network error
    console.error('Network error:', error.message);
  } else {
    // Other error
    console.error('Error:', error);
  }
}
```

## Debugging Tips

1. **Check Response Headers:** Error details may be in headers
2. **Log Full Response:** Log the entire error object for debugging
3. **Check Timestamp:** Verify if error is recent or cached
4. **Validate Token:** Ensure token is valid and not expired
5. **Check Permissions:** Verify user has required permissions
6. **Review Request:** Ensure request format matches API documentation

## Error Recovery

### Automatic Retry

For transient errors (500, 503), implement exponential backoff:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      if (response.status >= 500 && i < maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
```

### User Feedback

Always provide clear, actionable error messages to users:

```javascript
function getErrorMessage(error) {
  switch (error.error) {
    case 'unauthorized':
      return 'Please log in to continue';
    case 'forbidden':
      return 'You do not have permission to perform this action';
    case 'validation_error':
      return 'Please check your input and try again';
    case 'rate_limit_exceeded':
      return 'Too many requests. Please wait a moment and try again';
    default:
      return 'An error occurred. Please try again later';
  }
}
```

