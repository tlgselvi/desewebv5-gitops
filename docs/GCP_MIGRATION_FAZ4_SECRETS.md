# Google Cloud Migration - Faz 4: Kubernetes Secrets

**Proje:** Dese EA Plan v6.8.0  
**Tarih:** 2025-01-27  
**Versiyon:** 6.8.0  
**Durum:** ✅ Başarıyla Tamamlandı

---

## 🎯 Amaç

Uygulamaların Cloud SQL (PostgreSQL) ve Memorystore (Redis) servislerine bağlanabilmesi için Kubernetes Secrets oluşturmak.

---

## ✅ Secrets Oluşturuldu

### Secret Bilgileri

| Secret Adı | Key | Value (Masked) | Durum |
|------------|-----|----------------|-------|
| `dese-db-secret` | `DATABASE_URL` | `postgresql://postgres:***@34.159.32.249:5432/dese_db` | ✅ Created |
| `dese-redis-secret` | `REDIS_URL` | `redis://10.146.144.75:6379` | ✅ Created |

---

## 📋 Oluşturma Komutları

### 1. Database Secret

```bash
kubectl create secret generic dese-db-secret \
  --from-literal=DATABASE_URL="postgresql://postgres:GüvenliŞifre123!@34.159.32.249:5432/dese_db"
```

### 2. Redis Secret

```bash
kubectl create secret generic dese-redis-secret \
  --from-literal=REDIS_URL="redis://10.146.144.75:6379"
```

---

## 🔍 Secret Kontrolü

### Secret'ları Listeleme

```bash
kubectl get secrets
```

### Secret Detaylarını Görüntüleme

```bash
# Database Secret
kubectl describe secret dese-db-secret

# Redis Secret
kubectl describe secret dese-redis-secret
```

### Secret Değerlerini Görüntüleme (Base64 Decode)

```bash
# Database URL
kubectl get secret dese-db-secret -o jsonpath='{.data.DATABASE_URL}' | base64 -d

# Redis URL
kubectl get secret dese-redis-secret -o jsonpath='{.data.REDIS_URL}' | base64 -d
```

---

## 📝 Deployment'da Kullanım

### YAML Örneği

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dese-ea-plan-api
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: api
          image: gcr.io/ea-plan-seo-project/dese-ea-plan-api:latest
          env:
            # Database Secret
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: dese-db-secret
                  key: DATABASE_URL
            # Redis Secret
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: dese-redis-secret
                  key: REDIS_URL
            # Diğer environment variables
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
```

### Tüm Secret'ları Environment Variable Olarak Yükleme

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dese-ea-plan-api
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: api
          image: gcr.io/ea-plan-seo-project/dese-ea-plan-api:latest
          envFrom:
            # Database Secret'ı tüm key'leriyle yükle
            - secretRef:
                name: dese-db-secret
            # Redis Secret'ı tüm key'leriyle yükle
            - secretRef:
                name: dese-redis-secret
```

---

## 🔒 Güvenlik Notları

1. **Secret Değerleri:** Base64 encoded olarak saklanır (şifreleme değil)
2. **RBAC:** Secret'lara erişim RBAC ile kontrol edilir
3. **Namespace:** Secret'lar namespace'e özeldir
4. **Etcd:** Secret'lar etcd'de plain text olarak saklanır (encryption at rest önerilir)

---

## 🔧 Secret Güncelleme

### Mevcut Secret'ı Güncelleme

```bash
# Secret'ı sil ve yeniden oluştur
kubectl delete secret dese-db-secret
kubectl create secret generic dese-db-secret \
  --from-literal=DATABASE_URL="postgresql://postgres:YeniŞifre!@34.159.32.249:5432/dese_db"

# Pod'ları yeniden başlat (deployment güncellemesi gerekebilir)
kubectl rollout restart deployment dese-ea-plan-api
```

### Patch ile Güncelleme

```bash
# Base64 encode edilmiş değer
echo -n "postgresql://postgres:YeniŞifre!@34.159.32.249:5432/dese_db" | base64

# Patch uygula
kubectl patch secret dese-db-secret \
  -p '{"data":{"DATABASE_URL":"<base64-encoded-value>"}}'
```

---

## 📊 Secret Yönetimi

### Secret'ları Export Etme

```bash
# YAML formatında export
kubectl get secret dese-db-secret -o yaml > dese-db-secret.yaml
```

### Secret'ları Silme

```bash
kubectl delete secret dese-db-secret
kubectl delete secret dese-redis-secret
```

---

## 🎯 Sonraki Adımlar

1. ✅ Secrets oluşturuldu
2. ⏳ Deployment YAML'larını hazırla
3. ⏳ Secret'ları Deployment'lara ekle
4. ⏳ Application deployment
5. ⏳ Connection testleri

---

## ⚠️ Önemli Notlar

1. **Secret Değerleri:** Base64 encoded, ancak şifrelenmemiş
2. **Namespace:** Secret'lar default namespace'de oluşturuldu
3. **Güncelleme:** Secret güncellendiğinde pod'lar otomatik yeniden başlamaz
4. **RBAC:** Secret'lara erişim için uygun RBAC kuralları ayarlanmalı

---

## 📋 Secret Kullanım Senaryoları

### Senaryo 1: Tek Secret Key

```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: dese-db-secret
        key: DATABASE_URL
```

### Senaryo 2: Tüm Secret Keys

```yaml
envFrom:
  - secretRef:
      name: dese-db-secret
```

### Senaryo 3: Volume Mount

```yaml
volumes:
  - name: db-secret
    secret:
      secretName: dese-db-secret
containers:
  - name: api
    volumeMounts:
      - name: db-secret
        mountPath: /etc/secrets
        readOnly: true
```

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

