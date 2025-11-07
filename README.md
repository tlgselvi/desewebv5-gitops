# Dese EA Plan v6.8.1

**Version:** v6.8.1 (Sprint 2.7)
**Last Update:** 2025-11-07

EA Plan Master Control System - Enterprise-level modular system (FinBot + MuBot + DESE)

## 🚀 Özellikler

### Ana Modüller
- **FinBot**: Finance Engine (FastAPI, Python 3.11) - Cost & ROI Forecasting
- **MuBot**: Accounting Engine (Express.js, TypeScript) - Multi-Source Data Ingestion
- **DESE**: Analytics Layer (Next.js 16 + React 19) - Realtime Metrics Dashboard

### SEO Modülleri (Legacy)
- **SEO Analyzer**: Core Web Vitals, Lighthouse ve meta denetimi
- **Content Generator**: E-E-A-T uyumlu içerik ve landing page üretimi
- **Local SEO Manager**: Google Business, yerel backlink, yorum yönetimi
- **Link Builder**: DR>50 backlink oluşturma, spam<5%
- **SEO Observer**: AIOps tabanlı SEO izleme ve anomaly detection
- **Sprint Manager**: 3 sprintlik SEO Kanban planlama

### Teknoloji Stack
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Node.js 20 LTS + Express 5.x + FastAPI + PostgreSQL (Drizzle ORM)
- **Testing**: Vitest + Supertest + Playwright + Jarvis Automation Chain
- **Packaging**: pnpm 8.15.0 (Corepack destekli)
- **Infrastructure**: Docker + Google Kubernetes Engine + Helm + ArgoCD
- **Monitoring**: Prometheus + Grafana + Loki + Tempo + Cloud Logging
- **GitOps**: ArgoCD + Kustomize + GitHub Actions

## 📋 Gereksinimler

- Node.js >= 20.19.0
- pnpm >= 8.0.0
- PostgreSQL >= 15
- Redis >= 7
- Docker >= 20.10
- Kubernetes >= 1.25
- Helm >= 3.10

## ☁️ Google Cloud Production Altyapısı

- **Proje ID:** `ea-plan-seo-project`
- **Region:** `europe-west3` (Frankfurt)
- **Alan Adı:** `poolfab.com.tr`

### Kaynak Özeti

| Katman | Kaynak | Durum |
| --- | --- | --- |
| Veri | Cloud SQL PostgreSQL `dese-ea-plan-db` (Postgres 15) | ✅ Production |
| Cache | Memorystore Redis `dese-ea-plan-cache` (Redis 7) | ✅ Production |
| Orkestrasyon | GKE `dese-ea-plan-cluster` (1.33.5-gke.1162000) | ✅ 3×e2-small |
| Ağ | Cloud Armor + NGINX Ingress Controller | ✅ Aktif |
| Observability | Prometheus + Grafana + Loki + Tempo + Cloud Logging | ✅ Production (metrics push yeşil) |
| Automation | Jarvis efficiency chain & advanced-health-check scriptleri | ✅ Günlük cron (Sprint 2.7 Step 8 temizliği 2025-11-07) |
| CI/CD | GitHub Actions → Artifact Registry → ArgoCD | ✅ Production (rolling update pipeline) |

### Canlı Uç Noktalar

| Servis | URL | Durum |
| --- | --- | --- |
| Backend API | `https://api.poolfab.com.tr` | ✅ Production |
| Frontend | `https://app.poolfab.com.tr` | ✅ Production |
| FinBot MCP | `https://finbot.poolfab.com.tr` | ✅ MCP (60 sn cache + WebSocket) |
| MuBot MCP | `https://mubot.poolfab.com.tr` | ✅ MCP (accounting ingestion) |
| Observability MCP | `https://observability.poolfab.com.tr` | ✅ Metrics & dashboards |
| Jarvis Health | `https://jarvis.poolfab.com.tr/health` | ✅ Automation health |

Detaylı migrasyon adımları: `docs/GCP_MIGRATION_DURUM_OZETI.md`, `docs/GCP_MIGRATION_FAZ5_BUILD_STATUS.md`, `docs/GCP_MIGRATION_FAZ6_DEPLOYMENT.md`

---

## 🛠️ Kurulum

### Geliştirme Ortamı

1. **Repository'yi klonlayın**
```bash
git clone https://github.com/dese-ai/dese-ea-plan-v5.git
cd dese-ea-plan-v5
```

2. **Bağımlılıkları yükleyin**
```bash
pnpm install
```

3. **Environment dosyasını oluşturun**
```bash
cp env.example .env
# .env dosyasını düzenleyin
```

**Google Cloud için örnek environment variables:** (Secret Manager/ConfigMap ile yönetilir)
```env
# Database (Cloud SQL)
DATABASE_URL=postgresql://<USER>:<PASSWORD>@<PUBLIC_IP>:5432/dese_db

# Redis (Memorystore)
REDIS_HOST=<MEMORYSTORE_HOST>
REDIS_PORT=6379
REDIS_URL=redis://<MEMORYSTORE_HOST>:6379

# Kubernetes
GKE_CLUSTER_NAME=dese-ea-plan-cluster
GKE_REGION=europe-west3
GKE_PROJECT=ea-plan-seo-project
```

