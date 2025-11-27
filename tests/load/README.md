# 📊 Load Testing Suite - DESE EA PLAN v7.0

## 📋 İçindekiler

1. [Kurulum](#kurulum)
2. [Test Senaryoları](#test-senaryoları)
3. [Çalıştırma](#çalıştırma)
4. [Sonuçları Yorumlama](#sonuçları-yorumlama)
5. [Thresholds](#thresholds)

---

## 🛠️ Kurulum

### k6 Kurulumu

```bash
# Windows (Chocolatey)
choco install k6

# macOS (Homebrew)
brew install k6

# Linux (apt)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

---

## 🎯 Test Senaryoları

### 1. API Smoke Test (`api-smoke.k6.js`)
- **Amaç:** Temel API endpoint'lerinin çalıştığını doğrulama
- **VUs:** 1
- **Duration:** 1 dakika
- **Kullanım:** CI/CD pipeline'da her deployment'tan önce

### 2. API Load Test (`api-load.k6.js`)
- **Amaç:** Normal yük altında performans ölçümü
- **VUs:** 50-100
- **Duration:** 10 dakika
- **Kullanım:** Haftalık performance regression testing

### 3. Stress Test (`stress-test.k6.js`)
- **Amaç:** Sistemin kırılma noktasını bulma
- **VUs:** 100 → 500 → 100
- **Duration:** 15 dakika
- **Kullanım:** Major release öncesi

### 4. Spike Test (`spike-test.k6.js`)
- **Amaç:** Ani yük artışlarına tepkiyi ölçme
- **VUs:** 10 → 200 → 10 (ani)
- **Duration:** 5 dakika
- **Kullanım:** Auto-scaling validation

### 5. Soak Test (`soak-test.k6.js`)
- **Amaç:** Uzun süreli yük altında memory leak tespiti
- **VUs:** 50
- **Duration:** 2 saat
- **Kullanım:** Release öncesi (gece çalıştırılır)

### 6. MCP Server Load Test (`mcp-load.k6.js`)
- **Amaç:** MCP sunucularının performansını ölçme
- **VUs:** 30
- **Duration:** 5 dakika
- **Kullanım:** MCP deployment sonrası

---

## ▶️ Çalıştırma

### Temel Kullanım

```bash
# Smoke test
k6 run tests/load/api-smoke.k6.js

# Load test
k6 run tests/load/api-load.k6.js

# Stress test
k6 run tests/load/stress-test.k6.js

# Spike test
k6 run tests/load/spike-test.k6.js

# MCP load test
k6 run tests/load/mcp-load.k6.js
```

### Environment Variables ile

```bash
# Custom BASE_URL
k6 run -e BASE_URL=https://api.poolfab.com/api/v1 tests/load/api-load.k6.js

# Auth token ile
k6 run -e AUTH_TOKEN=your-jwt-token tests/load/api-load.k6.js
```

### JSON Output ile

```bash
k6 run --out json=results.json tests/load/api-load.k6.js
```

### HTML Report (k6-reporter)

```bash
k6 run --out 'web-dashboard=export=html-report.html' tests/load/api-load.k6.js
```

---

## 📈 Sonuçları Yorumlama

### Kritik Metrikler

| Metrik | Açıklama | Hedef |
|--------|----------|-------|
| `http_req_duration` | İstek süresi | p95 < 500ms |
| `http_reqs` | Toplam istek sayısı | - |
| `http_req_failed` | Başarısız istekler | < 1% |
| `vus` | Eşzamanlı kullanıcılar | - |
| `iterations` | Tamamlanan iterasyonlar | - |

### Performance Grades

| Grade | p95 Latency | Error Rate |
|-------|-------------|------------|
| 🟢 Excellent | < 200ms | < 0.1% |
| 🟡 Good | 200-500ms | 0.1-1% |
| 🟠 Acceptable | 500ms-1s | 1-5% |
| 🔴 Poor | > 1s | > 5% |

---

## 🎯 Thresholds

### Default Thresholds

```javascript
thresholds: {
  // Request duration
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  
  // Error rate
  http_req_failed: ['rate<0.01'],
  
  // Custom metrics
  'http_req_duration{endpoint:api}': ['p(95)<300'],
  'http_req_duration{endpoint:mcp}': ['p(95)<200'],
}
```

### SLO-Based Thresholds

| SLO | Threshold |
|-----|-----------|
| Availability | > 99.9% |
| Latency (p95) | < 500ms |
| Error Rate | < 0.1% |
| Throughput | > 100 RPS |

---

## 📊 Capacity Planning

### Baseline Metrics (27 Kasım 2025)

| Metric | Current | Target |
|--------|---------|--------|
| Max VUs Supported | TBD | 500 |
| Max RPS | TBD | 1000 |
| p95 Latency | TBD | < 300ms |
| Memory per VU | TBD | < 50MB |

### Scaling Thresholds

| Metric | Scale Up | Scale Down |
|--------|----------|------------|
| CPU Usage | > 70% | < 30% |
| Memory Usage | > 80% | < 40% |
| Request Queue | > 100 | < 10 |

---

## 🔧 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure the server is running
   - Check BASE_URL environment variable

2. **High Error Rate**
   - Check rate limiting configuration
   - Verify authentication tokens

3. **Slow Response Times**
   - Check database connection pool
   - Review Redis cache hit rates

---

**Son Güncelleme:** 27 Kasım 2025

