# ✅ Production Deployment Checklist - v6.8.2

**Version:** 6.8.2  
**Date:** 2025-01-27  
**Status:** Ready for Deployment

---

## 📋 Pre-Deployment Checklist

### 1. Code & Build

- [x] Backend build başarılı (`pnpm build:backend`)
- [x] Frontend build başarılı (`pnpm build:frontend`)
- [x] Tüm type hataları düzeltildi
- [x] Git commit yapıldı
- [x] Kubernetes deployment dosyaları v6.8.2 için güncellendi

### 2. Environment Variables

- [ ] Production `.env` dosyası hazır
- [ ] `JWT_SECRET` production için değiştirildi (min 32 karakter)
- [ ] `COOKIE_KEY` production için değiştirildi (min 32 karakter)
- [ ] `DATABASE_URL` production database'e ayarlandı
- [ ] `REDIS_URL` production Redis'e ayarlandı
- [ ] `CORS_ORIGIN` production domain'e ayarlandı (`https://app.poolfab.com.tr`)
- [ ] `GOOGLE_CALLBACK_URL` production domain'e ayarlandı (`https://api.poolfab.com.tr/api/v1/auth/google/callback`)
- [ ] Tüm API keys production için ayarlandı

### 3. Kubernetes Secrets

- [ ] `dese-db-secret` oluşturuldu/kontrol edildi
  ```bash
  kubectl get secret dese-db-secret -n default
  ```
- [ ] `dese-redis-secret` oluşturuldu/kontrol edildi
  ```bash
  kubectl get secret dese-redis-secret -n default
  ```
- [ ] Secrets doğru değerleri içeriyor

### 4. Database

- [ ] Production database hazır
- [ ] Database migration çalıştırıldı (`pnpm db:migrate`)
- [ ] Database backup alındı (varsa mevcut veri)
- [ ] Database connection test edildi

### 5. Docker Images

- [ ] Google Cloud authentication yapıldı
  ```bash
  gcloud auth configure-docker europe-west3-docker.pkg.dev
  ```
- [ ] Backend image build edildi
- [ ] Frontend image build edildi
- [ ] Images registry'ye push edildi
- [ ] Image tag'leri doğru (v6.8.2)

---

## 🚀 Deployment Steps

### Option 1: Automated Script (Önerilen)

**Windows PowerShell:**
```powershell
.\scripts\deploy-production.ps1 -Target all
```

**Linux/Mac:**
```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh all
```

### Option 2: Manual Steps

#### Step 1: Build & Push Docker Images

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

#### Step 2: Database Migration

```bash
export DATABASE_URL="postgresql://user:password@host:5432/database"
pnpm db:migrate
```

#### Step 3: Deploy to Kubernetes

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

---

## 🔍 Post-Deployment Verification

### 1. Pod Status

```bash
# Check all pods
kubectl get pods

# Check backend pods
kubectl get pods -l app=dese-api

# Check frontend pods
kubectl get pods -l app=dese-frontend
```

### 2. Health Checks

```bash
# Backend health
curl https://api.poolfab.com.tr/health

# Frontend health
curl https://app.poolfab.com.tr/
```

### 3. Logs

```bash
# Backend logs
kubectl logs -l app=dese-api --tail=100 -f

# Frontend logs
kubectl logs -l app=dese-frontend --tail=100 -f
```

### 4. Services & Ingress

```bash
# Check services
kubectl get svc

# Check ingress
kubectl get ingress
```

### 5. Functional Tests

- [ ] Frontend erişilebilir: https://app.poolfab.com.tr
- [ ] Backend API erişilebilir: https://api.poolfab.com.tr
- [ ] Login sayfası açılıyor
- [ ] Google OAuth çalışıyor
- [ ] Admin panel erişilebilir (admin kullanıcı ile)
- [ ] Database bağlantısı çalışıyor
- [ ] Redis cache çalışıyor

---

## 🔄 Rollback (If Needed)

### Rollback Backend

```bash
kubectl rollout undo deployment/dese-api-deployment -n default
kubectl rollout status deployment/dese-api-deployment -n default
```

### Rollback Frontend

```bash
kubectl rollout undo deployment/dese-frontend-deployment
kubectl rollout status deployment/dese-frontend-deployment
```

### Rollback to Specific Revision

```bash
# List revisions
kubectl rollout history deployment/dese-api-deployment -n default

# Rollback to specific revision
kubectl rollout undo deployment/dese-api-deployment -n default --to-revision=2
```

---

## 📊 Monitoring

### Prometheus Metrics

- Backend: `https://api.poolfab.com.tr/metrics`
- Frontend: `https://app.poolfab.com.tr/metrics`

### Grafana Dashboards

- Backend Dashboard: `Dese EA Plan Backend`
- Frontend Dashboard: `Dese EA Plan Frontend`

### Logs

```bash
# Real-time logs
kubectl logs -f -l app=dese-api -n default
kubectl logs -f -l app=dese-frontend
```

---

## 🐛 Troubleshooting

### Pod CrashLoopBackOff

```bash
# Check pod logs
kubectl logs <pod-name>

# Check pod events
kubectl describe pod <pod-name>

# Check environment variables
kubectl exec <pod-name> -- env
```

### Image Pull Errors

```bash
# Verify image exists
gcloud container images list --repository=europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images

# Check image pull secret
kubectl get secret
```

### Database Connection Issues

```bash
# Check database secret
kubectl get secret dese-db-secret -o yaml

# Test database connection
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- psql $DATABASE_URL
```

---

## ✅ Deployment Sign-Off

- [ ] All pre-deployment checks completed
- [ ] Deployment successful
- [ ] Health checks passed
- [ ] Functional tests passed
- [ ] Monitoring working
- [ ] Team notified

**Deployed by:** _________________  
**Date:** _________________  
**Time:** _________________  
**Version:** v6.8.2

---

## 📚 Related Documentation

- [PRODUCTION_DEPLOYMENT_V6.8.2.md](./PRODUCTION_DEPLOYMENT_V6.8.2.md) - Detailed deployment guide
- [PRODUCTION_ENV_CHECKLIST.md](./PRODUCTION_ENV_CHECKLIST.md) - Environment variables checklist
- [DEPLOYMENT.md](./DEPLOYMENT.md) - General deployment guide

