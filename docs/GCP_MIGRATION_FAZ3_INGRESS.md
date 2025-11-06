# Google Cloud Migration - Faz 3: NGINX Ingress Controller

**Proje:** Dese EA Plan v6.8.0  
**Tarih:** 2025-01-27  
**Versiyon:** 6.8.0  
**Durum:** ✅ Başarıyla Tamamlandı

---

## 🎯 Amaç

Dışarıdan gelen trafiği (HTTP/HTTPS) karşılamak ve servislerimize (FinBot, API, Frontend) yönlendirmek için NGINX Ingress Controller kurulumu.

---

## ✅ NGINX Ingress Controller Kuruldu

### Kurulum Bilgileri

| Özellik | Değer |
|---------|-------|
| **Namespace** | `ingress-nginx` |
| **Helm Chart** | `ingress-nginx/ingress-nginx` |
| **Release Name** | `ingress-nginx` |
| **IngressClass** | `nginx` |
| **LoadBalancer Service** | `ingress-nginx-controller` |
| **Status** | ✅ Deployed |

---

## 📋 Kurulum Adımları

### 1. Helm Repo Ekleme

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
```

**Durum:** ✅ Repo eklendi

### 2. Helm Repo Güncelleme

```bash
helm repo update
```

**Durum:** ✅ Repo güncellendi

### 3. Namespace Oluşturma

```bash
kubectl create namespace ingress-nginx
```

**Durum:** ✅ Namespace oluşturuldu

### 4. NGINX Ingress Controller Kurulumu

```bash
helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx
```

**Durum:** ✅ Controller kuruldu

---

## 🔍 Kurulum Kontrolü

### Pod Durumu

```bash
kubectl get pods -n ingress-nginx
```

**Beklenen Çıktı:**
```
NAME                                        READY   STATUS    RESTARTS   AGE
ingress-nginx-controller-xxxxx-xxxxx         1/1     Running   0         2m
```

### Service Durumu

```bash
kubectl get svc -n ingress-nginx
```

**Beklenen Çıktı:**
```
NAME                                 TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)
ingress-nginx-controller             LoadBalancer   34.118.233.38    <pending>     80:32327/TCP,443:31020/TCP
ingress-nginx-controller-admission   ClusterIP      34.118.234.112   <none>        443/TCP
```

**Not:** External IP atanması 2-5 dakika sürebilir.

### External IP Alma

```bash
# External IP'yi almak için
kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Veya daha detaylı
kubectl get svc -n ingress-nginx ingress-nginx-controller -o wide
```

---

## 📝 Ingress Resource Örneği

### Temel HTTP Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dese-ea-plan-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: api.dese.ai
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: dese-ea-plan-api
                port:
                  number: 3000
    - host: finbot.dese.ai
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: finbot-service
                port:
                  number: 8000
    - host: app.dese.ai
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: dese-ea-plan-frontend
                port:
                  number: 3000
```

### HTTPS Ingress (TLS)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dese-ea-plan-ingress-tls
  namespace: default
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.dese.ai
        - finbot.dese.ai
        - app.dese.ai
      secretName: dese-ea-plan-tls
  rules:
    - host: api.dese.ai
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: dese-ea-plan-api
                port:
                  number: 3000
    - host: finbot.dese.ai
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: finbot-service
                port:
                  number: 8000
    - host: app.dese.ai
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: dese-ea-plan-frontend
                port:
                  number: 3000
```

---

## 🔧 NGINX Ingress Controller Konfigürasyonu

### Custom Values Kullanarak Kurulum

```bash
helm install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx \
  --set controller.service.type=LoadBalancer \
  --set controller.service.externalTrafficPolicy=Local \
  --set controller.metrics.enabled=true
```

### Mevcut Kurulumu Güncelleme

```bash
helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx \
  --set controller.service.type=LoadBalancer
```

---

## 📊 Monitoring ve Logging

### NGINX Logs

```bash
# Pod loglarını görüntüle
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Belirli bir pod'un loglarını görüntüle
kubectl logs -n ingress-nginx ingress-nginx-controller-xxxxx-xxxxx
```

### Metrics

NGINX Ingress Controller Prometheus metrics sağlar:
- `/metrics` endpoint'i üzerinden erişilebilir
- Prometheus ServiceMonitor ile entegre edilebilir

---

## 🔒 Güvenlik

### Rate Limiting

```yaml
annotations:
  nginx.ingress.kubernetes.io/limit-rps: "100"
  nginx.ingress.kubernetes.io/limit-connections: "10"
```

### CORS

```yaml
annotations:
  nginx.ingress.kubernetes.io/enable-cors: "true"
  nginx.ingress.kubernetes.io/cors-allow-origin: "*"
```

### SSL/TLS

- Let's Encrypt ile otomatik sertifika (cert-manager ile)
- TLS termination
- HTTPS redirect

---

## 📋 Sonraki Adımlar

1. ✅ NGINX Ingress Controller kuruldu
2. ⏳ External IP alınıyor (2-5 dakika)
3. ⏳ DNS kayıtlarını External IP'ye yönlendir
4. ⏳ Ingress resource'larını oluştur
5. ⏳ TLS/SSL sertifikası kurulumu (cert-manager)
6. ⏳ Application deployment
7. ⏳ Service ve Ingress yapılandırması

---

## 🎯 Servis Yönlendirmeleri

### Planlanan Yönlendirmeler

| Host | Service | Port | Açıklama |
|------|---------|------|----------|
| `api.dese.ai` | `dese-ea-plan-api` | 3000 | Backend API |
| `finbot.dese.ai` | `finbot-service` | 8000 | FinBot API |
| `app.dese.ai` | `dese-ea-plan-frontend` | 3000 | Frontend App |

---

## ⚠️ Önemli Notlar

1. **External IP:** LoadBalancer External IP atanması 2-5 dakika sürebilir
2. **DNS:** External IP alındıktan sonra DNS kayıtlarını güncelleyin
3. **TLS:** Production için TLS/SSL sertifikası kullanın
4. **Annotations:** NGINX özel annotations için dokümantasyona bakın
5. **IngressClass:** `nginx` ingress class'ı kullanılmalı

---

## 🔧 Troubleshooting

### External IP Bekleniyor

```bash
# Service durumunu kontrol et
kubectl describe svc -n ingress-nginx ingress-nginx-controller

# Event'leri kontrol et
kubectl get events -n ingress-nginx --sort-by='.lastTimestamp'
```

### Pod Çalışmıyor

```bash
# Pod durumunu kontrol et
kubectl describe pod -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Logları kontrol et
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