4. **Veritabanını kurun**

**Local Development:**
```bash
# PostgreSQL'i başlatın
docker-compose up -d postgres redis

# Migration'ları çalıştırın
pnpm db:migrate
```

**Google Cloud (Production):**
```bash
# kubectl context'i ayarlayın
gcloud container clusters get-credentials dese-ea-plan-cluster --region=europe-west3

# Migration'ları çalıştırın
pnpm db:migrate
```

5. **Uygulamayı başlatın**
```bash
pnpm dev
```

### Docker ile Çalıştırma

```bash
# Tüm servisleri başlatın
docker-compose up -d

# Sadece uygulamayı build edin
docker-compose build app

# Logları görüntüleyin
docker-compose logs -f app
```

### Google Cloud Deployment

- **Durum:** Faz 1-6 tamamlandı. Docker imajları Artifact Registry’den çekiliyor, ArgoCD production ortama otomatik deploy ediyor.
- **Rolling Update Adımları:**
  1. `pnpm version patch` + `git push` (GitHub Actions build/publish)
  2. Artifact Registry `dese-ea-plan/*` repolarına `v6.8.1` etiketi ile push
  3. ArgoCD sync (staging → prod); `kubectl rollout status deployment/<svc>` kontrolü
  4. Jarvis zinciri ile MCP sağlık raporu + Prometheus/Grafana dashboard doğrulaması
  5. (Opsiyonel) Yerel sistem temizliği: `docker image prune -f` + `docker container prune -f`
- **Script Referansları:** `scripts/gcp-*.ps1`, `scripts/jarvis-efficiency-chain.ps1`
- **Migrasyon Dokümanları:** `docs/GCP_MIGRATION_DURUM_OZETI.md`, `docs/GCP_MIGRATION_FAZ5_BUILD_STATUS.md`, `docs/GCP_MIGRATION_FAZ6_DEPLOYMENT.md`

### Kubernetes ile Deploy

```bash
# Namespace oluşturun
kubectl apply -f k8s/namespace.yaml

# ConfigMap ve Secret'ları uygulayın
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# ServiceAccount ve RBAC'ı uygulayın
kubectl apply -f k8s/serviceaccount.yaml

# Deployment'ı uygulayın
kubectl apply -f k8s/deployment.yaml

# Service'leri uygulayın
kubectl apply -f k8s/service.yaml

# Servis bazlı ingress manifestlerini uygulayın
kubectl apply -f k8s/ingress-api.yaml
kubectl apply -f k8s/ingress-frontend.yaml
kubectl apply -f k8s/ingress-finbot.yaml
kubectl apply -f k8s/ingress-mubot.yaml
```

### Helm & GitOps

- Helm chart: `helm/dese-ea-plan-v5`
- GitOps repo: `gitops/apps/`
- ArgoCD projeleri: `dese-api`, `dese-frontend`, `dese-finbot`, `dese-mubot`, `observability`
- `argocd app sync dese-api` komutu staging/prod rollout takibinde kullanılır.

## 🧠 Jarvis Automation Chain

- **Script:** `scripts/jarvis-efficiency-chain.ps1`
- **Raporlar:** `reports/jarvis_efficiency_summary_*.json`, `reports/mcp_connectivity_*.json`, `reports/context_stats_*.json`
- **Koşum:** `pwsh -ExecutionPolicy Bypass -File scripts/jarvis-efficiency-chain.ps1`
- **Kontroller:** MCP health (`/health`), Prometheus `up` metriği, Redis gecikmesi, PostgreSQL pool, GKE pod durumu

Jarvis zinciri çıktılarını Prometheus/Grafana panelleri ile birleştirerek Sprint 2.7 teknik borç temizliği sonrasında otomatik sağlık taraması sağlanır.

## 🧪 Test

### Unit Testler
```bash
# Tüm testleri çalıştırın
pnpm test

# Coverage ile çalıştırın
pnpm test:coverage

# UI ile çalıştırın
pnpm test:ui

# Akıllı test workflow
pnpm test:smart
```

### E2E Testler
```bash
# Browser testlerini çalıştırın
pnpm test:auto

# UI ile çalıştırın
pnpm test:auto:ui
```

## 📊 Monitoring

### Prometheus Metrics
- HTTP request metrics
- Database connection metrics
- SEO analysis metrics
- Content generation metrics
- Custom business metrics

### Grafana Dashboards
- Application performance
- SEO metrics trends
- Content generation analytics
- System health monitoring

### Logging
- Structured JSON logging
- Log rotation
- Loki integration
- Error tracking

## 🔧 API Dokümantasyonu

API dokümantasyonu Swagger UI ile erişilebilir:
- Development: http://localhost:3000/api-docs
- Production: https://api.poolfab.com.tr/api-docs

### Ana Endpoints

