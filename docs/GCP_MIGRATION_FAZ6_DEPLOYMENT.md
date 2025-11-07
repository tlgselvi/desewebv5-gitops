# Google Cloud Migration - Faz 6: Application Deployment

**Proje:** Dese EA Plan v6.8.0  
**Tarih:** 2025-01-27  
**Versiyon:** 6.8.0  
**Durum:** ⏳ Deployment YAML'ları Hazır

---

## 🎯 Amaç

Uygulamaları (API, Frontend, FinBot, MuBot) Kubernetes cluster'ına deploy etmek.

---

## ✅ Hazırlanan Deployment Dosyaları

### API Deployment

| Dosya | Açıklama |
|-------|----------|
| `k8s/deployment-api.yaml` | API Deployment (2 replicas) |
| `k8s/service-api.yaml` | API Service (ClusterIP) |
| `k8s/ingress-api.yaml` | API Ingress (api.dese.ai) |

---

## 📋 Deployment Yapılandırması

### API Deployment Özellikleri

| Özellik | Değer |
|---------|-------|
| **Replicas** | 2 |
| **Image** | `europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.0` |
| **Port** | 3001 (HTTP) + 5555-5558 (MCP Servers) |
| **Health Checks** | ✅ Readiness, Liveness, Startup probes |
| **Resources** | 256Mi-512Mi memory, 250m-500m CPU |
| **Secrets** | ✅ Database & Redis connection strings |

---

## 🔍 Health Check Endpoints

### Mevcut Endpoints

- **Health Check:** `/health` (full status)
- **Readiness Probe:** `/health/ready` (database + Redis)
- **Liveness Probe:** `/health/live` (basic alive check)

### Deployment'da Kullanılan

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001

livenessProbe:
  httpGet:
    path: /health/live
    port: 3001

startupProbe:
  httpGet:
    path: /health/live
    port: 3001
```

---

## 🚀 Deployment Adımları

### 1. Deployment Uygulama

```bash
# API Deployment
kubectl apply -f k8s/deployment-api.yaml
kubectl apply -f k8s/service-api.yaml
kubectl apply -f k8s/ingress-api.yaml
```

### 2. Deployment Durumunu Kontrol

```bash
# Deployment durumu
kubectl get deployment dese-api-deployment

# Pod durumu
kubectl get pods -l app=dese-api

# Service durumu
kubectl get svc dese-api-service

# Ingress durumu
kubectl get ingress dese-api-ingress
```

### 3. Pod Loglarını İzleme

```bash
# Tüm pod'ların logları
kubectl logs -l app=dese-api --tail=100 -f

# Belirli bir pod'un logları
kubectl logs dese-api-deployment-xxxxx-xxxxx -f
```

### 4. Rollout Durumunu İzleme

```bash
kubectl rollout status deployment/dese-api-deployment
```

---

## 🔧 Deployment Yapılandırma Detayları

### Environment Variables

```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: dese-db-secret
        key: DATABASE_URL
  - name: REDIS_URL
    valueFrom:
      secretKeyRef:
        name: dese-redis-secret
        key: REDIS_URL
  - name: PORT
    value: "3001"
  - name: NODE_ENV
    value: "production"
```

### Resource Limits

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Health Probes

- **Readiness:** Database ve Redis bağlantısı kontrol eder
- **Liveness:** Uygulama canlılığını kontrol eder
- **Startup:** Yavaş başlayan container'lar için

---

## 📊 Service Yapılandırması

### ClusterIP Service

```yaml
ports:
  - name: http
    port: 3001
    targetPort: 3001
  - name: mcp-finbot
    port: 5555
    targetPort: 5555
  - name: mcp-mubot
    port: 5556
    targetPort: 5556
  - name: mcp-dese
    port: 5557
    targetPort: 5557
  - name: mcp-observability
    port: 5558
    targetPort: 5558
```

---

## 🌐 Ingress Yapılandırması

### Domain ve Routing

```yaml
rules:
  - host: api.dese.ai
    http:
      paths:
        - path: /
          pathType: Prefix
          backend:
            service:
              name: dese-api-service
              port:
                number: 3001
```

### TLS/SSL

```yaml
tls:
  - hosts:
      - api.dese.ai
    secretName: dese-api-tls
```

**Not:** TLS secret'ı cert-manager ile otomatik oluşturulacak.

---

## 🔒 Güvenlik

### Security Context

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: false
  capabilities:
    drop:
    - ALL
```

### Resource Limits

- Memory ve CPU limitleri tanımlı
- OOM (Out of Memory) koruması
- Resource starvation önleme

---

## 📋 Deployment Checklist

- [x] Image'lar build edildi ve push edildi
- [x] Secrets oluşturuldu (Faz 4)
- [x] Deployment YAML'ları hazır (API + FinBot, Frontend taslak)
- [x] Service YAML'ları hazır (API, Frontend, FinBot)
- [x] Ingress YAML'ları hazır (api.dese.ai, app.dese.ai, finbot.dese.ai)
- [x] DNS kayıtları yapılandırıldı (34.40.41.232 → api/app/finbot.dese.ai)
- [ ] TLS sertifikası hazır (cert-manager ile)

---

## 🎯 Sonraki Adımlar

1. ✅ Deployment manifestleri hazır
2. ✅ Image build & push tamamlandı (Faz 5)
3. ✅ API ve FinBot deployment'ları uygulandı
4. ⏳ Frontend deployment stabilizasyonu
5. ✅ MuBot deployment (manifest + service + ingress)
6. ⏳ Database migration
7. ⏳ Son-to-son connection ve load testleri
8. ⏳ Ingress manifestlerinde `spec.ingressClassName` refactor'u

---

## 🔧 Troubleshooting

### Pod Başlamıyor

```bash
# Pod durumunu kontrol et
kubectl describe pod dese-api-deployment-xxxxx-xxxxx

# Event'leri kontrol et
kubectl get events --sort-by='.lastTimestamp'
```

### Health Check Başarısız

```bash
# Pod'a bağlan ve manuel test et
kubectl exec -it dese-api-deployment-xxxxx-xxxxx -- curl http://localhost:3001/health

# Logları kontrol et
kubectl logs dese-api-deployment-xxxxx-xxxxx
```

### Image Pull Hatası

```bash
# Image'ın registry'de olduğunu kontrol et
gcloud artifacts docker images list europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api

# Pull secret kontrolü
kubectl get secret -n default | grep docker
```

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

