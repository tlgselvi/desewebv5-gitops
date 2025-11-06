# Google Cloud Migration - Faz 5: Docker Image Build & Push

**Proje:** Dese EA Plan v6.8.0  
**Tarih:** 2025-01-27  
**Versiyon:** 6.8.0  
**Durum:** ⏳ Script Hazır

---

## 🎯 Amaç

Tüm servislerin (API, Frontend, FinBot, MuBot) Docker image'larını oluşturmak ve Google Artifact Registry'ye push etmek.

---

## 📋 Gereksinimler

### Önkoşullar

1. ✅ Google Cloud Project: `ea-plan-seo-project`
2. ✅ Docker yüklü ve çalışıyor
3. ✅ `gcloud` CLI yüklü ve yapılandırılmış
4. ✅ Proje erişim yetkisi

---

## 🚀 Script Kullanımı

### Bash (Linux/Mac)

```bash
chmod +x scripts/gcp-build-push-images.sh
./scripts/gcp-build-push-images.sh
```

### PowerShell (Windows)

```powershell
.\scripts\gcp-build-push-images.ps1
```

---

## 📋 Script Adımları

### 1. Artifact Registry API Aktifleştirme

```bash
gcloud services enable artifactregistry.googleapis.com
```

**Durum:** ✅ API aktif edilir

### 2. Repository Oluşturma

```bash
gcloud artifacts repositories create dese-ea-plan-images \
  --repository-format=docker \
  --location=europe-west3 \
  --description="Dese EA Plan v6.8.0 Docker Images"
```

**Durum:** ✅ Repository oluşturulur (varsa atlanır)

### 3. Docker Yetkilendirme

```bash
gcloud auth configure-docker europe-west3-docker.pkg.dev --quiet
```

**Durum:** ✅ Docker yetkilendirilir

### 4. Image Build ve Push

Script aşağıdaki image'ları build eder ve push eder:

#### 4.1. dese-api (Backend API)
- **Dockerfile:** `./Dockerfile`
- **Tag:** `v6.8.0` ve `latest`
- **Registry:** `europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api`

#### 4.2. dese-frontend (Frontend)
- **Dockerfile:** `./frontend/Dockerfile`
- **Tag:** `v6.8.0` ve `latest`
- **Registry:** `europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend`

#### 4.3. dese-finbot (FinBot Python Service)
- **Dockerfile:** `./deploy/finbot-v2/Dockerfile` (varsa) veya otomatik oluşturulur
- **Tag:** `v6.8.0` ve `latest`
- **Registry:** `europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-finbot`

#### 4.4. dese-mubot (MuBot Python Service)
- **Dockerfile:** `./deploy/mubot-v2/Dockerfile` (varsa) veya otomatik oluşturulur
- **Tag:** `v6.8.0` ve `latest`
- **Registry:** `europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-mubot`

---

## 🔍 Image Kontrolü

### Repository'deki Image'ları Listeleme

```bash
gcloud artifacts docker images list europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images
```

### Belirli Image'ı Kontrol Etme

```bash
# API Image
gcloud artifacts docker images list europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api

# Frontend Image
gcloud artifacts docker images list europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend

# FinBot Image
gcloud artifacts docker images list europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-finbot

# MuBot Image
gcloud artifacts docker images list europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-mubot
```

---

## 📝 Deployment YAML'da Kullanım

### Image URL Formatı

```
europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/<service-name>:<version>
```

### Örnek Deployment YAML

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
          image: europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.0
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
          ports:
            - containerPort: 3001
```

---

## 🔧 Manuel Build ve Push

### API Image

```bash
# Build
docker build -t europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.0 \
  -t europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:latest \
  -f Dockerfile .

# Push
docker push europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.0
docker push europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:latest
```

### Frontend Image

```bash
# Build
docker build -t europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:v6.8.0 \
  -t europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:latest \
  -f frontend/Dockerfile ./frontend

# Push
docker push europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:v6.8.0
docker push europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-frontend:latest
```

---

## ⚠️ Önemli Notlar

### FinBot ve MuBot Dockerfile'ları

Eğer `deploy/finbot-v2/Dockerfile` veya `deploy/mubot-v2/Dockerfile` yoksa, script otomatik olarak basit bir Dockerfile oluşturur:

**FinBot için:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY finbot-forecast.py .
RUN pip install --no-cache-dir fastapi uvicorn
EXPOSE 8000
CMD ["uvicorn", "finbot-forecast:app", "--host", "0.0.0.0", "--port", "8000"]
```

**MuBot için:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY mubot-ingestion.py .
RUN pip install --no-cache-dir flask requests
EXPOSE 8080
CMD ["python", "mubot-ingestion.py"]
```

**Öneri:** Production için özel Dockerfile'lar oluşturun.

---

## 🔒 Güvenlik

### Image Scanning

```bash
# Trivy ile scan
trivy image europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.0

# GCP Container Analysis kullanımı
gcloud container images scan europe-west3-docker.pkg.dev/ea-plan-seo-project/dese-ea-plan-images/dese-api:v6.8.0
```

### IAM ve Access Control

Repository'ye erişim IAM ile kontrol edilir:
- `roles/artifactregistry.reader` - Image çekme
- `roles/artifactregistry.writer` - Image push etme
- `roles/artifactregistry.admin` - Tam yetki

---

## 📊 Registry Yapısı

```
europe-west3-docker.pkg.dev/
└── ea-plan-seo-project/
    └── dese-ea-plan-images/
        ├── dese-api/
        │   ├── v6.8.0
        │   └── latest
        ├── dese-frontend/
        │   ├── v6.8.0
        │   └── latest
        ├── dese-finbot/
        │   ├── v6.8.0
        │   └── latest
        └── dese-mubot/
            ├── v6.8.0
            └── latest
```

---

## 🎯 Sonraki Adımlar

1. ✅ Script'ler hazır
2. ⏳ Script'i çalıştır (build ve push)
3. ⏳ Image'ları doğrula
4. ⏳ Deployment YAML'larını güncelle
5. ⏳ Kubernetes deployment

---

## 🔧 Troubleshooting

### Docker Build Hatası

```bash
# Docker daemon kontrolü
docker info

# Build cache temizleme
docker builder prune -a
```

### Authentication Hatası

```bash
# Docker'ı yeniden yetkilendir
gcloud auth configure-docker europe-west3-docker.pkg.dev

# Gcloud auth kontrolü
gcloud auth list
```

### Push Hatası

```bash
# Repository erişim kontrolü
gcloud artifacts repositories get-iam-policy dese-ea-plan-images --location=europe-west3

# IAM yetkisi ekle
gcloud artifacts repositories add-iam-policy-binding dese-ea-plan-images \
  --location=europe-west3 \
  --member="user:your-email@example.com" \
  --role="roles/artifactregistry.writer"
```

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

