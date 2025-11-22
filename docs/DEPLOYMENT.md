# 🚀 Production Deployment Guide - Dese EA Plan v6.8.0

**Version:** 6.8.0  
**Last Update:** 2025-01-27

---

## 📋 İçindekiler

1. [Ön Gereksinimler](#ön-gereksinimler)
2. [Environment Variables](#environment-variables)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Health Checks](#health-checks)
6. [Monitoring & Observability](#monitoring--observability)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Ön Gereksinimler

### Gerekli Araçlar

- **Docker** 20.10+ veya **Docker Desktop** (Windows/Mac)
- **Kubernetes** 1.25+ (opsiyonel)
- **kubectl** (Kubernetes için)
- **Helm** 3.10+ (opsiyonel)
- **PostgreSQL** 15+ (veritabanı)
- **Redis** 7+ (cache)

### Gerekli Servisler

- PostgreSQL database
- Redis cache
- Prometheus (monitoring)
- Grafana (visualization)

---

## 🔐 Environment Variables

### Temel Değişkenler

Kopyala `.env.example` dosyasını `.env` olarak ve değerleri güncelle:

```bash
cp .env.example .env
```

### Kritik Değişkenler (Production)

```env
# Security - MUTLAKA DEĞİŞTİR!
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://host:6379

# API Keys
OPENAI_API_KEY=your-openai-key
GOOGLE_SEARCH_CONSOLE_API_KEY=your-google-key
AHREFS_API_KEY=your-ahrefs-key
```

### Tüm Environment Variables

Detaylı liste için `.env.example` dosyasına bakın.

---

## 🐳 Docker Deployment

### 1. Build Docker Image

```bash
# Build image
docker build -t dese-ea-plan-v6.8.0 .

# Tag for registry
docker tag dese-ea-plan-v6.8.0 your-registry/dese-ea-plan-v6.8.0:latest

# Push to registry
docker push your-registry/dese-ea-plan-v6.8.0:latest
```

### 2. Docker Compose ile Çalıştır

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

### 3. Environment Variables (Docker)

`.env` dosyasını oluşturun veya `docker-compose.yml` içindeki environment variables'ı güncelleyin.

---

## ☸️ Kubernetes Deployment

### 1. Namespace Oluştur

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Secrets Oluştur

```bash
# Secret'ları oluştur (değerleri güncelle!)
kubectl apply -f k8s/secret.yaml

# Veya manuel olarak:
kubectl create secret generic dese-secrets \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=database-url=postgresql://... \
  --from-literal=redis-url=redis://... \
  -n dese-ea-plan-v5
```

### 3. ConfigMap Uygula

```bash
kubectl apply -f k8s/configmap.yaml
```

### 4. Deployment Uygula

```bash
kubectl apply -f k8s/deployment.yaml
```

### 5. Service ve Ingress Uygula

```bash
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### 6. Helm ile Deploy (Opsiyonel)

```bash
# Install
helm install dese-ea-plan-v5 ./helm/dese-ea-plan-v5

# Upgrade
helm upgrade dese-ea-plan-v5 ./helm/dese-ea-plan-v5

# Uninstall
helm uninstall dese-ea-plan-v5
```

---

## 🏥 Health Checks

### Backend API Health

```bash
# Health check
curl http://localhost:3001/health

# Ready check
curl http://localhost:3001/health/ready

# Live check
curl http://localhost:3001/health/live
```

### MCP Server Health Checks

```bash
# FinBot MCP
curl http://localhost:5555/finbot/health

# MuBot MCP
curl http://localhost:5556/mubot/health

# DESE MCP
curl http://localhost:5557/dese/health

# Observability MCP
curl http://localhost:5558/observability/health
```

### Kubernetes Health Checks

```bash
# Pod status
kubectl get pods -n dese-ea-plan-v5

# Pod logs
kubectl logs -f deployment/dese-ea-plan-v5 -n dese-ea-plan-v5

# Health check endpoint
kubectl exec -it deployment/dese-ea-plan-v5 -n dese-ea-plan-v5 -- curl http://localhost:3001/health
```

---

## 📊 Monitoring & Observability

### Prometheus Metrics

- **Endpoint:** `http://localhost:3001/metrics`
- **Scrape interval:** 15s
- **Retention:** 200h

### Grafana Dashboards

- **URL:** `http://localhost:3001:3000`
- **Default credentials:** `admin/admin123`
- **Dashboards:** `./monitoring/grafana/dashboards`

### Loki Logs

- **Endpoint:** `http://localhost:3100`
- **Log files:** `./logs/`

### Health Monitoring Script

```bash
# PowerShell
pwsh scripts/advanced-health-check.ps1

# Verbose mode
pwsh scripts/advanced-health-check.ps1 -Verbose
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -U postgres -d dese_db

# Check environment variable
echo $DATABASE_URL
```

#### 2. Redis Connection Failed

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli -h localhost ping

# Check environment variable
echo $REDIS_URL
```

#### 3. MCP Servers Not Starting

```bash
# Check ports are available
netstat -an | grep 5555
netstat -an | grep 5556
netstat -an | grep 5557
netstat -an | grep 5558

# Check logs
docker logs dese-ea-plan-v5-app
```

#### 4. Health Check Failing

```bash
# Check application logs
docker logs dese-ea-plan-v5-app

# Check health endpoint
curl -v http://localhost:3001/health

# Check environment variables
docker exec dese-ea-plan-v5-app env | grep -E "DATABASE|REDIS|JWT"
```

---

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] Environment variables ayarlandı (`.env` dosyası)
- [ ] Database migration çalıştırıldı (`pnpm db:migrate`)
- [ ] Docker image build edildi
- [ ] Secrets güvenli şekilde yönetiliyor
- [ ] Health check endpoints test edildi

### Deployment

- [ ] Docker Compose ile test edildi
- [ ] Kubernetes deployment test edildi (opsiyonel)
- [ ] MCP servers health check yapıldı
- [ ] Monitoring tools erişilebilir
- [ ] Logging çalışıyor

### Post-Deployment

- [ ] Health checks başarılı
- [ ] Metrics Prometheus'da görünüyor
- [ ] Grafana dashboards çalışıyor
- [ ] Error logs temiz
- [ ] Performance metrics normal

---

## 📚 Ek Kaynaklar

- [README.md](../README.md) - Genel proje dokümantasyonu
- [CICD_GUIDE.md](../CICD_GUIDE.md) - CI/CD pipeline rehberi
- [tests/README.md](../tests/README.md) - Test dokümantasyonu
- [tests/TEST_REPORT.md](../tests/TEST_REPORT.md) - Test coverage raporu

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

