# ☸️ Kubernetes Google Cloud Yapılandırması

**Proje:** Dese EA Plan v6.8.2  
**Tarih:** 2025-01-27  
**Durum:** ✅ Kubernetes Setup

---

## 📋 Ön Gereksinimler

1. ✅ Kubernetes cluster çalışıyor
2. ✅ `kubectl` yapılandırılmış ve cluster'a bağlı
3. ✅ `gcp-credentials.json` dosyası proje root'unda mevcut

---

## 🚀 Hızlı Başlangıç

### 1. Google Cloud Credentials Secret Oluştur

```powershell
# Windows PowerShell
.\scripts\k8s-create-gcp-secret.ps1
```

```bash
# Linux/Mac
chmod +x scripts/k8s-create-gcp-secret.sh
./scripts/k8s-create-gcp-secret.sh
```

Bu script:
- `gcp-credentials.json` dosyasını Kubernetes Secret olarak oluşturur (`gcp-credentials`)
- `dese-secrets` Secret'ına GSC environment variable'larını ekler

### 2. Deployment'ları Apply Et

```bash
kubectl apply -f k8s/
```

### 3. Pod'ları Kontrol Et

```bash
kubectl get pods
kubectl logs <pod-name>
```

---

## 🔧 Manuel Yapılandırma

### 1. Google Cloud Credentials Secret Oluştur

```bash
# JSON key dosyasından Secret oluştur
kubectl create secret generic gcp-credentials \
  --from-file=gcp-credentials.json=./gcp-credentials.json \
  -n default
```

### 2. GSC Environment Variables Secret'a Ekle

```bash
# JSON key dosyasından bilgileri al
PROJECT_ID=$(jq -r '.project_id' gcp-credentials.json)
CLIENT_EMAIL=$(jq -r '.client_email' gcp-credentials.json)
PRIVATE_KEY=$(jq -r '.private_key' gcp-credentials.json)

# dese-secrets Secret'ına ekle
kubectl patch secret dese-secrets -n default --type='json' \
  -p="[{\"op\":\"add\",\"path\":\"/data/GSC_PROJECT_ID\",\"value\":\"$(echo -n "$PROJECT_ID" | base64 -w 0)\"}]"

kubectl patch secret dese-secrets -n default --type='json' \
  -p="[{\"op\":\"add\",\"path\":\"/data/GSC_CLIENT_EMAIL\",\"value\":\"$(echo -n "$CLIENT_EMAIL" | base64 -w 0)\"}]"

kubectl patch secret dese-secrets -n default --type='json' \
  -p="[{\"op\":\"add\",\"path\":\"/data/GSC_PRIVATE_KEY\",\"value\":\"$(echo -n "$PRIVATE_KEY" | base64 -w 0)\"}]"
```

**Windows PowerShell:**

```powershell
$json = Get-Content gcp-credentials.json | ConvertFrom-Json
$projectId = $json.project_id
$clientEmail = $json.client_email
$privateKey = $json.private_key

kubectl patch secret dese-secrets -n default --type='json' `
  -p="[{\"op\":\"add\",\"path\":\"/data/GSC_PROJECT_ID\",\"value\":\"$([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($projectId)))\"}]"

kubectl patch secret dese-secrets -n default --type='json' `
  -p="[{\"op\":\"add\",\"path\":\"/data/GSC_CLIENT_EMAIL\",\"value\":\"$([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($clientEmail)))\"}]"

kubectl patch secret dese-secrets -n default --type='json' `
  -p="[{\"op\":\"add\",\"path\":\"/data/GSC_PRIVATE_KEY\",\"value\":\"$([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($privateKey)))\"}]"
```

---

## 📝 Deployment Yapılandırması

Deployment dosyasında (`k8s/deployment-api.yaml`) şu yapılandırmalar mevcut:

### Volume Mount

```yaml
volumes:
- name: gcp-credentials
  secret:
    secretName: gcp-credentials
    items:
    - key: gcp-credentials.json
      path: gcp-credentials.json
