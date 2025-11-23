# 🐳 Docker Compose Tam Yapılandırma Rehberi

**Proje:** Dese EA Plan v6.8.2  
**Tarih:** 2025-01-27  
**Durum:** ✅ Tam Docker Setup

---

## 📋 Servisler

Docker Compose yapılandırması şu servisleri içerir:

| Servis | Port | Açıklama |
|--------|------|----------|
| `db` | 5432 | PostgreSQL 15 veritabanı |
| `redis` | 6379 | Redis 7 cache |
| `app` | 3000 | Backend API (Express + Next.js) |
| `frontend` | 3001 | Frontend UI (Next.js) |
| `finbot` | 5555 | MCP FinBot servisi |
| `mubot` | 5556 | MCP MuBot servisi |
| `dese` | 5557 | MCP Dese servisi |
| `observability` | 5558 | MCP Observability servisi |

---

## 🚀 Hızlı Başlangıç

### 1. Environment Variables Ayarlayın

```bash
# .env dosyasını oluşturun
cp env.example .env

# .env dosyasını düzenleyin ve gerekli değerleri doldurun
```

### 2. Google Cloud Credentials Hazırlayın

```bash
# gcp-credentials.json dosyasını proje root'una koyun
# Detaylar: docs/DOCKER_GOOGLE_CLOUD_SETUP.md
```

### 3. Docker Compose ile Başlatın

```bash
# Tüm servisleri başlat
docker compose up --build -d

# Veritabanı migration'ını çalıştırın (ilk kurulumda)
docker compose exec app pnpm db:migrate

# Log'ları izle
docker compose logs -f

# Belirli bir servisin log'larını izle
docker compose logs -f app
docker compose logs -f frontend
```

---

## 🔧 Servis Yapılandırmaları

### Backend API (app)

- **Port:** 3000
- **Build:** Root Dockerfile
- **Environment Variables:**
  - `GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-credentials.json`
  - `GSC_PROJECT_ID`, `GSC_CLIENT_EMAIL`, `GSC_PRIVATE_KEY`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_MAPS_API_KEY`, `GOOGLE_BUSINESS_API_KEY`
- **Volumes:**
  - `./logs:/app/logs`
  - `./uploads:/app/uploads`
  - `./gcp-credentials.json:/app/gcp-credentials.json:ro`

### Frontend (frontend)

- **Port:** 3001
- **Build:** `frontend/Dockerfile`
- **Environment Variables:**
  - `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1`
  - `PORT=3001`
- **Dependencies:** `app` servisi

### MCP Servisleri

Tüm MCP servisleri (finbot, mubot, dese, observability):
- Google Cloud credentials volume mount
- Backend API'ye bağlı (`http://app:3000`)
- Health check'ler yapılandırılmış

---

## 🌐 Network Yapılandırması

### Servis İçi İletişim

Docker Compose otomatik olarak bir network oluşturur. Servisler birbirleriyle hostname ile iletişim kurabilir:

- Backend API: `http://app:3000`
- Database: `db:5432`
- Redis: `redis:6379`

### Dış Erişim

- **Backend API:** http://localhost:3000
- **Frontend:** http://localhost:3001
- **FinBot:** http://localhost:5555
- **MuBot:** http://localhost:5556
- **Dese:** http://localhost:5557
- **Observability:** http://localhost:5558

---

## 🔍 Doğrulama

### 1. Servis Durumunu Kontrol Et

```bash
# Tüm servisleri listele
docker compose ps

# Belirli bir servisin durumunu kontrol et
docker compose ps app
docker compose ps frontend
```

### 2. Health Check'leri Kontrol Et

```bash
# Backend API health check
curl http://localhost:3000/health

# Frontend health check
curl http://localhost:3001

# MCP servisleri health check
curl http://localhost:5555/finbot/health
curl http://localhost:5556/mubot/health
curl http://localhost:5557/dese/health
curl http://localhost:5558/observability/health
```

### 3. Log'ları Kontrol Et

