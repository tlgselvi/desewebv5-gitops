# 🚀 Full Deployment Guide - Dese EA Plan v5.0

**Tarih:** 2025-01-27  
**Versiyon:** 5.0.0

## 📋 Full Deployment Adımları

Full deployment şu adımları içerir:
1. ✅ Prerequisites check
2. ✅ Tests (opsiyonel)
3. ✅ Build application
4. ✅ Build Docker image
5. ✅ Push to registry (opsiyonel)
6. ✅ Deploy to Kubernetes/Docker Compose
7. ✅ Health checks
8. ✅ Verification

## 🔧 Ön Gereksinimler

### 1. Docker Desktop
```powershell
# Docker Desktop'ı yönetici olarak başlatın
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -Verb RunAs
```

### 2. Kubernetes (Production/Staging için)
- Docker Desktop Settings > Kubernetes > Enable Kubernetes
- `kubectl cluster-info` komutu çalışmalı

### 3. Environment Variables
`.env` dosyasını oluşturun:
```powershell
Copy-Item env.example .env
# Sonra .env dosyasını düzenleyin
```

## 🚀 Full Deployment Komutları

### Staging Environment
```powershell
# Tam deployment (testler dahil)
.\scripts\full-deploy.ps1 -Environment staging

# Testleri atla
.\scripts\full-deploy.ps1 -Environment staging -SkipTests

# Image'ı registry'e push et
.\scripts\full-deploy.ps1 -Environment staging -PushImages -RegistryUrl "ghcr.io/your-org"
```

### Production Environment
```powershell
# Production deployment
.\scripts\full-deploy.ps1 -Environment production -ImageTag "v5.0.0" -RegistryUrl "ghcr.io/your-org" -PushImages
```

### Local Development
```powershell
# Local Docker Compose
.\scripts\full-deploy.ps1 -Environment local -SkipTests
```

## 📊 Deployment Script Özellikleri

### Otomatik İşlemler
- ✅ Prerequisites kontrolü
- ✅ Test çalıştırma (opsiyonel)
- ✅ TypeScript build
- ✅ Docker image build
- ✅ Kubernetes/Docker Compose deployment
- ✅ Health check
- ✅ Status report

### Parametreler
- `-Environment`: `staging`, `production`, veya `local`
- `-ImageTag`: Docker image tag (default: `latest-TIMESTAMP`)
- `-RegistryUrl`: Container registry URL (push için gerekli)
- `-SkipTests`: Testleri atla
- `-PushImages`: Image'ları registry'e push et

## 🔍 Deployment Sonrası Kontroller

### 1. Pod Status (Kubernetes)
```powershell
kubectl get pods -n dese-ea-plan-v5-staging
kubectl get pods -n dese-ea-plan-v5
```

### 2. Service Status
```powershell
kubectl get svc -n dese-ea-plan-v5-staging
kubectl get ingress -n dese-ea-plan-v5-staging
```

### 3. Health Check
```powershell
# Local
curl http://localhost:3000/health

# Kubernetes (port-forward ile)
kubectl port-forward -n dese-ea-plan-v5-staging svc/dese-ea-plan-v5 3000:3000
curl http://localhost:3000/health
```

### 4. Logs
```powershell
# Docker Compose
docker-compose logs -f app

# Kubernetes
kubectl logs -f deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-staging
```

## 🐛 Sorun Giderme

### Docker Desktop Bağlantı Sorunu
```
ERROR: request returned 500 Internal Server Error for API route
```

**Çözüm:**
1. Docker Desktop'ı tamamen kapatın
2. Yönetici olarak başlatın
3. Settings > General > "Use WSL 2 based engine" kontrol edin
4. Docker Desktop'ı restart edin

### Build Hatası
```
Error: Cannot find module 'corepack'
```

**Çözüm:**
```powershell
# Corepack enable
corepack enable
# veya
npx pnpm@8.15.0 build
```

### Kubernetes Bağlantı Sorunu
```
Unable to connect to the server
```

**Çözüm:**
1. Docker Desktop Settings > Kubernetes > Enable Kubernetes
2. `kubectl config current-context` ile context kontrolü
3. `kubectl cluster-info` ile bağlantı testi

## 📈 Deployment Süreci

```
┌─────────────────┐
│  Prerequisites  │
│     Check       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Run Tests     │ (SkipTests)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build App      │
│  (TypeScript)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build Docker    │
│    Image        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Push Image     │ (PushImages)
│   (Optional)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Deploy to     │
│  K8s/Compose    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Health Check   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Status Report  │
└─────────────────┘
```

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Docker Desktop çalışıyor
- [ ] Kubernetes enable (production/staging için)
- [ ] `.env` dosyası hazır
- [ ] Git commit yapıldı
- [ ] Testler geçiyor

### Deployment
- [ ] Build başarılı
- [ ] Docker image oluşturuldu
- [ ] Kubernetes resources uygulandı
- [ ] Pods running durumunda

### Post-Deployment
- [ ] Health check geçiyor
- [ ] Logs kontrol edildi
- [ ] Service erişilebilir
- [ ] Metrics toplanıyor

## 🎯 Hızlı Başlangıç

### 1. Docker Desktop'ı Hazırlayın
```powershell
# Docker Desktop'ı başlatın ve Kubernetes'i enable edin
```

### 2. Environment Variables Ayarlayın
```powershell
Copy-Item env.example .env
# .env dosyasını düzenleyin
```

### 3. Full Deployment Çalıştırın
```powershell
.\scripts\full-deploy.ps1 -Environment staging
```

---

**Script Dosyası:** `scripts/full-deploy.ps1`  
**Version:** 5.0.0  
**Last Updated:** 2025-01-27

