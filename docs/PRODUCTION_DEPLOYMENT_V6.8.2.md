# 🚀 Production Deployment Guide - v6.8.2

**Version:** 6.8.2  
**Date:** 2025-01-27  
**Status:** Ready for Deployment

---

## 📋 Özet

Bu doküman, Dese EA Plan v6.8.2'nin production ortamına (Kubernetes) deploy edilmesi için adım adım rehberdir.

### Production URLs

- **Frontend:** https://app.poolfab.com.tr
- **Backend API:** https://api.poolfab.com.tr
- **Image Registry:** `europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/`

---

## ✅ Pre-Deployment Checklist

### Build & Test

- [x] Backend build başarılı (`pnpm build:backend`)
- [x] Frontend build başarılı (`pnpm build:frontend`)
- [x] Tüm type hataları düzeltildi
- [ ] Testler geçti (`pnpm test`) - **Opsiyonel**
- [ ] Linting geçti (`pnpm lint`) - **Opsiyonel**

### Environment Variables

- [ ] Production environment variables ayarlandı
- [ ] `JWT_SECRET` production için değiştirildi
- [ ] `COOKIE_KEY` production için değiştirildi
- [ ] `DATABASE_URL` production database'e ayarlandı
- [ ] `REDIS_URL` production Redis'e ayarlandı
- [ ] `CORS_ORIGIN` production domain'e ayarlandı
- [ ] `GOOGLE_CALLBACK_URL` production domain'e ayarlandı

### Database

- [ ] Production database hazır
- [ ] Database migration çalıştırıldı (`pnpm db:migrate`)
- [ ] Database backup alındı (varsa mevcut veri)

### Docker Images

