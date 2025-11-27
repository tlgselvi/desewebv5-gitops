# Dese EA Plan v7.0.0

> **Durum:** Enterprise SaaS Transformation tamamlandı. v7.0.0 ile Multi-tenancy, RBAC ve RLS (Row-Level Security) aktif. Güncel operasyon süreci için `docs/OPERATIONS_GUIDE.md` dokümanını takip edin.

Dese EA Plan, FinBot (finans), MuBot (muhasebe), SalesBot (CRM), IoT Gateway ve AIOps/Observability modüllerini bir araya getiren kurumsal ERP platformudur. v7.0.0 sürümüyle Multi-tenant SaaS altyapısı, modül bazlı RBAC ve PostgreSQL RLS politikaları aktif edilmiştir.

---

## 🔧 Teknoloji Yığını

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS  
- **Backend:** Node.js 20, Express 5, PostgreSQL (Drizzle ORM), Redis  
- **Monitoring:** Prometheus, Grafana, Loki, Tempo  
- **Testler:** Vitest, Supertest, Playwright  
- **Paket Yönetimi:** pnpm 8.x  
- **Dağıtım:** Docker, Kubernetes, Helm, ArgoCD

---

## ✅ Ön Gereksinimler

- **Docker** 20.10+ veya **Docker Desktop** (Windows/Mac) - **ZORUNLU**
- **Docker Compose** v2.0+ - **ZORUNLU**
- Node.js 20.19+ ve pnpm 8.x (sadece development için, Docker build sırasında kullanılır)
- Kubernetes araçları (opsiyonel, production deployment için)

---

## 🛠️ Kurulum

### Docker ile Kurulum (Önerilen)

#### Clean Install (İlk Kurulum)

```bash
git clone https://github.com/dese-ai/dese-ea-plan-v5.git
cd dese-ea-plan-v5

# 1. Environment variables ayarlayın
cp env.example .env
# .env dosyasını düzenleyin ve gerekli değerleri doldurun
# Özellikle şu değişkenleri kontrol edin:
#   - DATABASE_URL
#   - JWT_SECRET
#   - POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB

# 2. Google Cloud credentials hazırlayın (opsiyonel)
# gcp-credentials.json dosyasını proje root'una koyun
# Detaylar: docs/DOCKER_GOOGLE_CLOUD_SETUP.md

# 3. Tüm servisleri başlatın
# Migration ve seed otomatik olarak çalışacaktır
docker compose up --build -d

# 4. Servisleri kontrol edin
docker compose ps
docker compose logs -f app  # Backend logs
docker compose logs -f frontend  # Frontend logs

# 5. Health check
curl http://localhost:3000/health  # Backend health
curl http://localhost:3002  # Frontend (port 3002)
```

**Not:** İlk kurulumda:
- ✅ Database migration'ları otomatik çalışır
- ✅ Seed script'i otomatik çalışır (demo verileri yüklenir)
- ✅ Tüm servisler health check'ten geçer

#### Servis Portları

- **Backend API:** http://localhost:3000
- **Frontend UI:** http://localhost:3002
- **Grafana:** http://localhost:3003 (admin/admin)
- **Prometheus:** http://localhost:9090
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

### Local Development (Opsiyonel)

> **Not:** Tüm servisler Docker Compose ile çalıştırılmaktadır. Geliştirme için `docker compose up -d` komutunu kullanın.

### Servisler

Docker Compose şu servisleri içerir:

- **db** - PostgreSQL 15 (Port: 5432)
- **redis** - Redis 7 (Port: 6379)
- **app** - Backend API (Port: 3000)
- **frontend** - Frontend UI (Port: 3001)
- **finbot** - MCP FinBot (Port: 5555)
- **mubot** - MCP MuBot (Port: 5556)
- **dese** - MCP Dese (Port: 5557)
- **observability** - MCP Observability (Port: 5558)

### Google Cloud & OAuth Kurulumu

Google OAuth (Giriş) ve diğer Google servislerini kullanmak için:

1. **Google Cloud Console'dan OAuth Credentials alın:**
   - Detaylı adım adım rehber: `docs/GOOGLE_OAUTH_STEP_BY_STEP.md`
   - Özet: `docs/DOCKER_QUICK_START.md`

2. **Credentials Dosyasını Ekleyin:**
   - `gcp-credentials.json` dosyasını proje ana dizinine ekleyin.

3. **.env Dosyasını Güncelleyin:**
   - Google OAuth Client ID ve Secret bilgilerini ekleyin.

> **Detaylı Docker Setup:** `docs/DOCKER_COMPOSE_FULL_SETUP.md`

---

## 🧪 Test Komutları

```bash
pnpm test           # Vitest birimleri
pnpm test:coverage  # Coverage raporu
pnpm test:auto      # Playwright E2E senaryoları
```

---

## 📚 Ana Dokümanlar

### Operasyonel
- `PROJECT_MASTER_DOC.md` – Canlı durumun tek kaynağı  
- `docs/OPERATIONS_GUIDE.md` – On-call prosedürleri ve sorun giderme  
- `DESE_EA_PLAN_TRANSFORMATION_REPORT.md` – v7.0 Enterprise Transformation Planı
- `RELEASE_NOTES_v7.0.0.md` – v7.0 sürümündeki değişiklikler

