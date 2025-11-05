# 🧪 Test Dokümantasyonu - Dese EA Plan v6.8.0

**Version:** 6.8.0  
**Last Update:** 2025-01-27

---

## 📋 Test Yapısı

### Test Klasör Yapısı

```
tests/
├── setup.ts                          # Test setup ve teardown
├── mcp/
│   ├── finbot-server.test.ts         # FinBot MCP Server testleri
│   ├── observability-server.test.ts  # Observability MCP Server testleri
│   └── context-aggregator.test.ts   # Context aggregation testleri
├── routes/
│   └── health.test.ts                # Health route testleri
├── services/
│   ├── redis.test.ts                 # Redis client testleri
│   └── aiops/
│       └── anomalyScorer.test.ts    # Anomaly scorer testleri
├── middleware/
│   └── auth.test.ts                  # Authentication middleware testleri
└── websocket/
    └── gateway.test.ts               # WebSocket gateway testleri
```

---

## 🚀 Test Komutları

### Temel Komutlar

```bash
# Tüm testleri çalıştır
pnpm test

# Watch mode (geliştirme için)
pnpm test --watch

# UI ile çalıştır (interaktif)
pnpm test:ui

# Coverage raporu ile çalıştır
pnpm test:coverage

# Belirli bir test dosyasını çalıştır
pnpm test tests/routes/health.test.ts

# Belirli bir test pattern'i ile çalıştır
pnpm test -t "health"
```

---

## 📊 Test Kapsamı

### ✅ Tamamlanan Testler

1. **Test Setup** (`tests/setup.ts`)
   - Redis connection setup
   - Test environment variables
   - Cleanup utilities

2. **Redis Client Tests** (`tests/services/redis.test.ts`)
   - Connection test
   - Set/Get operations
   - TTL operations

3. **Health Routes** (`tests/routes/health.test.ts`)
   - Health endpoint
   - Ready endpoint
   - Live endpoint

4. **Authentication Middleware** (`tests/middleware/auth.test.ts`)
   - JWT token validation
   - Invalid token handling
   - Expired token handling

5. **Anomaly Scorer** (`tests/services/aiops/anomalyScorer.test.ts`)
   - Score calculation
   - Score bounds (0-100)
   - Zero baseline handling

6. **Context Aggregator** (`tests/mcp/context-aggregator.test.ts`)
   - Multi-module aggregation
   - Priority-based selection
   - Missing module handling

7. **WebSocket Gateway** (`tests/websocket/gateway.test.ts`)
   - Placeholder tests (to be implemented)

8. **MCP Servers** (`tests/mcp/*.test.ts`)
   - Placeholder tests (to be implemented)

---

## 🔄 Test Coverage Hedefleri

- **Branches:** 80%
- **Functions:** 80%
- **Lines:** 80%
- **Statements:** 80%

---

## 🛠️ Test Gereksinimleri

### Gerekli Servisler

1. **Redis** (Opsiyonel)
   - Test Redis bağlantısı için
   - Yoksa testler skip edilir

2. **PostgreSQL** (Opsiyonel)
   - Database testleri için
   - Yoksa testler skip edilir

### Environment Variables

```env
NODE_ENV=test
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://dese:dese123@localhost:5432/dese_ea_plan_v5_test
JWT_SECRET=test-jwt-secret-key-min-32-chars-for-testing
```

---

## 📝 Test Yazma Rehberi

### Test Dosyası Şablonu

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Component Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Mock Kullanımı

```typescript
// Mock a module
vi.mock('@/services/storage/redisClient.js', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
  },
}));

// Mock a function
const mockFunction = vi.fn();
mockFunction.mockReturnValue('mocked value');
```

---

## 🐛 Troubleshooting

### Redis Connection Failed

**Sorun:** `Redis connection failed`

**Çözüm:**
- Redis'in çalıştığından emin olun
- `REDIS_URL` environment variable'ını kontrol edin
- Testler Redis olmadan da çalışabilir (skip edilir)

### Test Timeout

**Sorun:** Test timeout hatası

**Çözüm:**
- `vitest.config.ts` içindeki `testTimeout` değerini artırın
- Async işlemler için `await` kullanın

### Module Not Found

**Sorun:** Import hatası

**Çözüm:**
- Path alias'ları kontrol edin (`@/` prefix)
- `vitest.config.ts` içindeki `resolve.alias` ayarlarını kontrol edin

---

## 📈 Coverage Raporu

Coverage raporu oluşturmak için:

```bash
pnpm test:coverage
```

Rapor `coverage/` klasöründe oluşturulur:
- `coverage/index.html` - HTML rapor
- `coverage/coverage-final.json` - JSON rapor

---

## 🔜 Sonraki Adımlar

1. **Integration Testleri**
   - MCP server integration tests
   - Database integration tests
   - Redis integration tests

2. **E2E Testleri**
   - Playwright testleri
   - API endpoint testleri
   - WebSocket connection testleri

3. **Performance Testleri**
   - Load testing
   - Stress testing
   - Memory leak testing

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