```bash
# Tüm servislerin log'ları
docker compose logs

# Belirli bir servisin log'ları
docker compose logs app
docker compose logs frontend

# Son 100 satır
docker compose logs --tail=100 app

# Canlı log takibi
docker compose logs -f app
```

### 4. Container İçinde Kontrol Et

```bash
# Backend container'ına gir
docker compose exec app sh

# Frontend container'ına gir
docker compose exec frontend sh

# Google Cloud credentials kontrolü
docker compose exec app ls -la /app/gcp-credentials.json
docker compose exec app env | grep GOOGLE
```

---

## 🐛 Sorun Giderme

### Frontend Backend'e Bağlanamıyor

**Sorun:** Frontend `http://localhost:3000/api/v1` adresine erişemiyor.

**Çözüm:**
- Backend servisinin çalıştığını kontrol edin: `docker compose ps app`
- Backend log'larını kontrol edin: `docker compose logs app`
- `.env` dosyasında `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1` olduğundan emin olun

### Google Cloud Credentials Hatası

**Sorun:** "Could not load the default credentials"

**Çözüm:**
- `gcp-credentials.json` dosyasının proje root'unda olduğunu kontrol edin
- Container içinde dosyanın var olduğunu kontrol edin: `docker compose exec app ls -la /app/gcp-credentials.json`
- Volume mount'un doğru yapılandırıldığını kontrol edin

### Port Çakışması

**Sorun:** "port is already allocated"

**Çözüm:**
```bash
# Port'u kullanan process'i bul
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Process'i sonlandır veya docker compose.yml'de port'u değiştir
```

### Database Bağlantı Hatası

**Sorun:** Backend database'e bağlanamıyor

**Çözüm:**
- Database servisinin çalıştığını kontrol edin: `docker compose ps db`
- `.env` dosyasında `DATABASE_URL` ve `DB_HOST=db` olduğundan emin olun
- Database log'larını kontrol edin: `docker compose logs db`

---

## 📝 Environment Variables

### Gerekli Environment Variables

`.env` dosyasında şu değişkenler olmalı:

```bash
# Database
POSTGRES_USER=dese
POSTGRES_PASSWORD=dese123
POSTGRES_DB=dese_ea_plan_v5
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
DB_HOST=db

# Redis
REDIS_URL=redis://redis:6379
REDIS_HOST=redis

# Google Cloud
GSC_PROJECT_ID=ea-plan-seo-project
GSC_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_BUSINESS_API_KEY=your-google-business-api-key

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

---

## 🔄 Servis Yönetimi

### Servisleri Başlat/Durdur

```bash
# Tüm servisleri başlat
docker compose up -d

# Tüm servisleri durdur
docker compose down

# Servisleri durdur ve volume'ları sil
docker compose down -v

# Belirli bir servisi başlat
docker compose up -d app

# Belirli bir servisi durdur
docker compose stop app

# Belirli bir servisi yeniden başlat
docker compose restart app
```

### Servisleri Yeniden Build Et

```bash
# Tüm servisleri yeniden build et
docker compose build

# Belirli bir servisi yeniden build et
docker compose build app
docker compose build frontend

# Build cache olmadan yeniden build et
docker compose build --no-cache app
```

### Servisleri Güncelle

```bash
# Kod değişikliklerinden sonra servisleri yeniden başlat
docker compose up -d --build

# Sadece değişen servisleri rebuild et
docker compose up -d --build app
```

---

## 📚 İlgili Dokümantasyon

- **Google Cloud Setup:** [DOCKER_GOOGLE_CLOUD_SETUP.md](./DOCKER_GOOGLE_CLOUD_SETUP.md)
- **Kubernetes Setup:** [KUBERNETES_GOOGLE_CLOUD_SETUP.md](./KUBERNETES_GOOGLE_CLOUD_SETUP.md)
- **Quick Start:** [DOCKER_QUICK_START.md](./DOCKER_QUICK_START.md)

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0

