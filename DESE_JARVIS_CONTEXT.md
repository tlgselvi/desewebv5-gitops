# DESE JARVIS Context

> **Proje:** Dese EA Plan v6.8.1  
> **Context Version:** 1.2  
> **Last Updated:** 2025-11-09  
> **Protocol:** upgrade-protocol-v1.2  
> **Tamamlanma:** ~85% (Kyverno stabilizasyonu tamamlandı, dokümantasyon/hafıza revizyonu sürüyor)  
> **Referans:** `GUNCELLEME_OZETI_v6.8.1.md`

---

## 🎯 Proje Özeti

### Güncel Odak (09.11.2025)
- ✅ Kyverno & ArgoCD stabilizasyonu (CRD ayrıştırması, helm test hook kapatma, manuel sync)
- ✅ MCP Faz 1 teknik çıktıları doğrulandı (auth, cache, gerçek API)
- 🔄 Dokümantasyon ve hafıza kayıtlarının revizyonu (`MCP_GERCEK_DURUM.md`, `MCP_KAPSAMLI_ANALIZ_VE_PLAN.md`, `.cursor/memory/*`)
- 🟠 GitOps rehberlerine Kyverno/ArgoCD prosedürleri eklenecek

**Dese EA Plan v6.8.1** - CPT Optimization Domain için Kubernetes + GitOps + AIOps uyumlu kurumsal planlama sistemi.

### Ana Modüller
- **FinBot**: Finance Engine (FastAPI, Python 3.11) - Cost & ROI Forecasting
- **MuBot**: Accounting Engine (Express.js, TypeScript) - Multi-Source Data Ingestion
- **DESE**: Analytics Layer (Next.js 16 + React 19) - Realtime Metrics Dashboard

### SEO Modülleri (Legacy)
- SEO Analyzer, Content Generator, Local SEO Manager, Link Builder, SEO Observer, Sprint Manager

---

## 🏗️ Teknoloji Stack

### Frontend
- **Framework:** Next.js 16 + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Package Manager:** pnpm 8.15.0

### Backend
- **Runtime:** Node.js 20.19.0+
- **Framework:** Express.js
- **API:** FastAPI (Python 3.11) - FinBot
- **Database:** PostgreSQL 15+ (Drizzle ORM)
- **Cache:** Redis 7+

### Infrastructure
- **Containerization:** Docker 20.10+
- **Orchestration:** Kubernetes 1.25+
- **Package Manager:** Helm 3.10+
- **GitOps:** ArgoCD + Kustomize

### Monitoring & Observability
- **Metrics:** Prometheus
- **Visualization:** Grafana
- **Logging:** Loki
- **Tracing:** Tempo + Jaeger
- **Telemetry:** OpenTelemetry

### Testing
- **Unit/Integration:** Vitest
- **E2E:** Playwright
- **API:** Supertest

---

## 📁 Proje Yapısı

```
desewebv5/
├── src/                    # Backend source code
│   ├── config/            # Configuration
│   ├── db/                # Database schema & connection
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── utils/             # Utilities
│   └── mcp/               # MCP servers (FinBot, MuBot, DESE, Observability)
├── frontend/              # Next.js frontend
├── finbot/                # FinBot Python service
├── mubot/                 # MuBot service
├── dese-web/              # DESE analytics dashboard
├── autonomous-services/   # Self-healing, self-optimization, orchestration
├── ai-services/           # AI services (NLP, CV, Knowledge Graph)
├── k8s/                   # Kubernetes manifests
├── helm/                  # Helm charts
├── gitops/                # GitOps configurations
├── monitoring/            # Monitoring configurations
├── scripts/               # Utility scripts
└── ops/                   # Operations scripts
```

---

## 🔧 Önemli Konfigürasyonlar

### Docker
- **Data Location:** `C:\Docker\WSLData\disk\docker_data.vhdx` (39.13 GB)
- **Disk:** C: (NVMe SSD - IM2P33F3 ADATA 256GB)
- **WSL BasePath:** `\\?\C:\Docker\WSLData\main`
- **Active Images:**
  - `tlgselvi/dese-ea-plan-v5:fix` (797MB) - Production
  - `tlgselvi/dese-ea-plan-v5:6.8.0` (796MB) - Backup

