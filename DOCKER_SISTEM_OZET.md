# Docker Sistem Özeti - Dese EA Plan v5.0

> **Oluşturulma:** 2025-11-05  
> **Son Güncelleme:** 2025-11-05  
> **Proje:** Dese EA Plan v5.0

---

## 📍 Docker Veri Depolama Konumu

### Fiziksel Konum
- **Docker Data File:** `C:\Docker\WSLData\disk\docker_data.vhdx`
- **Boyut:** 39.13 GB
- **Disk:** C: (NVMe SSD - IM2P33F3 ADATA 256GB)
- **WSL BasePath:** `\\?\C:\Docker\WSLData\main`

### Disk Bilgileri
| Disk | Tip | Boyut | Boş Alan | Model |
|------|-----|-------|----------|-------|
| **C:** | **NVMe SSD** | 221.25 GB | 45.41 GB | IM2P33F3 NVMe ADATA 256GB |
| **D:** | **HDD** | 931.39 GB | 590.64 GB | TOSHIBA MQ04ABF100 |

**Not:** Docker verileri NVMe SSD üzerinde çalışıyor (performans için uygun).

---

## 🏗️ Proje Yapısı

### Proje Bilgileri
- **Proje Adı:** Dese EA Plan v5.0
- **Veritabanı:** `dese_ea_plan_v5`
- **Tech Stack:**
  - Frontend: Next.js 16 + React 19 + TypeScript
  - Backend: Node.js + Express + FastAPI
  - Database: PostgreSQL (Drizzle ORM)
  - Cache: Redis
  - Infrastructure: Docker + Kubernetes + Helm + ArgoCD
  - Monitoring: Prometheus + Grafana + Loki + Tempo

### Ana Modüller
- **FinBot:** Finance Engine (FastAPI, Python 3.11)
- **MuBot:** Accounting Engine (Express.js, TypeScript)
- **DESE:** Analytics Layer (Next.js 16 + React 19)
- **ArgoCD:** GitOps Platform
- **Monitoring Stack:** Prometheus, Grafana, Loki, Jaeger

---

## 🔒 Kritik Veriler (ASLA SİLİNMEYECEK)

### Docker Volume'ları
```
✅ desewebv5_postgres_data    - PostgreSQL veritabanı (docker-compose)
✅ desewebv5_redis_data       - Redis cache (docker-compose)
✅ postgres_data              - Yedek PostgreSQL volume
✅ redis_data                 - Yedek Redis volume
```

### Docker Compose Servisleri
```
✅ desewebv5-postgres-1       - postgres:16-alpine
✅ desewebv5-redis-1          - redis:7-alpine
```

### Kubernetes Servisleri (Aktif)
```
✅ ArgoCD Stack:
   - argocd-server
   - argocd-repo-server
   - argocd-application-controller
   - argocd-applicationset-controller
   - argocd-notifications-controller
   - argocd-dex-server
   - argocd-redis

✅ AIOps Servisleri:
   - finbot (ghcr.io/cptsystems/finbot:latest)
   - mubot (ghcr.io/cptsystems/mubot:latest)
   - cpt-agent-backend:1.0.0

✅ Autonomous Services:
   - orchestration-engine:latest
   - self-healing-engine:latest
   - self-optimization-engine:latest

✅ Monitoring Stack:
   - grafana (grafana/grafana:11.2.0)
   - prometheus (prom/prometheus:v2.54.0)
   - loki (grafana/loki:3.2.1)
   - jaeger (jaegertracing/all-in-one:1.51)

✅ Database:
   - postgres:14 (Kubernetes'te)
   - postgres:16-alpine (docker-compose)
```

---

## 🐳 Docker Image'ları

### Proje Image'ları
```
✅ dese-ea-plan-v5:fix (797MB) - Aktif Kubernetes'te
✅ tlgselvi/dese-ea-plan-v5:6.8.0 (796MB) - Yedek/rollback için
⚠️ tlgselvi/dese-ea-plan-v5:fix (797MB) - Kullanılmıyor (silinebilir)
```

### Kritik Image'lar (Silinmeyecek)
- `postgres:14`, `postgres:16-alpine` - Veritabanı
- `redis:7-alpine` - Cache
- `quay.io/argoproj/argocd:v3.1.9` - GitOps
- `ghcr.io/cptsystems/finbot:latest` - Finance Engine
- `ghcr.io/cptsystems/mubot:latest` - Accounting Engine
- `cpt-agent-backend:1.0.0` - Backend API
- Tüm monitoring image'ları (Grafana, Prometheus, Loki, Jaeger)
- Tüm autonomous services image'ları

