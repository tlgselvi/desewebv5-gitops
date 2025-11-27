# Security & Monitoring Deployment Guide

Bu guide, Security & Monitoring enhancements'ın production'a deploy edilmesi için adımları içerir.

## 📋 Prerequisites

- Redis (rate limiting için)
- PostgreSQL (tracking için)
- OpenTelemetry Collector (APM için, opsiyonel)
- Docker & Kubernetes (production için)

## 🚀 Deployment Steps

### 1. Environment Variables

`.env` dosyasına ekleyin:

```env
# Rate Limiting
ADVANCED_RATE_LIMIT_ENABLED=true
REDIS_URL=redis://redis:6379

# APM
APM_ENABLED=true
APM_PROVIDER=opentelemetry
APM_SERVICE_NAME=dese-ea-plan
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318/v1/traces

# Security Monitoring
SIEM_ENABLED=true
SIEM_PROVIDER=splunk
SIEM_ENDPOINT=https://siem.example.com/api/events
```

### 2. Database Migrations

Rate limit tracking table'ı oluşturun:

```bash
pnpm db:generate
pnpm db:migrate
```

### 3. Redis Setup

#### Docker Compose
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
```

#### Kubernetes
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
data:
  redis.conf: |
    appendonly yes
```

### 4. OpenTelemetry Collector Setup

#### Docker Compose
```yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector:latest
    ports:
      - "4317:4317"  # gRPC
      - "4318:4318"  # HTTP
    volumes:
      - ./observability/otel-collector-config.yaml:/etc/otel-collector-config.yaml
    command: ["--config=/etc/otel-collector-config.yaml"]
```

### 5. Application Deployment

#### Docker
```bash
docker build -t dese-ea-plan:latest .
docker run -d \
  --env-file .env \
  --link redis:redis \
  --link otel-collector:otel-collector \
  dese-ea-plan:latest
```

#### Kubernetes
```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
```

### 6. Health Checks

```bash
# Rate limiting health
curl http://localhost:3000/health/rate-limit

# APM health
curl http://localhost:3000/health/apm

# Security monitoring health
curl http://localhost:3000/health/security
```

## 🔍 Verification

### Rate Limiting
1. Rate limit API'yi test et:
```bash
curl http://localhost:3000/api/v1/rate-limit/status
```

2. Rate limit violation'ları kontrol et:
```bash
curl http://localhost:3000/api/v1/rate-limit/violations
```

### APM
1. APM traces görünüyor mu kontrol et (Jaeger/Tempo UI)
2. Metrics görünüyor mu kontrol et (Prometheus/Grafana)

### Security Monitoring
1. Security events loglanıyor mu kontrol et:
```bash
# Database'de kontrol
SELECT * FROM security_events ORDER BY created_at DESC LIMIT 10;
```

2. SIEM'e gönderiliyor mu kontrol et (SIEM dashboard)

## 🐛 Troubleshooting

### Rate Limiting Çalışmıyor
- Redis bağlantısını kontrol et
- `ADVANCED_RATE_LIMIT_ENABLED=true` olduğundan emin ol
- Logları kontrol et

### APM Verileri Görünmüyor
- OpenTelemetry Collector çalışıyor mu?
- Endpoint URL'leri doğru mu?
- Network connectivity kontrol et

### Security Events Loglanmıyor
- Database bağlantısını kontrol et
- SIEM endpoint erişilebilir mi?
- Logları kontrol et

## 📊 Monitoring

### Metrics to Monitor
- Rate limit hit rate
- APM trace count
- Security event count
- Error rates

### Alerts
- Rate limit violations > threshold
- APM errors > threshold
- Critical security events
- Redis connection failures

## 🔄 Rollback Plan

Eğer sorun çıkarsa:

1. Environment variable'ları disable et:
```env
ADVANCED_RATE_LIMIT_ENABLED=false
APM_ENABLED=false
SIEM_ENABLED=false
```

2. Application'ı restart et

3. Sorunları çöz ve tekrar enable et

## 📝 Post-Deployment Checklist

- [ ] Rate limiting çalışıyor
- [ ] APM verileri görünüyor
- [ ] Security events loglanıyor
- [ ] Health checks başarılı
- [ ] Metrics görünüyor
- [ ] Alerts çalışıyor
- [ ] Documentation güncel