### WSL2 Configuration
- **Location:** `C:\Users\<USERNAME>\.wslconfig`
- **Settings:**
  - `memory=6GB` (optimized from 15.5GB)
  - `processors=4` (optimized from 12)
  - `swap=0` (performance)
  - `localhostForwarding=true`

### Database
- **Name:** `dese_ea_plan_v5`
- **Type:** PostgreSQL 15+
- **ORM:** Drizzle ORM
- **Volumes:**
  - `desewebv5_postgres_data` (active)
  - `postgres_data` (backup)

### Redis
- **Version:** 7+
- **Volumes:**
  - `desewebv5_redis_data` (active)
  - `redis_data` (backup)

---

## 🚀 MCP Servers (Production)

> **ÖNEMLİ:** Tüm MCP modülleri gerçek backend API'leri, Redis cache, authentication ve izleme katmanlarıyla canlıda çalışıyor. Ayrıntılı operasyon özeti için `EKSIKLER_VE_TAMAMLAMA_DURUMU.md` ve `MCP_GERCEK_DURUM.md`.

### FinBot MCP Server
- **Port:** 5555
- **Health:** `https://api.poolfab.com.tr/finbot/health`
- **Purpose:** Finance forecasting and ROI analysis
- **Durum:** ✅ Canlı backend analytics + metrics entegrasyonu, 60 sn cache, WebSocket yayınları
- **Dosya:** `src/mcp/finbot-server.ts`

### MuBot MCP Server
- **Port:** 5556
- **Health:** `https://api.poolfab.com.tr/mubot/health`
- **Purpose:** Accounting and multi-source data ingestion
- **Durum:** ✅ Ingestion & accounting API entegrasyonu, Redis cache, WebSocket yayınları
- **Dosya:** `src/mcp/mubot-server.ts`

### DESE MCP Server
- **Port:** 5557
- **Health:** `https://api.poolfab.com.tr/dese/health`
- **Purpose:** AIOps telemetry, anomaly & correlation analytics
- **Durum:** ✅ Gerçek zamanlı AIOps API entegrasyonu, cache, WebSocket yayınları
- **Dosya:** `src/mcp/dese-server.ts`

### Observability MCP Server
- **Port:** 5558
- **Health:** `https://api.poolfab.com.tr/observability/health`
- **Purpose:** Monitoring & observability metrics
- **Durum:** ✅ Prometheus + Google metrics entegrasyonu, metrics push pipeline aktif
- **Dosya:** `src/mcp/observability-server.ts`

### Operasyon Notu
- Günlük Jarvis efficiency chain → MCP connectivity + metrics raporu
- Prometheus/Grafana dashboard’ları poolfab.com.tr üzerinden izleniyor
- LLM benchmark adımı sonraki sürümde etkinleşecek (placeholder)

---

## 📊 Kubernetes Deployment

### Namespaces
- `dese-ea-plan-v5` - Main application
- `aiops` - AIOps services
- `autonomous-services` - Self-healing, optimization
- `monitoring` - Monitoring stack
- `argocd` - GitOps platform

### Active Services
- **ArgoCD:** GitOps platform (quay.io/argoproj/argocd:v3.1.9)
- **FinBot:** Finance engine (ghcr.io/cptsystems/finbot:latest)
- **MuBot:** Accounting engine (ghcr.io/cptsystems/mubot:latest)
- **DESE Backend:** cpt-agent-backend:1.0.0
- **PostgreSQL:** postgres:14 (K8s), postgres:16-alpine (docker-compose)
- **Redis:** redis:7-alpine
- **Monitoring Stack:** Grafana, Prometheus, Loki, Jaeger

---

## 🔒 Güvenlik

### Authentication
- **Method:** JWT
- **Secret:** Environment variable `JWT_SECRET`
- **Expiration:** 24h (configurable)

### Security Features
- Rate limiting (100 requests / 15 minutes)
- CORS protection
- Helmet.js security headers
- Input validation (Zod)
- SQL injection protection (Drizzle ORM)

### Kubernetes Security
- Network policies
- RBAC
- Secrets management
- Image scanning (Trivy)
- OPA policies
- Kyverno policies

---

## 📈 Monitoring & Observability

### Metrics Endpoints
- `/metrics` - Prometheus metrics
- `/metrics/aiops` - AIOps specific metrics
- `/health` - Health check

