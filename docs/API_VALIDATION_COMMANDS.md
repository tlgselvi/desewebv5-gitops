# API Doğrulama Komutları

Bu dokümanda, Dese EA Plan v6.8.2 API'sinin temel endpoint'lerini doğrulamak için curl komutları bulunmaktadır.

**Base URL:** 
- **Local:** `http://localhost:3000`
- **Production:** `https://api.poolfab.com.tr`

---

## 1. API Root Endpoint

API'nin temel bilgilerini döner.

```bash
# Local
curl -X GET http://localhost:3000/api/v1

# Production
curl -X GET https://api.poolfab.com.tr/api/v1
```

**Beklenen Yanıt:**
```json
{
  "name": "Dese EA Plan v6.8.1 API",
  "version": "6.8.1",
  "description": "CPT Optimization Domain için Kubernetes + GitOps + AIOps uyumlu kurumsal planlama API",
  "environment": "production",
  "timestamp": "2025-01-27T...",
  "endpoints": {
    "projects": "/api/v1/projects",
    "seo": "/api/v1/seo",
    "content": "/api/v1/content",
    "analytics": "/api/v1/analytics",
    "aiops": "/api/v1/aiops",
    "metrics": "/metrics",
    "aiopsMetrics": "/metrics/aiops",
    "health": "/health",
    "docs": "/api-docs"
  }
}
```

---

## 2. POST /api/v1/auth/login

**NOT:** Bu endpoint sadece **development/test** ortamlarında çalışır. Production'da 403 döner.

### Mock Login (Development/Test Only)

```bash
# Local - Mock login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@poolfab.com.tr"
  }'
```

**Beklenen Yanıt (Development):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "mock-user",
    "email": "admin@poolfab.com.tr",
    "role": "admin"
  },
  "warning": "This is a mock login endpoint. Use Google OAuth in production."
}
```

**Production'da Beklenen Yanıt (403):**
```json
{
  "success": false,
  "error": "mock_login_disabled",
  "message": "Mock login is disabled in production. Please use Google OAuth.",
  "availableMethods": ["google"],
  "googleOAuthUrl": "/api/v1/auth/google"
}
```

### GET /api/v1/auth/login (Method Not Allowed)

```bash
# Local
curl -X GET http://localhost:3000/api/v1/auth/login

# Production
curl -X GET https://api.poolfab.com.tr/api/v1/auth/login
```

**Beklenen Yanıt (405):**
```json
{
  "success": false,
  "error": "method_not_allowed",
  "message": "GET method is not allowed for this endpoint. Use POST method.",
  "allowedMethods": ["POST"],
  "endpoint": "/api/v1/auth/login"
}
```

---

## 3. Google OAuth Login

### Initiate Google OAuth

```bash
# Local
curl -X GET http://localhost:3000/api/v1/auth/google \
  -v

# Production
curl -X GET https://api.poolfab.com.tr/api/v1/auth/google \
  -v
```

**Beklenen:** 302 Redirect to Google OAuth consent screen

### Google OAuth Callback

```bash
# Local - Callback URL (Google redirects here)
curl -X GET "http://localhost:3000/api/v1/auth/google/callback?code=AUTHORIZATION_CODE" \
  -v

# Production - Callback URL
curl -X GET "https://api.poolfab.com.tr/api/v1/auth/google/callback?code=AUTHORIZATION_CODE" \
  -v
```

**Beklenen:** 302 Redirect to frontend with token: `${CORS_ORIGIN}/auth/callback?token=JWT_TOKEN`

---

## 4. Get Current User (/api/v1/auth/me)

JWT token veya Passport session ile kullanıcı bilgilerini döner.

```bash
# With JWT Token (Authorization Header)
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# With Cookie Session (after OAuth login)
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Cookie: dese-session=SESSION_COOKIE_VALUE"
```

**Beklenen Yanıt (200):**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

**Beklenen Yanıt (401 - Unauthenticated):**
```json
{
  "success": false,
  "error": "Not authenticated"
}
```

---

## 5. Health Check Endpoints

### /health/live (Liveness Probe)

```bash
# Local
curl -X GET http://localhost:3000/health/live

# Production
curl -X GET https://api.poolfab.com.tr/health/live
```

**Beklenen Yanıt (200):**
```json
{
  "status": "alive",
  "timestamp": "2025-01-27T..."
}
```

### /health/ready (Readiness Probe)

```bash
# Local
curl -X GET http://localhost:3000/health/ready

# Production
curl -X GET https://api.poolfab.com.tr/health/ready
```

**Beklenen Yanıt (200):**
```json
{
  "status": "ready",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2025-01-27T..."
}
```

### /health (Full Health Check)

```bash
# Local
curl -X GET http://localhost:3000/health

# Production
curl -X GET https://api.poolfab.com.tr/health
```

---

## 6. Metrics Endpoint

Prometheus metrics endpoint'i.

```bash
# Local
curl -X GET http://localhost:3000/metrics

# Production
curl -X GET https://api.poolfab.com.tr/metrics
```

**Beklenen Yanıt:** Prometheus metrics formatında metrikler (text/plain)

**Örnek:**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1250
http_requests_total{method="POST",status="201"} 342
...
```

