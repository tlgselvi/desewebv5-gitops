# Dese EA Plan v6.8.2

> **Durum:** Sistem üretimde ve bakım modunda. v6.8.2 ile WebSocket gözlemlenebilirliği eklendi. Güncel operasyon süreci için `docs/OPERATIONS_GUIDE.md` dokümanını takip edin.

Dese EA Plan, FinBot (finans), MuBot (muhasebe) ve AIOps/Observability modüllerini bir araya getiren kurumsal planlama platformudur. v6.8.1 sürümüyle tüm MCP katmanı gerçek veri kaynaklarına bağlıdır ve Redis + Prometheus ile izlenmektedir.

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

```bash
git clone https://github.com/dese-ai/dese-ea-plan-v5.git
cd dese-ea-plan-v5

# 1. Environment variables ayarlayın
cp env.example .env
# .env dosyasını düzenleyin ve gerekli değerleri doldurun

# 2. Google Cloud credentials hazırlayın (opsiyonel)
# gcp-credentials.json dosyasını proje root'una koyun
# Detaylar: docs/DOCKER_GOOGLE_CLOUD_SETUP.md

# 3. Tüm servisleri başlatın
docker compose up --build -d

# 4. Veritabanı migration'ını çalıştırın (ilk kurulumda)
docker compose exec app pnpm db:migrate

# 5. Servisleri kontrol edin
docker compose ps
docker compose logs -f
```

### Local Development (Opsiyonel)

Eğer Docker dışında local development yapmak isterseniz:

```bash
pnpm install
cp env.example .env
# .env dosyasında DB_HOST=localhost ve REDIS_HOST=localhost yapın

# Docker'da sadece db ve redis'i çalıştırın
docker compose up db redis -d

pnpm db:migrate
pnpm dev
```

> **Not:** Artık tüm servisler Docker Compose ile çalıştırılmaktadır. Local development için yukarıdaki adımları izleyin.

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

### Google Cloud Entegrasyonu

Google Cloud servislerini kullanmak için:

1. **Google Cloud Console'dan credentials alın:**
   - Detaylı adımlar: `docs/DOCKER_GOOGLE_CLOUD_SETUP.md`
   - Hızlı başlangıç: `docs/DOCKER_QUICK_START.md`

2. **gcp-credentials.json dosyasını proje root'una koyun**

3. **.env dosyasında Google Cloud değişkenlerini ayarlayın**

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
- `docs/SPRINT_PLAN_v6.9.0.md` – Bir sonraki sprint için plan taslağı  
- `RELEASE_NOTES_v6.8.1.md` – Son sürümdeki değişiklikler ve öğrenilenler

### Docker & Deployment
- `docs/DOCKER_COMPOSE_FULL_SETUP.md` – Docker Compose tam yapılandırma rehberi
- `docs/DOCKER_GOOGLE_CLOUD_SETUP.md` – Google Cloud credentials yapılandırması
- `docs/DOCKER_QUICK_START.md` – Docker hızlı başlangıç rehberi
- `docs/KUBERNETES_GOOGLE_CLOUD_SETUP.md` – Kubernetes Google Cloud yapılandırması

---

## 📝 Lisans & İletişim

Bu proje MIT lisansı altındadır (bkz. `LICENSE`). Sorular için: dev@dese.ai.