### Observability Stack
- **Prometheus:** Metrics collection (port 9090)
- **Grafana:** Visualization (port 3001)
- **Loki:** Log aggregation (port 3100)
- **Tempo:** Distributed tracing
- **Jaeger:** Tracing UI

---

## 🧪 Testing

### Test Commands
```bash
pnpm test              # Unit tests
pnpm test:coverage     # Coverage report
pnpm test:auto         # E2E tests (Playwright)
pnpm test:smart        # Full test suite
```

### Test Coverage
- Target: 100% (Test altyapısı hazır, 27 test, %69 coverage)
- Framework: Vitest
- E2E: Playwright

---

## 🐳 Docker Commands

### Build & Run
```bash
pnpm docker:build      # Build image
pnpm docker:run        # Run container
docker-compose up -d   # Start all services
```

### Cleanup (Safe)
```bash
docker image prune -f           # Dangling images
docker builder prune -a -f      # Build cache
docker container prune -f        # Stopped containers
docker volume prune -f           # Unused volumes (CAREFUL!)
```

### Critical Volumes (NEVER DELETE)
- `desewebv5_postgres_data`
- `desewebv5_redis_data`

---

## 🔄 GitOps Workflow

### ArgoCD
- **Server:** argocd.example.com (configure in env)
- **Token:** Environment variable
- **Sync:** Automatic or manual

### Helm
- **Chart:** `./helm/dese-ea-plan-v5`
- **Commands:**
  - `pnpm helm:install` - Install
  - `pnpm helm:upgrade` - Upgrade
  - `pnpm helm:uninstall` - Uninstall

---

## 📝 Development Workflow

### Setup
1. Clone repository
2. `pnpm install`
3. Copy `env.example` to `.env`
4. `docker-compose up -d postgres redis`
5. `pnpm db:migrate`
6. `pnpm dev`

### Code Standards
- **Path Aliases:** Always use `@/` prefix
- **Type Safety:** Never use `any`
- **Logging:** Use `logger`, never `console.log`
- **Error Handling:** Always try-catch in async functions
- **Database:** Always use Drizzle ORM (no raw SQL)

### File Structure Rules
- `src/routes/**/*.ts` → Route handlers
- `src/services/**/*.ts` → Business logic
- `src/middleware/**/*.ts` → Express middleware
- `src/db/**/*.ts` → Database schema
- `src/utils/**/*.ts` → Utility functions
- `src/schemas/**/*.ts` → Zod validation schemas

---

## 🛠️ JARVIS Diagnostic Chain

### Purpose
Automated system health checks and efficiency optimization for Cursor AI development environment.

### Scripts
- ⚠️ `scripts/jarvis-efficiency-chain.ps1` - **EKSİK** (henüz oluşturulmadı)
- ⚠️ `scripts/jarvis-diagnostic-phase1.ps1` - **EKSİK** (henüz oluşturulmadı)
- ⚠️ `scripts/jarvis-diagnostic-phase2.ps1` - **EKSİK** (henüz oluşturulmadı)
- ⚠️ `scripts/jarvis-diagnostic-phase3.ps1` - **EKSİK** (henüz oluşturulmadı)

**Not:** Bu scriptler henüz oluşturulmadı. Alternatif olarak `scripts/advanced-health-check.ps1` kullanılabilir.

### MCP Health Check
- Checks FinBot (port 5555)
- Checks MuBot (port 5556)
- Checks DESE (port 5557)
- Reports health status

### Efficiency Chain Steps
1. Context Cleanup (old .cursor/memory files)
2. Log Archive (old log files)
3. MCP Connectivity Audit
4. LLM Benchmark (placeholder)
5. Context Stats Report
6. Metrics Push (Prometheus)

---

## 📦 Package Scripts

### Development
- `pnpm dev` - Start dev server
- `pnpm dev:ops` - Start ops server
- `pnpm build` - Build for production

### Database
- `pnpm db:generate` - Generate migrations
- `pnpm db:migrate` - Run migrations
- `pnpm db:studio` - Open Drizzle Studio

### MCP Servers
- `pnpm mcp:finbot` - Start FinBot MCP
- `pnpm mcp:mubot` - Start MuBot MCP
- `pnpm mcp:dese` - Start DESE MCP
- `pnpm mcp:observability` - Start Observability MCP
- `pnpm mcp:all` - Start all MCP servers

### Testing
- `pnpm test` - Run tests
- `pnpm test:coverage` - Coverage report
- `pnpm test:auto` - E2E tests