- [ ] Docker images build edildi (CI/CD pipeline'da)
- [ ] Images Google Container Registry'ye push edildi
- [ ] Image tag'leri doğru (v6.8.2)

---

## 🐳 Docker Image Build & Push

### 1. Google Cloud Authentication

```bash
# Google Cloud'a giriş yap
gcloud auth login

# Docker registry'ye authentication
gcloud auth configure-docker europe-west3-docker.pkg.dev
```

### 2. Build Docker Images

```bash
# Backend image build
docker build -t europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.2 .

# Frontend image build (frontend klasöründe)
cd frontend
docker build -t europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:v6.8.2 .
cd ..
```

### 3. Push Images to Registry

```bash
# Backend image push
docker push europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.2

# Frontend image push
docker push europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:v6.8.2
```

**Not:** Bu adımlar genellikle CI/CD pipeline'da otomatik yapılır.

---

## ☸️ Kubernetes Deployment

### 1. Kubernetes Context Kontrolü

```bash
# Mevcut context'i kontrol et
kubectl config current-context

# Doğru cluster'a bağlı olduğundan emin ol
kubectl cluster-info
```

### 2. Secrets Kontrolü

```bash
# Database secret kontrolü
kubectl get secret dese-db-secret -n default

# Redis secret kontrolü
kubectl get secret dese-redis-secret -n default

# Eğer yoksa oluştur:
kubectl create secret generic dese-db-secret \
  --from-literal=DATABASE_URL="postgresql://user:password@host:5432/database"

kubectl create secret generic dese-redis-secret \
  --from-literal=REDIS_URL="redis://host:6379"
```

### 3. Database Migration

```bash
# Production database'e bağlan ve migration çalıştır
export DATABASE_URL="postgresql://user:password@host:5432/database"
pnpm db:migrate
```

### 4. Backend API Deployment

```bash
# Deployment'ı uygula
kubectl apply -f k8s/deployment-api.yaml

# Deployment durumunu kontrol et
kubectl rollout status deployment/dese-api-deployment

# Pod'ları kontrol et
kubectl get pods -l app=dese-api
```

### 5. Frontend Deployment

```bash
# Deployment'ı uygula
kubectl apply -f k8s/04-dese-frontend-deployment.yaml

# Deployment durumunu kontrol et
kubectl rollout status deployment/dese-frontend-deployment

# Pod'ları kontrol et
kubectl get pods -l app=dese-frontend
```

### 6. Service & Ingress Kontrolü

```bash
# Service'leri kontrol et
kubectl get svc -l app=dese-api
kubectl get svc -l app=dese-frontend

# Ingress'leri kontrol et
kubectl get ingress dese-api-ingress
kubectl get ingress dese-frontend-ingress

# Eğer yoksa oluştur:
kubectl apply -f k8s/service-api.yaml
kubectl apply -f k8s/service-frontend.yaml
kubectl apply -f k8s/ingress-api.yaml
kubectl apply -f k8s/ingress-frontend.yaml
```

---

## 🔍 Post-Deployment Kontrol

### 1. Health Checks

```bash
# Backend health check
curl https://api.poolfab.com.tr/health

# Frontend health check
curl https://app.poolfab.com.tr/
```

### 2. Log Kontrolü

```bash
# Backend logs
kubectl logs -l app=dese-api --tail=100 -f

# Frontend logs
kubectl logs -l app=dese-frontend --tail=100 -f
```

### 3. Pod Durumu

```bash
# Tüm pod'ları kontrol et
kubectl get pods

# Pod detayları
kubectl describe pod <pod-name>
```

### 4. Resource Kullanımı

```bash
# Resource kullanımını kontrol et
kubectl top pods
kubectl top nodes
```

---

## 🔄 Rollback (Gerekirse)

Eğer deployment başarısız olursa:

```bash
# Backend rollback
kubectl rollout undo deployment/dese-api-deployment

# Frontend rollback
kubectl rollout undo deployment/dese-frontend-deployment

# Belirli bir revision'a rollback
kubectl rollout undo deployment/dese-api-deployment --to-revision=2
```

---

## 📊 Monitoring

### Prometheus Metrics

- Backend metrics: `https://api.poolfab.com.tr/metrics`
- Frontend metrics: `https://app.poolfab.com.tr/metrics`

### Grafana Dashboards

- Backend dashboard: Grafana'da `Dese EA Plan Backend` dashboard'u
- Frontend dashboard: Grafana'da `Dese EA Plan Frontend` dashboard'u

---

## 🐛 Troubleshooting

### Pod CrashLoopBackOff

```bash
# Pod loglarını kontrol et
kubectl logs <pod-name>

# Pod detaylarını kontrol et
kubectl describe pod <pod-name>

# Environment variables'ı kontrol et
kubectl exec <pod-name> -- env
```

### Image Pull Errors

```bash
# Image'in registry'de olduğunu kontrol et
gcloud container images list --repository=europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images

# Image pull secret'ı kontrol et
kubectl get secret
```

### Database Connection Issues

```bash
# Database secret'ı kontrol et
kubectl get secret dese-db-secret -o yaml

# Database bağlantısını test et
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- psql $DATABASE_URL
```

---

## 📝 Deployment Notları

### v6.8.2 Değişiklikleri

- ✅ Passport.js Google OAuth entegrasyonu
- ✅ RBAC (Role-Based Access Control) middleware
- ✅ Admin panel ve user management
- ✅ Build hataları düzeltildi
- ✅ TypeScript type hataları düzeltildi
- ✅ Frontend Suspense boundary eklendi

### Breaking Changes

- ❌ Yok

### Migration Notes

- Database migration gerekli: `pnpm db:migrate`
- Environment variables güncellendi (COOKIE_KEY eklendi)
- Google OAuth callback URL production domain'e ayarlanmalı

---

## 🔗 İlgili Dokümantasyon

- [PRODUCTION_ENV_CHECKLIST.md](./PRODUCTION_ENV_CHECKLIST.md) - Environment variables checklist
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Genel deployment rehberi
- [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) - Google OAuth kurulumu

---

## ✅ Deployment Sonrası

1. [ ] Frontend erişilebilir: https://app.poolfab.com.tr
2. [ ] Backend API erişilebilir: https://api.poolfab.com.tr
3. [ ] Google OAuth çalışıyor
4. [ ] Admin panel erişilebilir
5. [ ] Database migration başarılı
6. [ ] Monitoring çalışıyor
7. [ ] Loglar düzgün toplanıyor

---

**Son Güncelleme:** 2025-01-27  
**Deployment Sorumlusu:** [İsim]  
**Onay:** [ ] DevOps Lead | [ ] Tech Lead | [ ] Product Owner

