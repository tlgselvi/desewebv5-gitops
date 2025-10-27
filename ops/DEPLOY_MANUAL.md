# EA Plan v5.6 - Manuel Deployment Komutları

## ✅ Tamamlanan Adımlar
- [x] Git commit: "release: EA Plan v5.6 Stable"
- [x] Git tag oluşturuldu: v5.6-stable

## ⚠️ Manuel Yapılması Gereken Adımlar

### 1. Git Push
```bash
git push origin main --tags
```

### 2. Docker Registry URL'ini Ayarlayın
```bash
# Örnek: GitHub Container Registry
export REGISTRY_URL=ghcr.io/your-username

# veya Docker Hub
export REGISTRY_URL=your-dockerhub-username

# veya Private Registry
export REGISTRY_URL=registry.your-domain.com
```

### 3. Docker Images Build & Push

#### Backend
```bash
# Build
docker build -t $REGISTRY_URL/cpt-ajan-backend:v5.6-stable .

# Push
docker push $REGISTRY_URL/cpt-ajan-backend:v5.6-stable
```

#### Frontend
```bash
cd frontend

# Build
docker build -t $REGISTRY_URL/cpt-ajan-frontend:v5.6-stable .

# Push
docker push $REGISTRY_URL/cpt-ajan-frontend:v5.6-stable

cd ..
```

### 4. Kubernetes Image URL'lerini Güncelle

`ops/k8s/` içindeki deployment dosyalarındaki image URL'lerini güncelleyin:

**ops/k8s/backend-deployment.yaml** (satır 23):
```yaml
image: ghcr.io/your-org/cpt-ajan-backend:v5.6-stable
```

**ops/k8s/frontend-deployment.yaml** (satır 14):
```yaml
image: ghcr.io/your-org/cpt-ajan-frontend:v5.6-stable
```

### 5. Kubernetes Deploy

```bash
# Namespace kontrolü
kubectl get namespace dese-ea-plan-v5

# Deployments uygula
kubectl apply -f ops/k8s/backend-deployment.yaml
kubectl apply -f ops/k8s/backend-service.yaml
kubectl apply -f ops/k8s/frontend-deployment.yaml
kubectl apply -f ops/k8s/frontend-service.yaml
```

### 6. Deployment Status Kontrol

```bash
# Rollout durumu
kubectl rollout status deployment/cpt-ajan-backend -n dese-ea-plan-v5
kubectl rollout status deployment/cpt-ajan-frontend -n dese-ea-plan-v5

# Pod durumları
kubectl get pods -n dese-ea-plan-v5 -o wide

# Servisler
kubectl get svc -n dese-ea-plan-v5
```

### 7. ArgoCD Sync (Eğer ArgoCD kullanıyorsanız)

```bash
# Sync
argocd app sync cpt-ajan

# Wait for health
argocd app wait cpt-ajan --health --timeout 120
```

### 8. SLO Kurallarını Uygula

```bash
# Prometheus SLO rules validation
promtool check rules ops/prometheus/slo-rules.yml

# Kubernetes'e uygula (Prometheus Operator kullanıyorsanız)
kubectl apply -f ops/prometheus/slo-rules.yml
```

## Doğrulama

### Health Check
```bash
# Backend health
kubectl port-forward -n dese-ea-plan-v5 svc/cpt-ajan-backend 8080:8080
curl http://localhost:8080/health

# Frontend health
kubectl port-forward -n dese-ea-plan-v5 svc/cpt-ajan-frontend 3000:80
curl http://localhost:3000
```

### Logs
```bash
# Backend logs
kubectl logs -n dese-ea-plan-v5 -l app=cpt-ajan-backend --tail=50

# Frontend logs
kubectl logs -n dese-ea-plan-v5 -l app=cpt-ajan-frontend --tail=50
```

### Load Test
```bash
# k6 ile load test
k6 run ops/loadtest.k6.js
```

## Rollback

Sorun olursa:
```bash
# Rollback
kubectl rollout undo deployment/cpt-ajan-backend -n dese-ea-plan-v5
kubectl rollout undo deployment/cpt-ajan-frontend -n dese-ea-plan-v5
```

## Notlar

- **Namespace**: `dese-ea-plan-v5`
- **Backend Port**: 3000 (container) → 8080 (service)
- **Frontend Port**: 3000 (container) → 80 (service)
- **Registry**: Kendi registry URL'inizi kullanın
- **Image Tags**: v5.6-stable