### Health Checks
- `pnpm health:check` - Basic health check
- `pnpm health:check:verbose` - Verbose health check
- `pnpm health:monitor` - Continuous monitoring

---

## 🔍 Important Paths

### Configuration Files
- `.env` - Environment variables
- `env.example` - Environment template
- `tsconfig.json` - TypeScript config
- `drizzle.config.ts` - Drizzle ORM config
- `docker-compose.yml` - Docker Compose config
- `Dockerfile` - Main Dockerfile
- `.wslconfig` - WSL2 configuration (Windows)

### Documentation
- `README.md` - Main documentation
- `CODING_STANDARDS.md` - Code standards
- `CONTRIBUTING.md` - Contribution guide
- `EKSIKLER_VE_TAMAMLAMA_DURUMU.md` - Tüm eksikler listesi ⭐⭐
- `MCP_GERCEK_DURUM.md` - MCP gerçek durum
- `GUNCELLEME_OZETI_v6.8.1.md` - Versiyon güncelleme özeti (Kyverno & ArgoCD revizyonu)
- `RELEASE_NOTES_v6.8.1.md` - Sprint 2.7 teknik borç güncellemesi
- `.cursor/memory/JARVIS_DURUMU.md` - JARVIS durumu ⭐
- `.cursor/chains/JARVIS_CHAIN.md` - JARVIS chain bilgileri ⭐

### Reports
- ⚠️ `reports/jarvis_diagnostic_summary.md` - **EKSİK** (henüz oluşturulmadı)
- ⚠️ `reports/efficiency_report_*.md` - **EKSİK** (eski raporlar silindi)

**Not:** JARVIS diagnostic raporları henüz oluşturulmadı. Detaylar için `.cursor/memory/JARVIS_DURUMU.md` dosyasına bakın.

---

## ⚠️ Critical Notes

### Never Delete
- Docker volumes: `desewebv5_postgres_data`, `desewebv5_redis_data`
- Kubernetes image tags: `fix`, `6.8.0`, `6.8.1`
- Production containers and services

### Always Use
- Path aliases (`@/`) instead of relative imports
- Drizzle ORM instead of raw SQL
- `logger` instead of `console.log`
- TypeScript types (never `any`)
- Zod validation for inputs

### Performance Optimizations
- WSL2: 6GB RAM, 4 processors (optimized)
- Docker: Build cache cleaned regularly
- Database: Connection pooling enabled
- Redis: Caching enabled

---

## 🎯 Current Status

### Active Services
- ✅ Docker Desktop (WSL2 backend)
- ✅ Kubernetes (Docker Desktop)
- ✅ ArgoCD (GitOps)
- ✅ FinBot, MuBot, DESE (AIOps)
- ✅ Monitoring Stack (Prometheus, Grafana, Loki, Jaeger)
- ✅ PostgreSQL & Redis

### Recent Optimizations
- ✅ Kyverno CRD ayrıştırması + helm test hook kapatılması (2025-11-09)
- ✅ ArgoCD `security` uygulaması manuel `argocd app sync security` ile doğrulandı
- ✅ MCP release notları ve hafıza kayıtları revizyon turuna alındı
- ✅ 2025-11-07 19:50: `docker image prune -f` + `docker container prune -f` çalıştırıldı (394 MB serbest bırakıldı)
- ✅ WSL2 memory/CPU optimizasyonları ve build cache temizliği

### Known Issues
- 🔄 MCP dokümantasyon revizyonu (gerçek durum & plan) devam ediyor.
- 🔄 GitOps rehberlerinde Kyverno/ArgoCD prosedürleri belgelenecek.
- Rutin izleme (Jarvis raporları, Prometheus kontrolleri) yeşil durumda.

---

## 📚 Additional Resources

### Documentation
- [Coding Standards](./CODING_STANDARDS.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Docker System Summary](./DOCKER_SISTEM_OZET.md)
- [WSL Optimization Report](./WSL_OPTIMIZATION_REPORT.md)

### External Links
- Docker Hub: `tlgselvi/dese-ea-plan-v5`
- GitHub: (configure in env)
- ArgoCD: (configure in env)

---

**Context Version:** 1.2  
**Last Updated:** 2025-11-09  
**Maintained by:** DESE JARVIS System  
**Protocol:** upgrade-protocol-v1.2