### Docker & Deployment
- `docs/DOCKER_COMPOSE_FULL_SETUP.md` – Docker Compose tam yapılandırma rehberi
- `docs/GOOGLE_OAUTH_STEP_BY_STEP.md` – Google OAuth kurulum rehberi (Yeni)
- `docs/DOCKER_GOOGLE_CLOUD_SETUP.md` – Google Cloud credentials yapılandırması
- `docs/DOCKER_QUICK_START.md` – Docker hızlı başlangıç rehberi
- `docs/KUBERNETES_GOOGLE_CLOUD_SETUP.md` – Kubernetes Google Cloud yapılandırması

---

## 🔧 Troubleshooting

### Migration veya Seed Çalışmıyor

Migration ve seed script'leri container başlatıldığında otomatik çalışır. Eğer çalışmıyorsa:

```bash
# Container logs'ları kontrol edin
docker compose logs app
```

### pnpm "Hayalet" Bağımlılık Sorunları

Bazen `pnpm install` çalıştırsanız bile, eski bir alt-bağımlılık (transitive dependency) kullanılmaya devam edebilir. Bu durum, özellikle Git dalları arasında sıkça geçiş yapıldığında yaşanır.

**Belirtiler:**
- "module not found" hataları
- Bir paketin inatla güncellenmemesi
- `node_modules` silinse bile sorunun devam etmesi

**Çözüm:**
```powershell
# Otomatik temizleme script'ini çalıştırın
.\scripts\clean-pnpm-deps.ps1

# Veya manuel olarak:
Remove-Item -Recurse -Force -Path "node_modules", "frontend/node_modules" -ErrorAction SilentlyContinue
pnpm store prune
Remove-Item -Force -Path "pnpm-lock.yaml" -ErrorAction SilentlyContinue
pnpm install
```

### Docker Network Sorunları

Servislerin birbiriyle haberleşememesi veya "service unreachable" hataları alıyorsanız:

**Belirtiler:**
- `docker compose ps` her şeyi normal gösterir
- Container'lar çalışıyordur ama aralarındaki iletişim kopuktur
- App servisi db'ye bağlanamıyor

**Çözüm:**
```powershell
# Otomatik temizleme script'ini çalıştırın
.\scripts\clean-docker-network.ps1

# Veya manuel olarak:
docker compose down
docker network prune -f
docker compose up -d
```

### docker-compose.override.yml "Unutulması" Sorunu

Lokal geliştirme ortamınızda her şey mükemmel çalışır (hot-reload vs.), ancak CI/CD pipeline'ında veya başka bir geliştiricinin makinesinde bir özellik çalışmaz.

**Neden Olur:**
- `docker-compose.override.yml` dosyası sadece sizin makinenizde bulunur
- Git'e gönderilmemiş bir ayar (örneğin environment variable) sadece override dosyasında tanımlıdır
- Bu ayar başka hiçbir yerde olmadığı için kodunuz başka ortamlarda patlar

**Çözüm:**
- ✅ `docker-compose.override.yml` dosyası `.gitignore`'da tanımlı (lokal geliştirme için)
- ⚠️ Tüm ortamlar için geçerli olması gereken yapılandırmaları ana `docker-compose.yml` dosyasına ekleyin
- 💡 Override dosyasını sadece hot-reload, volume mount gibi lokal geliştirme hızlandırmaları için kullanın

# Manuel olarak migration çalıştırın
docker compose exec app pnpm db:migrate

# Manuel olarak seed çalıştırın
docker compose exec app pnpm db:seed:data

# Seed'i atlamak için (eğer zaten veri varsa)
docker compose exec app sh -c "SKIP_SEED=true pnpm start"
```

### Database Bağlantı Hatası

```bash
# Database container'ının çalıştığını kontrol edin
docker compose ps db

# Database health check
docker compose exec db pg_isready -U dese

# Database logs
docker compose logs db
```

### Port Çakışması

Eğer port'lar kullanılıyorsa, `docker-compose.yml` dosyasındaki port mapping'leri değiştirin:

```yaml
ports:
  - "3000:3000"  # Backend
  - "3002:3000"  # Frontend (host:container)
  - "3003:3000"  # Grafana
```

### Environment Variables Eksik

`.env` dosyası yoksa veya eksik değişkenler varsa:

```bash
# .env dosyasını oluşturun
cp env.example .env

# Kritik değişkenleri kontrol edin
grep -E "DATABASE_URL|JWT_SECRET|POSTGRES_" .env

# Container'ı yeniden başlatın
docker compose down
docker compose up --build -d
```

### Monitoring Data Kayboluyor

Monitoring volume'ları (`prometheus_data`, `grafana_data`) tanımlıdır. Eğer data kayboluyorsa:

```bash
# Volume'ları kontrol edin
docker volume ls | grep prometheus
docker volume ls | grep grafana

# Volume'ları temizlemek için (dikkat: tüm data silinir)
docker compose down -v
```

### Clean Install Testi

Tamamen temiz bir kurulum testi için:

```bash
# Tüm container, volume ve image'ları temizle
docker compose down -v
docker system prune -a -f

# .env dosyasını sil (opsiyonel, test için)
# rm .env

# Yeniden başlat
cp env.example .env
docker compose up --build -d

# Logs'ları takip et
docker compose logs -f
```

---

## 📝 Lisans & İletişim

Bu proje MIT lisansı altındadır (bkz. `LICENSE`). Sorular için: dev@dese.ai.