```

### Container Volume Mount

```yaml
volumeMounts:
- name: gcp-credentials
  mountPath: /app/gcp-credentials.json
  subPath: gcp-credentials.json
  readOnly: true
```

### Environment Variables

```yaml
env:
- name: GOOGLE_APPLICATION_CREDENTIALS
  value: /app/gcp-credentials.json
- name: GSC_PROJECT_ID
  valueFrom:
    secretKeyRef:
      name: dese-secrets
      key: GSC_PROJECT_ID
      optional: true
- name: GSC_CLIENT_EMAIL
  valueFrom:
    secretKeyRef:
      name: dese-secrets
      key: GSC_CLIENT_EMAIL
      optional: true
- name: GSC_PRIVATE_KEY
  valueFrom:
    secretKeyRef:
      name: dese-secrets
      key: GSC_PRIVATE_KEY
      optional: true
```

---

## 🔍 Doğrulama

### 1. Secret'ları Kontrol Et

```bash
# gcp-credentials Secret'ını kontrol et
kubectl get secret gcp-credentials -n default

# dese-secrets Secret'ını kontrol et
kubectl get secret dese-secrets -n default

# Secret içeriğini görüntüle (base64 decode)
kubectl get secret dese-secrets -n default -o jsonpath='{.data.GSC_PROJECT_ID}' | base64 -d
```

### 2. Pod İçinde Kontrol Et

```bash
# Pod'a exec et
kubectl exec -it <pod-name> -- sh

# Credentials dosyasını kontrol et
ls -la /app/gcp-credentials.json
cat /app/gcp-credentials.json | head -5

# Environment variable'ları kontrol et
env | grep GOOGLE
env | grep GSC
```

### 3. Log'ları Kontrol Et

```bash
# Pod log'larını kontrol et
kubectl logs <pod-name>

# Google Cloud bağlantı hatalarını kontrol et
kubectl logs <pod-name> | grep -i "google\|gcp\|credentials"
```

---

## 🐛 Sorun Giderme

### Hata: "secret 'gcp-credentials' not found"

**Çözüm:**
```bash
# Secret'ı oluştur
kubectl create secret generic gcp-credentials \
  --from-file=gcp-credentials.json=./gcp-credentials.json \
  -n default
```

### Hata: "Could not load the default credentials"

**Çözüm:**
- Pod içinde `/app/gcp-credentials.json` dosyasının var olduğunu kontrol edin
- `GOOGLE_APPLICATION_CREDENTIALS` environment variable'ının `/app/gcp-credentials.json` olarak ayarlandığını kontrol edin
- Volume mount'un doğru yapılandırıldığını kontrol edin

### Hata: "Invalid credentials"

**Çözüm:**
- Secret'ın doğru oluşturulduğunu kontrol edin: `kubectl get secret gcp-credentials -o yaml`
- JSON key dosyasının geçerli olduğunu kontrol edin
- Service Account email'inin GSC property'ye eklendiğini kontrol edin

### Pod CrashLoopBackOff

**Çözüm:**
```bash
# Pod log'larını kontrol et
kubectl logs <pod-name> --previous

# Pod detaylarını kontrol et
kubectl describe pod <pod-name>

# Secret mount'unu kontrol et
kubectl describe pod <pod-name> | grep -A 10 "Mounts:"
```

---

## 🔒 Güvenlik Notları

1. ✅ Secret'lar Kubernetes Secret olarak yönetiliyor
2. ✅ Volume mount read-only olarak yapılandırılmış
3. ✅ Secret'lar base64 encoded (encryption at rest için etcd encryption kullanın)
4. ⚠️ Production'da Workload Identity kullanmayı düşünün (daha güvenli)

---

## 📚 İlgili Dokümantasyon

- **Docker Setup:** [DOCKER_GOOGLE_CLOUD_SETUP.md](./DOCKER_GOOGLE_CLOUD_SETUP.md)
- **API Integration:** [seo/API_INTEGRATION_GUIDE.md](../seo/API_INTEGRATION_GUIDE.md)
- **Kubernetes Secrets:** https://kubernetes.io/docs/concepts/configuration/secret/

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0

