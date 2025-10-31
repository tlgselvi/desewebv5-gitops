# 🚀 Deployment Başlatma Durumu

**Tarih:** 2025-01-27  
**Durum:** Docker Desktop API Sorunu

## ⚠️ Mevcut Sorun

Docker Desktop API versiyonu uyumsuzluğu:
```
ERROR: request returned 500 Internal Server Error for API route and version 
http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/...
```

## ✅ Yapılanlar

1. ✅ Deployment script oluşturuldu (`scripts/deploy.ps1`)
2. ✅ `docker-compose.yml` düzenlendi (version uyarısı kaldırıldı)
3. ✅ Docker Desktop başlatma denemesi yapıldı

## 🔧 Çözüm Adımları

### 1. Docker Desktop'ı Manuel Başlatın

1. **Docker Desktop'ı tamamen kapatın** (tray'dan çıkın)
2. **Docker Desktop'ı yönetici olarak başlatın**:
   ```powershell
   Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -Verb RunAs
   ```
3. **Docker Desktop'ın tamamen açılmasını bekleyin** (tray icon yeşil olana kadar)

### 2. Docker Desktop Settings

1. **Settings > General** açın
2. **Use WSL 2 based engine** seçeneğini kontrol edin
3. **Settings > Kubernetes** açın
4. **Enable Kubernetes** checkbox'ını işaretleyin
5. **Apply & Restart** butonuna tıklayın

### 3. Docker Desktop Restart

Docker Desktop restart edildikten sonra:
```powershell
# Bağlantıyı test et
docker info

# Containers listele
docker ps

# Docker Compose ile deploy et
docker-compose up -d --build
```

## 🚀 Alternatif Deployment Yöntemleri

### Seçenek 1: Docker Compose (Local)
```powershell
# Docker Desktop başladıktan sonra
.\scripts\deploy.ps1 -Method docker-compose
```

### Seçenek 2: Kubernetes
```powershell
# Kubernetes enable edildikten sonra
.\scripts\deploy.ps1 -Method kubernetes -Environment staging
```

### Seçenek 3: Helm
```powershell
# Kubernetes ve Helm ile
.\scripts\deploy.ps1 -Method helm -Environment production
```

## 📋 Kontrol Listesi

- [ ] Docker Desktop tamamen başladı mı?
- [ ] Docker Desktop tray icon yeşil mi?
- [ ] `docker info` komutu çalışıyor mu?
- [ ] Kubernetes enable edildi mi?
- [ ] `kubectl cluster-info` çalışıyor mu?

## 🔍 Durum Kontrol Komutları

```powershell
# Docker durumu
docker info
docker ps

# Kubernetes durumu
kubectl cluster-info
kubectl get nodes

# Docker Compose durumu
docker-compose ps
```

## 💡 Notlar

- Docker Desktop tam başlamadan komutlar çalışmayabilir
- API versiyonu uyumsuzluğu Docker Desktop restart ile çözülebilir
- WSL 2 backend kullanıyorsanız, WSL'in de çalıştığından emin olun

---

**Sonraki Adım:** Docker Desktop'ı yönetici olarak başlatıp Kubernetes'i enable edin, sonra deployment script'ini tekrar çalıştırın.

