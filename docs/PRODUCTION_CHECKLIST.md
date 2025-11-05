# ✅ Production Deployment Checklist - Dese EA Plan v6.8.0

**Version:** 6.8.0  
**Last Update:** 2025-01-27  
**Status:** Pre-Deployment

---

## 📋 Pre-Deployment Checklist

### Environment Setup

- [ ] `.env` dosyası oluşturuldu (`.env.example`'dan kopyalandı)
- [ ] Tüm environment variables güncellendi
- [ ] `JWT_SECRET` güvenli bir değere ayarlandı (min 32 karakter)
- [ ] `DATABASE_URL` production database'e ayarlandı
- [ ] `REDIS_URL` production Redis'e ayarlandı
- [ ] Tüm API keys (OpenAI, Google, Ahrefs) ayarlandı
- [ ] CORS origin production domain'e ayarlandı

### Security

- [ ] JWT secret güçlü ve benzersiz
- [ ] Database credentials güvenli
- [ ] Redis password ayarlandı (production)
- [ ] API keys güvenli şekilde saklanıyor (secrets management)
- [ ] Rate limiting ayarları production için optimize edildi
- [ ] HTTPS/SSL sertifikaları hazır

### Database

- [ ] PostgreSQL database oluşturuldu
- [ ] Database migration çalıştırıldı (`pnpm db:migrate`)
- [ ] RBAC seed çalıştırıldı (`pnpm rbac:seed`)
- [ ] Database backup stratejisi hazır
- [ ] Database connection pool ayarları optimize edildi

### Cache (Redis)

- [ ] Redis instance hazır
- [ ] Redis password ayarlandı (production)
- [ ] Redis persistence ayarlandı
- [ ] Redis memory limit ayarlandı
- [ ] Redis connection test edildi

### Build & Test

- [ ] Tüm testler geçti (`pnpm test`)
- [ ] Test coverage %70+ (`pnpm test:coverage`)
- [ ] Linting geçti (`pnpm lint`)
- [ ] Build başarılı (`pnpm build`)
- [ ] Docker image build edildi (`docker build -t dese-ea-plan-v6.8.0 .`)

### Docker

- [ ] Dockerfile güncel (v6.8.0)
- [ ] Docker image tag'ı doğru
- [ ] Docker Compose test edildi (`docker-compose up -d`)
- [ ] Health checks çalışıyor
- [ ] Port mapping doğru (3001, 5555-5558)

### Kubernetes (Opsiyonel)

- [ ] Namespace oluşturuldu
- [ ] Secrets oluşturuldu ve güvenli
- [ ] ConfigMap güncel
- [ ] Deployment yapılandırması doğru
- [ ] Service yapılandırması doğru
- [ ] Ingress yapılandırması doğru
- [ ] ServiceAccount ve RBAC ayarlandı
- [ ] Resource limits ayarlandı (CPU, Memory)

### Monitoring & Observability

- [ ] Prometheus yapılandırması hazır
- [ ] Grafana dashboards hazır
- [ ] Loki log aggregation ayarlandı
- [ ] Alert rules tanımlandı
- [ ] ServiceMonitor yapılandırıldı (Kubernetes)

### MCP Servers

- [ ] FinBot MCP Server health check çalışıyor
- [ ] MuBot MCP Server health check çalışıyor
- [ ] DESE MCP Server health check çalışıyor
- [ ] Observability MCP Server health check çalışıyor
- [ ] Tüm MCP servers authentication yapıyor
- [ ] MCP servers rate limiting aktif

---

## 🚀 Deployment Steps

### Step 1: Docker Deployment

```bash
# 1. Build image
docker build -t dese-ea-plan-v6.8.0 .

# 2. Test locally
docker run -p 3001:3001 -p 5555:5555 -p 5556:5556 -p 5557:5557 -p 5558:5558 \
  --env-file .env dese-ea-plan-v6.8.0

# 3. Health check
curl http://localhost:3001/health

# 4. MCP servers health check
curl http://localhost:5555/finbot/health
curl http://localhost:5556/mubot/health
curl http://localhost:5557/dese/health
curl http://localhost:5558/observability/health
```

### Step 2: Docker Compose Deployment

```bash
# 1. Update docker-compose.yml with production values
# 2. Start services
docker-compose up -d

# 3. Check logs
docker-compose logs -f app

# 4. Health checks
docker-compose exec app curl http://localhost:3001/health
```

### Step 3: Kubernetes Deployment

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create secrets (update values!)
kubectl apply -f k8s/secret.yaml

# 3. Create configmap
kubectl apply -f k8s/configmap.yaml

# 4. Create service account
kubectl apply -f k8s/serviceaccount.yaml

# 5. Deploy application
kubectl apply -f k8s/deployment.yaml

# 6. Create service
kubectl apply -f k8s/service.yaml

# 7. Create ingress
kubectl apply -f k8s/ingress.yaml

# 8. Check status
kubectl get pods -n dese-ea-plan-v5
kubectl get svc -n dese-ea-plan-v5
```

---

## ✅ Post-Deployment Verification

### Health Checks

- [ ] Backend API health: `curl http://your-domain/health`
- [ ] Backend API ready: `curl http://your-domain/health/ready`
- [ ] Backend API live: `curl http://your-domain/health/live`
- [ ] FinBot MCP health: `curl http://your-domain:5555/finbot/health`
- [ ] MuBot MCP health: `curl http://your-domain:5556/mubot/health`
- [ ] DESE MCP health: `curl http://your-domain:5557/dese/health`
- [ ] Observability MCP health: `curl http://your-domain:5558/observability/health`

### API Endpoints

- [ ] Swagger UI erişilebilir: `http://your-domain/api-docs`
- [ ] Metrics endpoint: `http://your-domain/metrics`
- [ ] Health endpoint: `http://your-domain/health`
- [ ] API endpoints authentication gerektiriyor

### Monitoring

- [ ] Prometheus metrics toplanıyor
- [ ] Grafana dashboards çalışıyor
- [ ] Logs Loki'ye gönderiliyor
- [ ] Alert rules aktif

### Performance

- [ ] Response time < 200ms (average)
- [ ] Error rate < 0.1%
- [ ] CPU usage < 70%
- [ ] Memory usage < 80%
- [ ] Database connection pool optimal

### Security

- [ ] HTTPS/SSL aktif
- [ ] JWT authentication çalışıyor
- [ ] Rate limiting aktif
- [ ] CORS ayarları doğru
- [ ] Security headers aktif (Helmet)

---

## 🔄 Rollback Plan

### Rollback Steps

1. **Docker Compose:**
   ```bash
   docker-compose down
   docker-compose up -d -f docker-compose.previous.yml
   ```

2. **Kubernetes:**
   ```bash
   kubectl rollout undo deployment/dese-ea-plan-v5 -n dese-ea-plan-v5
   ```

3. **Helm:**
   ```bash
   helm rollback dese-ea-plan-v5
   ```

---

## 📞 Support & Troubleshooting

### Logs

```bash
# Docker
docker logs dese-ea-plan-v6.8.0

# Kubernetes
kubectl logs -f deployment/dese-ea-plan-v5 -n dese-ea-plan-v5

# Application logs
tail -f logs/app.log
```

### Health Check Script

```bash
# PowerShell
pwsh scripts/advanced-health-check.ps1 -Verbose
```

### Common Issues

- **Database connection failed:** Check `DATABASE_URL` and PostgreSQL status
- **Redis connection failed:** Check `REDIS_URL` and Redis status
- **MCP servers not starting:** Check ports 5555-5558 are available
- **Health check failing:** Check application logs and environment variables

---

## 📝 Notes

- **Version:** 6.8.0
- **Last Updated:** 2025-01-27
- **Deployment Type:** Production
- **Environment:** Production

---

**Hazırlayan:** Cursor AI Assistant  
**Onay:** ⏳ Bekleniyor

