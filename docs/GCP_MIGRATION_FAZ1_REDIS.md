# Google Cloud Migration - Faz 1: Memorystore for Redis

**Proje:** Dese EA Plan v6.8.0  
**Tarih:** 2025-01-27  
**Versiyon:** 6.8.0  
**Durum:** ✅ Başarıyla Tamamlandı

---

## 🎯 Amaç

Projenin cache mekanizması (Redis 7+) için Google Cloud Memorystore for Redis instance'ı oluşturmak.

---

## ✅ Instance Oluşturuldu

### Instance Bilgileri

| Özellik | Değer |
|---------|-------|
| **Instance Adı** | `dese-ea-plan-cache` |
| **Proje ID** | `ea-plan-seo-project` |
| **Redis Version** | `redis_7_0` (Redis 7+) |
| **Region** | `europe-west3` (Frankfurt) |
| **Tier** | `BASIC` |
| **Kapasite (Size)** | `1 GB` |
| **Bağlantı Modu** | `DIRECT_PEERING` (Standart) |
| **Status** | `READY` ✅ |

---

## 📋 Gereksinimler

### 1. API Aktifleştirme

```bash
gcloud services enable redis.googleapis.com
```

**Durum:** ✅ API aktif edildi

### 2. Instance Oluşturma Komutu

```bash
gcloud redis instances create dese-ea-plan-cache \
  --size=1 \
  --tier=BASIC \
  --region=europe-west3 \
  --redis-version=redis_7_0
```

**Durum:** ✅ Instance başarıyla oluşturuldu

---

## 🔗 Connection Bilgileri

Instance oluşturulduktan sonra connection bilgilerini almak için:

```bash
gcloud redis instances describe dese-ea-plan-cache --region=europe-west3
```

### Host ve Port

Instance detaylarından alınacak:
- **Host:** `<instance-host-ip>`
- **Port:** `6379` (default Redis port)

---

## 📝 Environment Variable

`.env` dosyanıza ekleyin:

```env
REDIS_HOST=<instance-host-ip>
REDIS_PORT=6379
REDIS_URL=redis://<instance-host-ip>:6379
```

---

## 🎯 Neden `europe-west3` (Frankfurt)?

- ✅ Cloud SQL instance ile aynı bölgede (düşük latency)
- ✅ Türkiye'ye yakın (düşük gecikme süresi)
- ✅ Yüksek performans için aynı region'da

---

## 💰 Maliyet

- **Tier:** BASIC (maliyet-etkin)
- **Kapasite:** 1 GB
- **Tahmini Maliyet:** ~$30-40/ay (bölgeye göre değişir)

---

## 📋 Sonraki Adımlar

1. ✅ API aktif edildi
2. ✅ Instance oluşturuldu
3. ⏳ Connection bilgilerini al
4. ⏳ Environment variable'ları güncelle
5. ⏳ Connection test et
6. ⏳ Uygulamada Redis entegrasyonu

---

## 🔒 Güvenlik Notları

1. **Network:** Instance default VPC network'ünde
2. **Access Control:** Firewall kuralları ile kontrol edilebilir
3. **Encryption:** Transit encryption aktif (opsiyonel)

---

## ⚠️ Önemli Notlar

1. **Redis Version:** `redis_7_0` (küçük harf, alt çizgi ile)
2. **Tier:** `BASIC` (standart instance)
3. **Size:** `1` (1 GB kapasite)
4. **Region:** `europe-west3` (Cloud SQL ile aynı)

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

