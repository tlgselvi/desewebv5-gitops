# 🐳 Docker Hızlı Başlangıç Kılavuzu

**Proje:** DESE EA PLAN v7.1  
**Son Güncelleme:** 27 Kasım 2025

---

## 📋 Servis Listesi

| Servis | Port | Durum | Açıklama |
|--------|------|-------|----------|
| **app** | 3000 | ✅ | Backend API (TSX runtime) |
| **frontend** | 3002 | ✅ | Next.js 16 Frontend |
| **db** | 5432 | ✅ | PostgreSQL 15 |
| **redis** | 6379 | ✅ | Redis 7-alpine |
| **mosquitto** | 1883, 9001 | ✅ | MQTT Broker (IoT) |
| **prometheus** | 9090 | ✅ | Metrics Collection |
| **grafana** | 3003 | ✅ | Dashboards |

---

## 🚀 Hızlı Başlangıç

### Tüm Servisleri Başlat
```bash
docker compose up -d
```

### Sadece Altyapı (Development)
```bash
# Veritabanı ve cache
docker compose up -d db redis mosquitto

# Uygulama lokalde
pnpm dev
```

### Build ve Başlat
```bash
docker compose up -d --build
```

### Durumu Kontrol Et
```bash
docker compose ps
```

### Logları İzle
```bash
# Tüm servisler
docker compose logs -f

# Sadece app
docker logs -f desewebv5-app-1
```

---

## 🏥 Health Check

### Backend API
```bash
curl http://localhost:3000/health
```

Beklenen yanıt:
```json
{
  "status": "healthy",
  "version": "7.0.0",
  "database": "connected",
  "services": {
    "database": true,
    "redis": true
  }
}
```

### Frontend
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002
# Beklenen: 200
```

### Database
```bash
docker exec desewebv5-db-1 pg_isready
# Beklenen: accepting connections
```

### Redis
```bash
docker exec desewebv5-redis-1 redis-cli ping
# Beklenen: PONG
```

---

## 🔧 Yaygın Sorunlar ve Çözümler

### 1. App Container "unhealthy"
```bash
# Logları kontrol et
docker logs desewebv5-app-1 --tail 50

# Yeniden build et
docker compose up -d --build app
```

### 2. Database Bağlantı Hatası
```bash
# Container durumunu kontrol et
docker compose ps db

# Logs
docker logs desewebv5-db-1

# Manuel bağlantı testi
docker exec -it desewebv5-db-1 psql -U dese -d dese_ea_plan_v5
```

### 3. Port Çakışması
```bash
# Portları kontrol et
netstat -an | findstr "3000\|3002\|5432\|6379"

# Docker'daki portları temizle
docker compose down
docker compose up -d
```

### 4. Volume/Cache Sorunları
```bash
# Temiz başlangıç
docker compose down -v
docker system prune -f
docker compose up -d --build
```

---

## 📁 Önemli Dosyalar

```
├── docker-compose.yml          # Ana Docker Compose
├── Dockerfile                  # Backend Dockerfile
├── frontend/Dockerfile         # Frontend Dockerfile
├── scripts/
│   ├── docker-entrypoint.sh    # Container başlangıç scripti
│   ├── wait-for-db.sh          # DB hazır bekleme
│   └── check-env.sh            # Environment kontrolü
├── config/
│   └── mosquitto/
│       └── mosquitto.conf      # MQTT yapılandırması
└── monitoring/
    ├── prometheus.yml          # Prometheus yapılandırması
    └── grafana/
        └── dashboards/         # Grafana dashboard'ları
```

---

## 🔄 Geliştirme Workflow'u

### Hybrid Mode (Önerilen)
```bash
# 1. Altyapıyı Docker'da başlat
docker compose up -d db redis mosquitto

# 2. Backend'i lokalde çalıştır
pnpm dev

# 3. Frontend'i lokalde çalıştır
cd frontend && pnpm dev
```

### Full Docker Mode
```bash
# Tümü Docker'da
docker compose up -d

# Değişiklik sonrası rebuild
docker compose up -d --build app
```

---

## 🛠 Teknik Notlar

### TSX Runtime Transpilation
Proje TypeScript strict mod yerine TSX runtime transpilation kullanır:

```json
// package.json
"start": "tsx src/index.ts"
```

Bu yaklaşımın avantajları:
- Hızlı başlangıç
- Hot reload desteği
- Tip hatalarında fail-fast yok (development friendly)

Dezavantajları:
- Runtime performans overhead'i (minimal)
- Derleme zamanı tip kontrolü yok

### TypeScript Strict Mode
`tsconfig.json` relaxed mode kullanır:
```json
{
  "strict": false,
  "noImplicitAny": false,
  "strictNullChecks": false
}
```

Tip güvenliği için IDE linting'e güvenin.

---

## 📊 Monitoring

### Prometheus
- URL: http://localhost:9090
- Targets: http://localhost:9090/targets

### Grafana
- URL: http://localhost:3003
- Varsayılan kullanıcı: admin/admin

### App Metrics
- URL: http://localhost:3000/metrics

---

## 🔐 Environment Variables

Gerekli environment değişkenleri için `.env.example` dosyasına bakın.

Kritik değişkenler:
```bash
DATABASE_URL=postgresql://dese:dese123@db:5432/dese_ea_plan_v5
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key-min-32-chars
```

---

## 📝 Changelog

### 27 Kasım 2025
- TSX runtime transpilation'a geçildi
- Schema çakışmaları düzeltildi
- Rate limit config eksiklikleri giderildi
- PayPal ve iyzico config eklendi
- Express router type annotations eklendi
- Prometheus metric exports düzeltildi

