# Google Cloud Migration - Faz 5: Build Troubleshooting

**Proje:** Dese EA Plan v6.8.0  
**Tarih:** 2025-01-27  
**Versiyon:** 6.8.0

---

## 🔍 Build Durumu Kontrolü

### Build İşlemi Durdu mu?

Build işlemi arka planda çalıştırıldı ancak durdu görünüyor. Kontrol edin:

```bash
# Artifact Registry'de image var mı?
gcloud artifacts docker images list europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images

# Docker process'leri
docker ps

# Docker build işlemleri
docker images | grep dese-ea-plan-images
```

---

## 🔧 Çözümler

### Senaryo 1: Build İşlemi Hiç Başlamadı

**Çözüm:** Script'i tekrar çalıştırın:

```powershell
.\scripts\gcp-build-push-images.ps1
```

### Senaryo 2: Build İşlemi Hata Verdi

**Kontroller:**

1. **Docker Desktop çalışıyor mu?**
   ```powershell
   docker info
   ```

2. **Disk alanı yeterli mi?**
   ```powershell
   docker system df
   ```

3. **Memory limit yeterli mi?**
   - Docker Desktop Settings → Resources → Memory: En az 4GB

### Senaryo 3: Build Çok Yavaş

**Optimizasyonlar:**

- ✅ `.dockerignore` oluşturuldu (✅ Yapıldı)
- ✅ Dockerfile lockfile handling düzeltildi (✅ Yapıldı)

**Ek Kontroller:**

```bash
# Build cache temizle (gerekirse)
docker builder prune -a

# Disk alanı temizle
docker system prune -a --volumes
```

---

## 🚀 Manuel Build ve Push

Script çalışmıyorsa, manuel olarak build edebilirsiniz:

### 1. API Image

```powershell
# Build
docker build -t europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.0 -f Dockerfile .

# Tag
docker tag europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.0 europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:latest

# Push
docker push europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.0
docker push europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:latest
```

### 2. Frontend Image

```powershell
# Build
docker build -t europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:v6.8.0 -f frontend/Dockerfile ./frontend

# Tag
docker tag europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:v6.8.0 europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:latest

# Push
docker push europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:v6.8.0
docker push europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:latest
```

---

## ⚠️ Yaygın Hatalar

### 1. "Cannot connect to Docker daemon"

**Çözüm:**
```powershell
# Docker Desktop'ı başlat
# Docker Desktop Settings → General → Start Docker Desktop when you log in
```

### 2. "No space left on device"

**Çözüm:**
```powershell
# Docker temizle
docker system prune -a --volumes

# Disk alanı kontrol et
docker system df
```

### 3. "Authentication required"

**Çözüm:**
```powershell
# Docker'ı yeniden yetkilendir
gcloud auth configure-docker europe-west3-docker.pkg.dev
```

### 4. "pnpm-lock.yaml mismatch"

**Çözüm:**
- ✅ Dockerfile'da `--no-frozen-lockfile` kullanılıyor (Yapıldı)
- Gerekirse lockfile'ı güncelleyin: `pnpm install`

---

## 📋 Build Kontrol Listesi

- [ ] Docker Desktop çalışıyor
- [ ] Disk alanı yeterli (>10GB)
- [ ] Memory yeterli (4GB+)
- [ ] `.dockerignore` mevcut
- [ ] Dockerfile güncel
- [ ] Artifact Registry API aktif
- [ ] Repository oluşturuldu
- [ ] Docker yetkilendirildi

---

## 🎯 Hızlı Test

Sadece API image'ını build edip test etmek için:

```powershell
# Build (test)
docker build -t dese-api-test -f Dockerfile .

# Eğer başarılıysa, tam build yapın
.\scripts\gcp-build-push-images.ps1
```

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

