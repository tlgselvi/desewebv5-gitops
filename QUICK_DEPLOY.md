# ⚡ Quick Deploy - Hızlı Başlangıç

## 🚀 Tek Komutla Full Deployment

```powershell
.\scripts\full-deploy.ps1 -Environment staging
```

## 📋 Adımlar

### 1. Docker Desktop Hazırlığı (İLK KEZ)
```powershell
# Docker Desktop'ı yönetici olarak başlat
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -Verb RunAs

# Kubernetes enable (Settings > Kubernetes > Enable)
```

### 2. Docker Desktop Bağlantısını Kontrol Et
```powershell
docker info
# Hata yoksa devam et
```

### 3. Full Deployment Çalıştır
```powershell
.\scripts\full-deploy.ps1 -Environment staging
```

## 🎯 Deployment Senaryoları

### Senaryo 1: Local Test
```powershell
.\scripts\full-deploy.ps1 -Environment local -SkipTests
```

### Senaryo 2: Staging
```powershell
.\scripts\full-deploy.ps1 -Environment staging
```

### Senaryo 3: Production
```powershell
.\scripts\full-deploy.ps1 -Environment production -ImageTag "v5.0.0" -RegistryUrl "ghcr.io/your-org" -PushImages
```

## ⚠️ Sorun Durumunda

### Docker Desktop Bağlanmıyor
1. Docker Desktop'ı kapatın
2. Yönetici olarak başlatın
3. Settings > General > "Use WSL 2 based engine" kontrol edin
4. Restart edin

### Build Hatası
```powershell
# Manuel build
npx tsc
# veya
npx pnpm@8.15.0 build
```

### Kubernetes Bağlanmıyor
```powershell
# Kubernetes enable
# Docker Desktop > Settings > Kubernetes > Enable Kubernetes
kubectl cluster-info
```

---

**Hazır olduğunda:** `.\scripts\full-deploy.ps1 -Environment staging`

