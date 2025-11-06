# Dese EA Plan v6.8.0

**Version:** v6.8.0  
**Last Update:** 2025-01-27

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
- **Backend**: Node.js + Express + FastAPI + PostgreSQL (Drizzle ORM)
- **Testing**: Vitest + Supertest + Playwright
- **Packaging**: pnpm 8.15.0
- **Infrastructure**: Docker + Kubernetes + Helm + ArgoCD
- **Monitoring**: Prometheus + Grafana + Loki + Tempo
- **GitOps**: ArgoCD + Kustomize

## 📋 Gereksinimler

- Node.js >= 20.19.0
- pnpm >= 8.0.0
- PostgreSQL >= 15
- Redis >= 7
- Docker >= 20.10
- Kubernetes >= 1.25
- Helm >= 3.10

## ☁️ Google Cloud Infrastructure

**Proje ID:** `ea-plan-seo-project`  
**Region:** `europe-west3` (Frankfurt)

### ✅ Oluşturulan Kaynaklar

#### Faz 1: Infrastructure
- ✅ **Cloud SQL PostgreSQL:** `dese-ea-plan-db`
  - Version: `POSTGRES_15`
  - Database: `dese_db`
  - IP: `34.159.32.249`
  - Connection: `postgresql://postgres:GüvenliŞifre123!@34.159.32.249:5432/dese_db`

- ✅ **Memorystore Redis:** `dese-ea-plan-cache`
  - Version: `REDIS_7_0`
  - Host: `10.146.144.75`
  - Port: `6379`
  - Connection: `redis://10.146.144.75:6379`

#### Faz 2: Kubernetes
- ✅ **GKE Cluster:** `dese-ea-plan-cluster`
  - Region: `europe-west3`
  - Nodes: `3` (e2-small)
  - Version: `1.33.5-gke.1162000`
  - Status: `RUNNING` ✅

**Detaylar:** `docs/GCP_MIGRATION_FAZ1_SONUC.md`, `docs/GCP_MIGRATION_FAZ2_GKE.md`

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

**Google Cloud için environment variables:**
```env
# Database (Cloud SQL)
DATABASE_URL=postgresql://postgres:GüvenliŞifre123!@34.159.32.249:5432/dese_db

# Redis (Memorystore)
REDIS_HOST=10.146.144.75
REDIS_PORT=6379
REDIS_URL=redis://10.146.144.75:6379

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

**Faz 1 ve Faz 2 tamamlandı!** Infrastructure hazır:
- ✅ Cloud SQL PostgreSQL
- ✅ Memorystore Redis
- ✅ GKE Cluster

**Sonraki Adımlar (Faz 3):**
- Application deployment
- Ingress controller setup
- Database migration
- Monitoring setup

**Scripts:**
- `scripts/gcp-cloud-sql-create-direct.ps1` - Cloud SQL instance
- `scripts/gcp-gke-cluster-create.ps1` - GKE cluster
- Detaylı dokümantasyon: `docs/GCP_MIGRATION_FAZ1_SONUC.md`

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

# Ingress'i uygulayın
kubectl apply -f k8s/ingress.yaml
```

### Helm ile Deploy

```bash
# Helm chart'ı yükleyin
helm install dese-ea-plan-v5 ./helm/dese-ea-plan-v5

# Güncelleme yapın
helm upgrade dese-ea-plan-v5 ./helm/dese-ea-plan-v5

# Kaldırın
helm uninstall dese-ea-plan-v5
```

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
- Production: https://api.dese.ai/api-docs

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
