# 📍 REDIS_URL Nasıl Bulunur?

**Tarih:** 2025-01-27  
**Hedef:** Production deployment için REDIS_URL'i bulma rehberi

---

## 🔍 REDIS_URL Nedir?

`REDIS_URL` Redis cache/session store'a bağlanmak için kullanılan connection string'idir.

**Format:**
```
redis://:password@host:port
```
veya şifre yoksa:
```
redis://host:port
```

**Örnek:**
```
redis://:redis_password_123@redis.poolfab.com.tr:6379
```

---

## 📋 REDIS_URL'i Nereden Bulabilirsiniz?

### 1️⃣ **Production Redis Bilgilerini Sistem Yöneticisinden İsteyin**

**En güvenli yöntem:** Production Redis bilgileri genellikle sistem yöneticisi veya DevOps ekibi tarafından yönetilir.

**İstemeniz gerekenler:**
- Redis host (IP veya domain)
- Redis port (genellikle 6379)
- Redis password (varsa)
- Redis database number (varsa, genellikle 0)

**Sonra formatı şöyle oluşturun:**
```
redis://:password@host:port
```

---

### 2️⃣ **Kubernetes Secrets'tan Alın**

Eğer production cluster'a erişiminiz varsa:

**Komut:**
```bash
kubectl get secret dese-ea-plan-v5-secrets -n dese-ea-plan-v5 -o jsonpath='{.data.REDIS_URL}' | base64 -d
```

**PowerShell:**
```powershell
kubectl get secret dese-ea-plan-v5-secrets -n dese-ea-plan-v5 -o jsonpath='{.data.REDIS_URL}' | ForEach-Object { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }
```

---

### 3️⃣ **Mevcut .env Dosyasından Kontrol Edin**

**Dikkat:** `.env` dosyası genellikle **development** ortamı için yapılandırılmıştır, **production** bilgileri içermez.

**Yine de kontrol edebilirsiniz:**
```powershell
# .env dosyası varsa kontrol edin
if (Test-Path .env) {
    Get-Content .env | Select-String "REDIS_URL"
}
```

**Not:** `.env` dosyasındaki REDIS_URL genellikle local development için yapılandırılmıştır (örn: `localhost` veya `redis` hostname).

---

### 4️⃣ **Production Redis Yöneticisinden Bilgi Alın**

**Sorulması gereken sorular:**

1. **Redis nerede çalışıyor?**
   - Cloud (Redis Cloud, AWS ElastiCache, GCP Memorystore)?
   - Self-hosted?
   - Kubernetes içinde mi?

2. **Connection bilgileri nedir?**
   - Host: `redis.poolfab.com.tr` veya IP adresi
   - Port: Genellikle `6379`
   - Password: Redis şifresi (varsa)
   - Database: Genellikle `0` (varsayılan)

3. **Network erişimi:**
   - Redis public erişime açık mı?
   - VPC/Private network içinde mi?
   - Whitelist/IP kısıtlaması var mı?

---

## 🛠️ REDIS_URL Oluşturma Yardımcı Script'i

Bilgileri aldıktan sonra REDIS_URL'i oluşturmak için:

```powershell
.\scripts\build-redis-url.ps1
```

Bu script size sorular soracak ve REDIS_URL'i oluşturacak.

---

## 📝 Örnek Senaryolar

### Senaryo 1: Redis Cloud / Managed Redis

Eğer Redis Cloud veya başka bir managed Redis service kullanıyorsanız:

**Connection bilgileri genellikle şu formatta verilir:**
```
redis://:password@host:port
```

**Örnek:**
```
redis://:redis_cloud_password@redis-12345.c1.cloudprovider.com:6379
```

---

### Senaryo 2: Kubernetes İçinde Redis

Eğer Redis Kubernetes içinde çalışıyorsa:

**Service name ve namespace:**
```
redis://:password@redis-service.namespace:6379
```

**Örnek:**
```
redis://:redis123@redis-service.dese-ea-plan-v5:6379
```

**Şifre yoksa:**
```
redis://redis-service.dese-ea-plan-v5:6379
```

---

### Senaryo 3: External Redis Server

Eğer harici bir Redis sunucusu kullanıyorsanız:

**External IP veya domain:**
```
redis://:password@redis.poolfab.com.tr:6379
```

**Şifre yoksa:**
```
redis://redis.poolfab.com.tr:6379
```

---

### Senaryo 4: Local Development (Docker Compose)

Development için Docker Compose kullanıyorsanız:

```
redis://redis:6379
```

**⚠️ Dikkat:** Bu sadece development için, production'da kullanmayın!

---

## 🔐 Güvenlik Notları

1. **Password Encoding:**
   - Eğer password özel karakterler içeriyorsa (örn: `@`, `:`, `/`), URL encoding yapmalısınız
   - Örnek: `password@123` → `password%40123`

2. **Production Password:**
   - Production password'u asla kod içinde göstermeyin
   - Asla log'lara yazdırmayın
   - Sadece GitHub Secrets'da saklayın

3. **TLS/SSL Connection:**
   - Production'da TLS/SSL kullanıyorsanız:
   ```
   rediss://:password@host:port
   ```
   - Not: `rediss://` (çift 's') SSL için kullanılır

---

## 📊 REDIS_URL Format Detayları

### Basit Format (şifre yok)

```
redis://host:port
```

**Örnek:**
```
redis://localhost:6379
redis://redis.poolfab.com.tr:6379
```

---

### Password ile Format

```
redis://:password@host:port
```

**⚠️ Dikkat:** Username yoksa, password'tan önce `:` koyun.

**Örnek:**
```
redis://:mypassword123@redis.poolfab.com.tr:6379
```

---

### Username ve Password ile Format

```
redis://username:password@host:port
```

**Örnek:**
```
redis://default:mypassword123@redis.poolfab.com.tr:6379
```

---

### Database Number ile Format

```
redis://:password@host:port/database_number
```

**Örnek:**
```
redis://:mypassword123@redis.poolfab.com.tr:6379/0
redis://:mypassword123@redis.poolfab.com.tr:6379/1
```

---

### TLS/SSL ile Format

```
rediss://:password@host:port
```

**Örnek:**
```
rediss://:mypassword123@redis.poolfab.com.tr:6380
```

---

## 🆘 Yardım

**REDIS_URL'i bulamıyorsanız:**

1. **Sistem Yöneticisine sorun:**
   - Production Redis connection bilgilerini isteyin
   - DevOps ekibi ile iletişime geçin

2. **Mevcut deployment'ı kontrol edin:**
   - Kubernetes secrets'ı kontrol edin
   - Production environment variable'ları kontrol edin

3. **Redis yönetim paneli:**
   - Eğer bir Redis yönetim aracı varsa (RedisInsight, Redis Commander, vb.), connection bilgilerini oradan kontrol edin

---

## 📚 İlgili Dokümanlar

- `docs/GITHUB_SECRETS_ADD_GUIDE.md` - Secrets ekleme rehberi
- `docs/FIND_DATABASE_URL.md` - DATABASE_URL bulma rehberi
- `env.example` - Environment variable örnekleri
- `k8s/secret.yaml` - Kubernetes secret örneği

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0

