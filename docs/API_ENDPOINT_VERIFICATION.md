# API Endpoint Verification Guide

## Problem Analysis

### Current Status
- ✅ **POST** `/api/v1/auth/login` → Works (returns JWT token)
- ❌ **GET** `/api/v1/auth/login` → 404 Not Found (expected, no GET handler)

### Why GET Returns 404

1. **Route Definition**: Only `POST /login` handler exists in `src/routes/v1/auth.ts`
   ```typescript
   authRouter.post("/login", ...)  // ✅ POST handler exists
   // ❌ No GET handler for /login
   ```

2. **Route Structure**:
   - `app.use('/api/v1', v1Router)` → `src/routes/index.ts:37`
   - `v1Router.use('/auth', authRouter)` → `src/routes/v1/index.ts:10`
   - `authRouter.post('/login', ...)` → `src/routes/v1/auth.ts:10`
   - **Full path**: `/api/v1/auth/login` ✅

3. **Ingress Configuration**: ✅ Correct
   - `/api/v1` path exists (most specific)
   - `/api` path exists (fallback)
   - `/health` and `/metrics` paths exist
   - ❌ **No catch-all `/` path** (prevents `/login` from hitting backend)

## Verification Tests

### 1. Test POST /api/v1/auth/login (Should Work)
```bash
curl -X POST https://api.poolfab.com.tr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 200 OK with JWT token
# Response: {"success":true,"token":"...","user":{...}}
```

### 2. Test GET /api/v1/auth/login (Should Return 404 or 405)
```bash
curl -X GET https://api.poolfab.com.tr/api/v1/auth/login

# Current: 404 Not Found
# Recommended: 405 Method Not Allowed with Allow: POST header
```

### 3. Test /login (Should Return 404 from Ingress)
```bash
curl -X GET https://api.poolfab.com.tr/login

# Expected: 404 Not Found (Ingress level, no matching path)
# This is correct - /login should not hit backend
```

### 4. Test Health Endpoint
```bash
curl -X GET https://api.poolfab.com.tr/health/live

# Expected: 200 OK
# Response: {"status":"alive"}
```

## Recommended Improvement

Add GET handler that returns **405 Method Not Allowed** with `Allow: POST` header for better API discoverability.

