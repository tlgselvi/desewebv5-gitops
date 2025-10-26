# EA Plan v5.3 - SEO Authority & Rank Drift Detection

**Status:** 🚧 IN PROGRESS
**Date:** 2025-10-27
**Version:** v5.3
**Previous:** v5.2 (Stable ✅)

---

## CEO MODE ÖZET

**Karar:** SEO görünürlük ve sıralama stabilizasyonu modülü geliştirilecek.
**Etki:** SERP pozisyonu ve keyword ranking izleme sistemi kurulacak, drift detection aktif olacak.
**Risk:** API limitleri ve rate limiting. Ahrefs ve Google Search Console API entegrasyonu dikkatli planlanmalı.
**Aksiyon:** 3-5 günlük geliştirme dönemi başlatıldı.

---

## Hedefler

### 1. SEO Authority Tracking
- **Ahrefs API** → Domain Authority (DA), Backlink profile, Competitor analysis
- **Google Search Console** → Keyword rankings, CTR, Impressions, Clicks
- **Lighthouse CI** → Core Web Vitals, SEO scores

### 2. Rank Drift Detection
- **Automated monitoring** → Keyword position tracking (hourly checks)
- **Drift analysis** → ML-based anomaly detection for ranking drops
- **Alert system** → Slack/Email notifications for >3 position drops

### 3. Predictive Analytics
- **Rank forecasting** → Trend analysis for future rankings
- **Content optimization** → AI-powered content gap analysis
- **Competitor tracking** → Automated SERP monitoring

---

## Mimari

```
┌─────────────────────────────────────────────────────────┐
│           SEO Authority & Rank Drift Detection          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────┐    ┌──────────────────┐          │
│  │ Ahrefs API     │───→│ Domain Authority │          │
│  │ Integration    │    │ Tracking         │          │
│  └────────────────┘    └──────────────────┘          │
│                                                         │
│  ┌────────────────┐    ┌──────────────────┐         │
│  │ GSC API        │───→│ Keyword Rank     │         │
│  │ Integration    │    │ Tracking         │         │
│  └────────────────┘    └──────────────────┘         │
│                                                        │
│  ┌────────────────┐    ┌──────────────────┐        │
│  │ Drift Analysis │───→│ Alert System     │        │
│  │ ML Model       │    │ (Slack/Email)    │        │
│  └────────────────┘    └──────────────────┘        │
│                                                       │
│  ┌────────────────┐    ┌──────────────────┐       │
│  │ SEO Observer   │───→│ Prometheus       │       │
│  │ (Enhanced)     │    │ Metrics Export   │       │
│  └────────────────┘    └──────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## Geliştirme Planı

### Phase 1: API Entegrasyonu (1-2 gün)

**1.1. Ahrefs API**
- Rate limit: 1 req/sec (free tier)
- Endpoints:
  - `GET /v2/domain-rating` → DA score
  - `GET /v2/backlinks` → Backlink count
  - `GET /v2/keywords` → Keyword rankings

**1.2. Google Search Console API**
- OAuth2 authentication
- Endpoints:
  - `GET /searchanalytics/query` → Keyword performance
  - `GET /urlSearchParams/searchAnalytics` → URL performance

**1.3. Lighthouse CI**
- Dockerized CI/CD integration
- Metrics: LCP, FID, CLS, SEO score

### Phase 2: Drift Detection (1-2 gün)

**2.1. Anomaly Detection Model**
- Time-series analysis (ARIMA)
- Threshold: 3+ position drop → Alert
- ML-based: Isolation Forest for outlier detection

**2.2. Alert System**
- Slack webhook integration
- Email notifications (SMTP)
- Grafana dashboard alerts

### Phase 3: Monitoring & Analytics (1 gün)

**3.1. Prometheus Metrics**
- `seo_keyword_rank{keyword, position}`
- `seo_domain_authority_score`
- `seo_rank_drift_count`
- `seo_api_requests_remaining`

**3.2. Grafana Dashboards**
- Keyword ranking trends
- Domain authority history
- Drift detection timeline
- API usage monitoring

---

## Teknik Detaylar

### Yeni Dosyalar

```
src/services/
├── seo/
│   ├── ahrefsApi.ts         # Ahrefs API client
│   ├── gscApi.ts            # Google Search Console API
│   ├── lighthouseCI.ts      # Lighthouse runner
│   ├── driftDetector.ts     # Drift detection logic
│   └── alertManager.ts      # Alert dispatcher
```

### Dependencies

```json
{
  "dependencies": {
    "@ahrefs/api-client": "^1.0.0",
    "googleapis": "^128.0.0",
    "lighthouse": "^11.0.0",
    "node-cron": "^3.0.0",
    "@prometheus/client": "^0.19.0"
  }
}
```

### Environment Variables

```env
# Ahrefs API
AHREFS_API_KEY=your_token_here
AHREFS_API_BASE_URL=https://apiv2.ahrefs.com

# Google Search Console
GSC_CLIENT_ID=your_client_id
GSC_CLIENT_SECRET=your_secret
GSC_REDIRECT_URI=http://localhost:3000/auth/callback

# Slack Webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

---

## Deployment

### 1. Kubernetes Deployment

```yaml
# src/services/seo/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: seo-authority-tracker
  namespace: dese-ea-plan-v5
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: seo-tracker
          image: dese-webv5:seo-tracker
          env:
            - name: AHREFS_API_KEY
              valueFrom:
                secretKeyRef:
                  name: dese-secrets
                  key: AHREFS_API_KEY
            - name: GSC_CLIENT_ID
              valueFrom:
                secretKeyRef:
                  name: dese-secrets
                  key: GSC_CLIENT_ID
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
```

### 2. CronJob for Scheduled Checks

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: seo-rank-check
  namespace: dese-ea-plan-v5
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: rank-checker
              image: dese-webv5:rank-checker
```

---

## Success Criteria

| Kriter | Hedef | Durum |
|--------|-------|-------|
| Ahrefs API connected | ✅ | - |
| Google Search Console integrated | ✅ | - |
| Rank drift alerts working | ✅ | - |
| Prometheus metrics exported | ✅ | - |
| Grafana dashboard deployed | ✅ | - |
| Lighthouse CI integrated | ✅ | - |

---

## Sonraki Adımlar

1. ✅ API credentials setup
2. ⏳ Ahrefs API integration
3. ⏳ Google Search Console integration
4. ⏳ Drift detection logic
5. ⏳ Alert system implementation
6. ⏳ Prometheus metrics export
7. ⏳ Grafana dashboard creation
8. ⏳ Deployment to production

---

## Referanslar

- [Ahrefs API Documentation](https://ahrefs.com/api/documentation)
- [Google Search Console API](https://developers.google.com/webmaster-tools/search-console-api)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Prometheus Metric Types](https://prometheus.io/docs/concepts/metric_types/)

---

**Geliştirme Başlangıç:** 2025-10-27
**Estimated Completion:** 2025-11-01
**Sorumlu:** EA Plan v5.3 Team
