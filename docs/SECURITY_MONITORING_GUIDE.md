# Security & Monitoring Enhancements Guide

Bu dokümantasyon, P2-08 Security & Monitoring Enhancements implementasyonunu açıklar.

## 📋 İçindekiler

1. [Security Test Suite](#security-test-suite)
2. [Advanced Rate Limiting](#advanced-rate-limiting)
3. [Business Metrics Tracking](#business-metrics-tracking)
4. [APM Integration](#apm-integration)
5. [Security Monitoring & SIEM](#security-monitoring--siem)
6. [Configuration](#configuration)
7. [Deployment](#deployment)

---

## Security Test Suite

### Genel Bakış

OWASP Top 10 güvenlik testleri ve vulnerability scanning entegrasyonu.

### Kullanım

```bash
# Tüm security testlerini çalıştır
pnpm test:security

# Belirli bir OWASP kategorisini test et
pnpm test tests/security/owasp-a01-access-control.test.ts

# Security test raporu oluştur
pnpm test:security:report
```

### Test Kategorileri

- **A01: Broken Access Control** - Yetkisiz erişim, privilege escalation, IDOR
- **A02: Cryptographic Failures** - Şifreleme, key management
- **A03: Injection** - SQL, XSS, Command injection
- **A04-A10: Diğer kategoriler** - Security design, misconfiguration, vb.

### CI/CD Entegrasyonu

GitHub Actions workflow otomatik olarak:
- Her push'da security testleri çalıştırır
- Günlük vulnerability scan yapar
- Dependency check yapar
- Raporları artifact olarak saklar

---

## Advanced Rate Limiting

### Genel Bakış

Gelişmiş rate limiting stratejileri: IP, user, organization ve endpoint bazlı.

### Kullanım

```typescript
import { rateLimitManager } from '@/services/rate-limit/rate-limit-manager.js';

// Rate limiter'ı initialize et
await rateLimitManager.initialize();

// Middleware olarak kullan
app.use(rateLimitManager.getMiddleware());
```

### Rate Limiting Stratejileri

#### 1. IP-Based Rate Limiting
```typescript
{
  keyGenerator: 'ip',
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // 100 istek
}
```

#### 2. User-Based Rate Limiting
```typescript
{
  keyGenerator: 'user',
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 1000, // 1000 istek
}
```

#### 3. Organization-Based Rate Limiting
```typescript
{
  keyGenerator: 'org',
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 5000, // Organization tier'a göre değişir
}
```

### Algoritmalar

- **Sliding Window**: En doğru, Redis sorted sets kullanır
- **Token Bucket**: Smooth rate limiting, token refill mekanizması
- **Fixed Window**: En basit, performanslı

### Endpoint-Specific Rules

`src/config/rate-limit.config.ts` dosyasında tanımlı:

```typescript
{
  endpoint: '/api/v1/auth/login',
  method: ['POST'],
  config: {
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 login attempt per 15 minutes
    keyGenerator: 'ip',
  },
  priority: 100,
}
```

### API Endpoints

- `GET /api/v1/rate-limit/status` - Mevcut rate limit durumu
- `GET /api/v1/rate-limit/violations` - Rate limit ihlalleri (admin)
- `GET /api/v1/rate-limit/stats` - İstatistikler (admin)

---

## Business Metrics Tracking

### Genel Bakış

İş metrikleri takibi: Revenue, user growth, retention, churn.

### Metrikler

#### Revenue Metrics
- **MRR** (Monthly Recurring Revenue)
- **ARR** (Annual Recurring Revenue)
- **Growth Rate** (Aylık büyüme oranı)

#### User Metrics
- **DAU** (Daily Active Users)
- **MAU** (Monthly Active Users)
- **WAU** (Weekly Active Users)
- **Growth Rate** (Kullanıcı büyüme oranı)
- **Retention Rate** (Kullanıcı tutma oranı)
- **Churn Rate** (Kullanıcı kaybı)

### API Endpoints

- `GET /api/v1/analytics/business-metrics` - Tüm metrikler
- `GET /api/v1/analytics/revenue` - Revenue metrikleri
- `GET /api/v1/analytics/users` - User metrikleri
- `GET /api/v1/analytics/features` - Feature adoption metrikleri

### Kullanım

```typescript
import { businessMetricsService } from '@/services/analytics/business-metrics.service.js';

// MRR hesapla
const mrr = await businessMetricsService.calculateMRR();

// ARR hesapla
const arr = await businessMetricsService.calculateARR();

// User growth rate
const growthRate = await businessMetricsService.calculateUserGrowthRate('monthly');

// Churn rate
const churnRate = await businessMetricsService.calculateChurnRate('monthly');
```

---

## APM Integration

### Genel Bakış

Application Performance Monitoring entegrasyonu: OpenTelemetry, Datadog, New Relic.

### Configuration

```env
APM_ENABLED=true
APM_PROVIDER=opentelemetry  # opentelemetry, datadog, newrelic
APM_SERVICE_NAME=dese-ea-plan
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

### OpenTelemetry

OpenTelemetry SDK otomatik olarak:
- HTTP request tracing
- Database query tracing
- Error tracking
- Performance metrics

### Datadog

```env
APM_PROVIDER=datadog
DD_SERVICE=dese-ea-plan
DD_ENV=production
DD_APM_ENABLED=true
```

### New Relic

```env
APM_PROVIDER=newrelic
NEW_RELIC_LICENSE_KEY=your-license-key
NEW_RELIC_APP_NAME=dese-ea-plan
```

### Kullanım

```typescript
import { apmService } from '@/services/monitoring/apm-service.js';

// Initialize
await apmService.initialize();

// Create span
const span = apmService.startSpan('operation-name', { tag: 'value' });

// End span
apmService.endSpan(span);

// Record error
apmService.recordError(error, { context: 'value' });
```

---

## Security Monitoring & SIEM

### Genel Bakış

Security event logging ve SIEM entegrasyonu.

### Security Event Types

- `authentication.failed` - Başarısız giriş
- `authentication.success` - Başarılı giriş
- `authorization.failed` - Yetkilendirme hatası
- `rate_limit.exceeded` - Rate limit aşımı
- `suspicious_activity` - Şüpheli aktivite
- `sql_injection.attempt` - SQL injection denemesi
- `xss.attempt` - XSS denemesi
- `brute_force.attempt` - Brute force denemesi

### Kullanım

```typescript
import { securityMonitoringService } from '@/services/monitoring/security-monitoring.service.js';

// Log authentication failure
await securityMonitoringService.logAuthenticationFailure(req, 'Invalid password');

// Log authorization failure
await securityMonitoringService.logAuthorizationFailure(req, 'admin', 'user');

// Log rate limit violation
await securityMonitoringService.logRateLimitViolation(req, 'ip:192.168.1.1', 100, 101);

// Log suspicious activity
await securityMonitoringService.logSuspiciousActivity(req, 'Multiple failed logins', {
  attempts: 10,
  timeWindow: '5 minutes',
});
```

### SIEM Entegrasyonu

```env
SIEM_ENABLED=true
SIEM_PROVIDER=splunk  # splunk, elk, datadog
SIEM_ENDPOINT=https://siem.example.com/api/events
```

---

## Configuration

### Environment Variables

#### Rate Limiting
```env
ADVANCED_RATE_LIMIT_ENABLED=true
REDIS_URL=redis://localhost:6379
DISABLE_RATE_LIMIT=false
```

#### APM
```env
APM_ENABLED=true
APM_PROVIDER=opentelemetry
APM_SERVICE_NAME=dese-ea-plan
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

#### Security Monitoring
```env
SIEM_ENABLED=true
SIEM_PROVIDER=splunk
SIEM_ENDPOINT=https://siem.example.com/api/events
```

### Rate Limit Configuration

`src/config/rate-limit.config.ts` dosyasında endpoint-specific rules tanımlanır.

### Business Metrics Configuration

Business metrics otomatik olarak subscription ve user tablolarından hesaplanır.

---

## Deployment

### Prerequisites

- Redis (rate limiting için)
- PostgreSQL (tracking için)
- OpenTelemetry Collector (APM için, opsiyonel)

### Docker Compose

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  otel-collector:
    image: otel/opentelemetry-collector:latest
    ports:
      - "4317:4317"  # gRPC
      - "4318:4318"  # HTTP
```

### Kubernetes

Rate limiting ve APM için gerekli ConfigMaps ve Secrets oluşturulmalı.

### Health Checks

- Rate limiting: Redis bağlantısı kontrol edilir
- APM: Provider bağlantısı kontrol edilir
- Security monitoring: Database bağlantısı kontrol edilir

---

## Troubleshooting

### Rate Limiting Çalışmıyor

1. Redis bağlantısını kontrol et
2. `ADVANCED_RATE_LIMIT_ENABLED=true` olduğundan emin ol
3. Logları kontrol et: `logger.info('Rate limit manager initialized')`

### APM Verileri Görünmüyor

1. `APM_ENABLED=true` olduğundan emin ol
2. OpenTelemetry Collector çalışıyor mu kontrol et
3. Endpoint URL'lerini kontrol et

### Security Events Loglanmıyor

1. Database bağlantısını kontrol et
2. `SIEM_ENABLED=true` olduğundan emin ol
3. SIEM endpoint'ini kontrol et

---

## Best Practices

1. **Rate Limiting**: Production'da Redis cluster kullan
2. **APM**: Sampling rate'i ayarla (production'da %10-20)
3. **Security Monitoring**: Critical event'ler için alerting kur
4. **Business Metrics**: Cache kullan (1 saat TTL)
5. **Testing**: Security testleri CI/CD'de zorunlu yap

---

## Support

Sorular için:
- GitHub Issues
- Internal Slack: #security-monitoring
- Email: security@dese.ai

