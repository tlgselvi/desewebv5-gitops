# ⚡ Quick Deployment Guide - v6.8.2

**Version:** 6.8.2  
**Date:** 2025-01-27

---

## 🚀 Hızlı Deployment (Production)

### Prerequisites

1. Google Cloud CLI kurulu ve authenticated
2. kubectl kurulu ve production cluster'a bağlı
3. Docker kurulu ve çalışıyor
4. Production environment variables hazır

### Tek Komutla Deployment

**Windows PowerShell:**
```powershell
.\scripts\deploy-production.ps1 -Target all
```

**Linux/Mac:**
```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh all
```

---

## 📋 Manuel Deployment Adımları

### 1. Google Cloud Authentication

```bash
gcloud auth login
gcloud auth configure-docker europe-west3-docker.pkg.dev
```

### 2. Build & Push Docker Images

**Backend:**
```bash
docker build -t europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.2 .
docker push europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.2
```

**Frontend:**
```bash
cd frontend
docker build -t europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:v6.8.2 .
docker push europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:v6.8.2
cd ..
```

### 3. Database Migration

```bash
export DATABASE_URL="postgresql://user:password@host:5432/database"
pnpm db:migrate
```

### 4. Deploy to Kubernetes

**Backend:**
```bash
kubectl apply -f k8s/deployment-api.yaml
kubectl rollout status deployment/dese-api-deployment -n default --timeout=5m
```

**Frontend:**
```bash
kubectl apply -f k8s/04-dese-frontend-deployment.yaml
kubectl rollout status deployment/dese-frontend-deployment --timeout=5m
```

### 5. Verify Deployment

```bash
# Check pods
kubectl get pods

# Check services
kubectl get svc

# Health checks
curl https://api.poolfab.com.tr/health
curl https://app.poolfab.com.tr/
```

---

## 🔄 Rollback (If Needed)

```bash
# Backend rollback
kubectl rollout undo deployment/dese-api-deployment -n default

# Frontend rollback
kubectl rollout undo deployment/dese-frontend-deployment
```

---

## 📚 Detaylı Dokümantasyon

- [PRODUCTION_DEPLOYMENT_CHECKLIST.md](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Detaylı checklist
- [PRODUCTION_DEPLOYMENT_V6.8.2.md](./PRODUCTION_DEPLOYMENT_V6.8.2.md) - Kapsamlı rehber
- [PRODUCTION_ENV_CHECKLIST.md](./PRODUCTION_ENV_CHECKLIST.md) - Environment variables

---

**Not:** Production deployment için production ortamında çalıştırın!