### AIOps Metrics

```bash
# Local
curl -X GET http://localhost:3000/metrics/aiops

# Production
curl -X GET https://api.poolfab.com.tr/metrics/aiops
```

---

## 7. WebSocket Authentication

WebSocket bağlantısı için JWT token ile authentication.

### WebSocket Connection with Authentication

```bash
# wscat kullanarak (npm install -g wscat)
wscat -c ws://localhost:3000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Alternatif olarak Node.js script:**

```javascript
const WebSocket = require('ws');

const token = 'YOUR_JWT_TOKEN';
const ws = new WebSocket('ws://localhost:3000', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Or send auth message after connection
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: token
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
  
  if (message.type === 'auth_success') {
    console.log('Authenticated as:', message.email);
    
    // Subscribe to topic
    ws.send(JSON.stringify({
      type: 'subscribe',
      topic: 'notifications'
    }));
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

**curl ile WebSocket test (limited):**

```bash
# WebSocket upgrade request (not full WebSocket client)
curl -X GET http://localhost:3000 \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -v
```

**NOT:** Tam WebSocket test için `wscat`, `websocat` veya Node.js WebSocket client kullanın.

### WebSocket Authentication Flow

1. **Connect to WebSocket:**
   ```javascript
   const ws = new WebSocket('ws://localhost:3000');
   ```

2. **Send Authentication Message:**
   ```javascript
   ws.send(JSON.stringify({
     type: 'auth',
     token: 'YOUR_JWT_TOKEN'
   }));
   ```

3. **Receive Authentication Response:**
   ```json
   {
     "type": "auth_success",
     "userId": "user-id",
     "email": "user@example.com",
     "role": "admin"
   }
   ```
   veya
   ```json
   {
     "type": "auth_error",
     "error": "Invalid or expired token"
   }
   ```

4. **Subscribe to Topics:**
   ```javascript
   ws.send(JSON.stringify({
     type: 'subscribe',
     topic: 'notifications'
   }));
   ```

---

## 8. Örnek Test Senaryosu

Tüm endpoint'leri sırayla test eden script:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"
API_URL="${BASE_URL}/api/v1"

echo "=== 1. Testing API Root ==="
curl -X GET "${API_URL}" | jq '.'

echo -e "\n=== 2. Testing GET /api/v1/auth/login (should return 405) ==="
curl -X GET "${API_URL}/auth/login" | jq '.'

echo -e "\n=== 3. Testing POST /api/v1/auth/login (mock login - dev only) ==="
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@poolfab.com.tr"}')

echo "$LOGIN_RESPONSE" | jq '.'

# Extract token if login successful
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')

if [ -n "$TOKEN" ]; then
  echo -e "\n=== 4. Testing GET /api/v1/auth/me with token ==="
  curl -X GET "${API_URL}/auth/me" \
    -H "Authorization: Bearer ${TOKEN}" | jq '.'
fi

echo -e "\n=== 5. Testing Health Check ==="
curl -X GET "${BASE_URL}/health/live" | jq '.'

echo -e "\n=== 6. Testing Metrics ==="
curl -X GET "${BASE_URL}/metrics" | head -20

echo -e "\n=== Test Complete ==="
```

---

## 9. Production vs Development Davranış Farkları

| Endpoint | Development | Production |
|----------|------------|------------|
| `POST /api/v1/auth/login` | ✅ Mock login çalışır | ❌ 403 döner, Google OAuth kullanılmalı |
| `GET /api/v1/auth/login` | ✅ 405 döner | ✅ 405 döner |
| `GET /api/v1/auth/google` | ✅ Çalışır (config gerektirir) | ✅ Çalışır (config gerektirir) |
| `/health/*` | ✅ Çalışır | ✅ Çalışır |
| `/metrics` | ✅ Çalışır | ✅ Çalışır |
| WebSocket | ✅ Token ile auth | ✅ Token ile auth |

---

## 10. Hata Kodları

| Status Code | Anlamı | Örnek |
|-------------|--------|-------|
| 200 | Başarılı | Normal yanıt |
| 302 | Redirect | Google OAuth redirect |
| 400 | Bad Request | Geçersiz request body |
| 401 | Unauthorized | Token yok veya geçersiz |
| 403 | Forbidden | Mock login production'da disabled |
| 404 | Not Found | Endpoint bulunamadı |
| 405 | Method Not Allowed | GET yerine POST kullanılmalı |
| 500 | Internal Server Error | Sunucu hatası |

---

## Notlar

- **Mock Login:** Sadece `NODE_ENV !== "production"` ortamlarında çalışır
- **Google OAuth:** `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` env variable'ları gerektirir
- **JWT Token:** 1 saat veya `JWT_EXPIRES_IN` env variable'ında belirtilen süre boyunca geçerlidir
- **Cookie Session:** 24 saat boyunca geçerlidir (`maxAge: 24 * 60 * 60 * 1000`)
- **CORS:** Production'da `CORS_ORIGIN` env variable'ından alınan origin'ler kabul edilir