---

## 🧹 Yapılan Temizlik İşlemleri

### Tarih: 2025-11-05

#### Öncesi
- **Images:** 38 adet, 34.57 GB
- **Build Cache:** 45 adet, 18.43 GB
- **Toplam:** ~53 GB

#### Sonrası
- **Images:** 33 adet, 11.67 GB
- **Build Cache:** 0 adet, 0 GB
- **Toplam:** ~12.67 GB

#### Kazanılan Alan
- **Dangling Images:** 93.52 MB (5 adet silindi)
- **Build Cache:** 20.9 GB (45 adet silindi)
- **Toplam Kazanç:** ~21 GB

#### Uygulanan Komutlar
```bash
# Dangling image'ları sil
docker image prune -f

# Build cache'i temizle
docker builder prune -a -f
```

**Sonuç:** ✅ Proje verilerine zarar verilmedi, tüm kritik servisler korundu.

---

## ⚠️ Güvenlik Notları

### Silinmeyecekler
1. ❌ **Volume'lar:** `desewebv5_postgres_data`, `desewebv5_redis_data`
2. ❌ **Kubernetes Image'ları:** ArgoCD, FinBot, MuBot, DESE
3. ❌ **Monitoring Image'ları:** Grafana, Prometheus, Loki, Jaeger
4. ❌ **Database Image'ları:** PostgreSQL, Redis
5. ❌ **Autonomous Services:** orchestration, self-healing, self-optimization

### Güvenle Silinebilirler
1. ✅ **Dangling Images:** `<none>:<none>` tag'li eski build'ler
2. ✅ **Build Cache:** Kullanılmayan build layer'ları
3. ⚠️ **Kullanılmayan Image'lar:** `mcp/playwright`, `ghcr.io/cptsystems/frontend:latest` (manuel kontrol gerekli)

---

## 📊 Mevcut Sistem Durumu

### Docker Disk Kullanımı
```
Images:      33 adet, 11.67 GB (3.61 GB geri kazanılabilir)
Containers:  228 adet, 726.2 MB (377.8 MB geri kazanılabilir)
Volumes:     12 adet, 199.8 MB (47.61 MB geri kazanılabilir)
Build Cache: 0 adet, 0 GB
```

### Aktif Servisler
- **Kubernetes:** 20+ pod çalışıyor
- **Docker Compose:** 2 servis çalışıyor (postgres, redis)
- **Monitoring:** Tüm servisler aktif

---

## 🔧 Bakım Komutları

### Güvenli Temizlik (Önerilen)
```bash
# Dangling image'ları sil
docker image prune -f

# Build cache'i temizle
docker builder prune -a -f

# Kullanılmayan container'ları sil
docker container prune -f

# Kullanılmayan volume'ları sil (DİKKAT: Proje volume'larını silmeyin!)
docker volume prune -f
```

### Disk Kullanımını Kontrol Et
```bash
# Genel durum
docker system df

# Detaylı durum
docker system df -v
```

### Proje Volume'larını Kontrol Et
```bash
# Volume listesi
docker volume ls

# Volume detayları
docker volume inspect desewebv5_postgres_data
docker volume inspect desewebv5_redis_data
```

---

## 📝 Notlar

1. **Docker verileri NVMe SSD'de:** Performans için optimal konum
2. **Proje verileri güvende:** Tüm volume'lar korundu
3. **Kubernetes aktif:** Tüm servisler çalışıyor
4. **Build cache temizlendi:** Sonraki build'ler biraz daha uzun sürebilir (normal)
5. **Yedek image korundu:** `6.8.0` tag'i rollback için tutuldu

---

## 🔄 Gelecek Bakım

### Önerilen Periyodik Temizlik
- **Haftalık:** Dangling image'lar ve build cache
- **Aylık:** Kullanılmayan container'lar ve volume'lar
- **Yarıyıllık:** Kapsamlı sistem temizliği

### Dikkat Edilmesi Gerekenler
- Volume'ları silmeden önce mutlaka yedek alın
- Kubernetes image'larını silmeden önce servislerin durumunu kontrol edin
- Production image'larını silmeden önce alternatif tag'lerin olduğundan emin olun

---

**Son Güncelleme:** 2025-11-05  
**Hazırlayan:** Cursor AI Assistant  
**Proje:** Dese EA Plan v5.0