**Health & Status:**
- `GET /health` - Comprehensive health check (Database, Redis, Services)
- `GET /health/ready` - Readiness probe (Database + Redis check)
- `GET /health/live` - Liveness probe
- `GET /metrics` - Prometheus metrics
- `GET /metrics/aiops` - AIOps specific metrics

**API Endpoints:**
- `GET /api/v1/projects` - SEO projeleri
- `POST /api/v1/seo/analyze` - SEO analizi
- `POST /api/v1/content/generate` - İçerik üretimi
- `GET /api/v1/analytics/dashboard` - Dashboard verileri

## 🏗️ Mimari

### Modüler Yapı
```
src/
├── config/          # Konfigürasyon
├── db/             # Veritabanı şeması ve bağlantı
├── middleware/      # Express middleware'leri
├── routes/          # API route'ları
├── services/        # İş mantığı servisleri
└── utils/           # Yardımcı fonksiyonlar
```

### Veritabanı Şeması
- **Users**: Kullanıcı yönetimi
- **SeoProjects**: SEO projeleri
- **SeoMetrics**: Lighthouse ve Core Web Vitals
- **GeneratedContent**: Üretilen içerikler
- **LocalSeoProfiles**: Yerel SEO profilleri
- **BacklinkTargets**: Backlink hedefleri
- **SeoAlerts**: SEO uyarıları
- **SeoSprints**: Sprint yönetimi

## 🔒 Güvenlik

### Güvenlik Özellikleri
- JWT tabanlı authentication
- Rate limiting
- CORS koruması
- Helmet.js güvenlik headers
- Input validation (Zod)
- SQL injection koruması (Drizzle ORM)

### Kubernetes Güvenlik
- Network policies
- Pod security policies
- RBAC
- Secrets management
- Image scanning (Trivy)

## 📈 Performans

### Optimizasyonlar
- Connection pooling
- Redis caching
- Compression middleware
- Image optimization
- Lazy loading
- Code splitting

### Monitoring
- Prometheus metrics
- Health checks
- Resource limits
- Auto-scaling

## 🤝 Katkıda Bulunma

Projeye katkıda bulunmak için detaylı rehberimize bakın:

📖 **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Katkıda bulunma rehberi  
📐 **[CODING_STANDARDS.md](./CODING_STANDARDS.md)** - Kod standartları ve best practices

### Hızlı Başlangıç

1. Fork yapın ve repository'yi klonlayın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi yapın ve testlerinizi yazın
4. Commit yapın (Conventional Commits formatında)
5. Push yapın ve Pull Request oluşturun

Detaylar için [CONTRIBUTING.md](./CONTRIBUTING.md) dosyasına bakın.

## 📚 Ek Dokümantasyon

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Katkıda bulunma rehberi
- **[CODING_STANDARDS.md](./CODING_STANDARDS.md)** - Kod standartları ve best practices
- **[CICD_GUIDE.md](./CICD_GUIDE.md)** - CI/CD pipeline rehberi
- **[PROJE_KONTROL_RAPORU.md](./PROJE_KONTROL_RAPORU.md)** - Proje kontrol raporu
- **[PROJE_DURUM_RAPORU_2025.md](./PROJE_DURUM_RAPORU_2025.md)** - Proje durum raporu
- **[PYTHON_RUNTIME_SETUP.md](./docs/PYTHON_RUNTIME_SETUP.md)** - FinBot & MuBot sanal ortam rehberi
- **[RELEASE_NOTES_v6.8.1.md](./RELEASE_NOTES_v6.8.1.md)** - Sprint 2.7 / Teknik borç güncellemeleri

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🔧 Troubleshooting

### kubectl exec TTY Uyarıları

CI/CD pipeline'larında veya script'lerde `kubectl exec -it` kullanırken "Unable to use a TTY" uyarısı alıyorsanız:

**Çözüm:** Non-interactive komutlar (`curl`, `wget`, vb.) için `-it` parametresini kaldırın.

```bash
# ❌ Yanlış (TTY uyarısı verir)
kubectl exec -it <pod-name> -n <namespace> -- curl http://localhost:8080/health

# ✅ Doğru (CI/CD güvenli)
kubectl exec <pod-name> -n <namespace> -- curl -s http://localhost:8080/health
```

**Detaylı kılavuz:** [`ops/KUBECTL_TROUBLESHOOTING.md`](ops/KUBECTL_TROUBLESHOOTING.md)

**CI/CD Dokümantasyonu:** [`CICD_GUIDE.md`](CICD_GUIDE.md)

## 📞 İletişim

- **CPT Digital Team**: dev@dese.ai
- **Website**: https://dese.ai
- **Documentation**: https://docs.dese.ai

## 🙏 Teşekkürler

- [Lighthouse](https://lighthouse-ci.com/) - Web performans analizi
- [OpenAI](https://openai.com/) - AI içerik üretimi
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe ORM
- [Kubernetes](https://kubernetes.io/) - Container orchestration
- [Prometheus](https://prometheus.io/) - Monitoring
