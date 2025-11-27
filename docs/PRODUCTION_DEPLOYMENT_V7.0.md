# Production Deployment Guide - DESE EA PLAN v7.0.0

**Version:** 7.0.0  
**Last Updated:** 2025-01-27  
**Status:** Ready for Production Deployment

---

## 📋 Pre-Deployment Checklist

### ✅ Completed (v7.0.0)

- ✅ **Multi-tenancy:** Row-Level Security (RLS) policies active on 20 tables
- ✅ **RBAC:** Module-based authorization system implemented
- ✅ **Security:** JWT authentication, RBAC, RLS, audit logging
- ✅ **Monitoring:** Prometheus alerts and Grafana dashboards configured
- ✅ **Documentation:** All guides completed (API, Frontend, IoT, JARVIS, CEO Metrics)
- ✅ **AI Integration:** JARVIS AI-powered insights with multi-layer fallback
- ✅ **Frontend:** All modules use real API integration (no mock data)
- ✅ **Database:** All migrations applied, RLS policies active

### 🔲 Pre-Deployment Tasks

#### Environment Setup

- [ ] `.env` dosyası oluşturuldu (`.env.example`'dan kopyalandı)
- [ ] Tüm environment variables güncellendi
- [ ] `JWT_SECRET` güvenli bir değere ayarlandı (min 32 karakter)
- [ ] `DATABASE_URL` production database'e ayarlandı
- [ ] `REDIS_URL` production Redis'e ayarlandı
- [ ] Tüm API keys (OpenAI, Google GenAI, etc.) ayarlandı
- [ ] CORS origin production domain'e ayarlandı
- [ ] `ORGANIZATION_ID` default organization oluşturuldu

#### Security

- [ ] JWT secret güçlü ve benzersiz (32+ karakter, random)
- [ ] Database credentials güvenli (strong passwords)
- [ ] Redis password ayarlandı (production)
- [ ] API keys güvenli şekilde saklanıyor (secrets management)
- [ ] Rate limiting ayarları production için optimize edildi
- [ ] HTTPS/SSL sertifikaları hazır
- [ ] RLS policies test edildi (organization isolation verified)

#### Database

- [ ] PostgreSQL database oluşturuldu (production)
- [ ] Database migration çalıştırıldı (`pnpm db:migrate`)
- [ ] RLS policies aktif (`drizzle/0005_enable_rls_policies.sql` applied)
- [ ] Default organization oluşturuldu
- [ ] Super admin user oluşturuldu
- [ ] Database backup stratejisi hazır
- [ ] Database connection pool ayarları optimize edildi

#### Cache (Redis)

- [ ] Redis instance hazır (production)
- [ ] Redis password ayarlandı (production)
- [ ] Redis persistence ayarlandı
- [ ] Redis memory limit ayarlandı
- [ ] Redis connection test edildi

#### Build & Test

- [ ] Tüm testler geçti (`pnpm test`)
- [ ] Test coverage %70+ (`pnpm test:coverage`)
- [ ] Linting geçti (`pnpm lint`)
- [ ] TypeScript compilation başarılı (`pnpm build`)
- [ ] Docker image build edildi (`docker build -t dese-ea-plan-v7.0.0 .`)

#### Docker

- [ ] Dockerfile güncel (v7.0.0)
- [ ] Docker image tag'ı doğru (`v7.0.0`)
- [ ] Docker Compose test edildi (`docker compose up -d`)
- [ ] Health checks çalışıyor
- [ ] Port mapping doğru (3000, 3002, 5555-5558)

#### Monitoring

- [ ] Prometheus alert rules deployed (`prometheus/module-alerts.yml`)
- [ ] Grafana dashboards imported (`grafana/dashboard-modules-overview.json`)
- [ ] Alertmanager configured
- [ ] Monitoring endpoints accessible (`/metrics`, `/health`)

#### External Integrations (Optional)

- [ ] **Banka API:** Production credentials added to `integrations` table
- [ ] **E-Fatura:** Foriba production credentials configured
- [ ] **WhatsApp:** Meta Graph API access token configured
- [ ] **TCMB Kur API:** Working (no credentials needed)

---

## 🚀 Deployment Steps

### Step 1: Environment Configuration

```bash
# 1. Copy environment template
cp env.example .env

# 2. Update production values
nano .env

# Required variables:
# - DATABASE_URL=postgresql://user:pass@host:5432/db
# - REDIS_URL=redis://host:6379
# - JWT_SECRET=<strong-random-32-char-secret>
# - NODE_ENV=production
# - CORS_ORIGIN=https://yourdomain.com
```

### Step 2: Database Setup

```bash
# 1. Create production database
createdb dese_ea_plan_v5_prod

# 2. Run migrations
pnpm db:migrate

# 3. Verify RLS policies
psql -d dese_ea_plan_v5_prod -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;"

# 4. Create default organization
psql -d dese_ea_plan_v5_prod -c "INSERT INTO organizations (id, name, slug) VALUES (gen_random_uuid(), 'Default Organization', 'default') RETURNING id;"
```

### Step 3: Build Docker Image

```bash
# Build production image
docker build -t dese-ea-plan-v7.0.0:latest .

# Tag for registry (if using)
docker tag dese-ea-plan-v7.0.0:latest your-registry/dese-ea-plan-v7.0.0:latest

# Push to registry
docker push your-registry/dese-ea-plan-v7.0.0:latest
```

### Step 4: Deploy with Docker Compose

```bash
# 1. Update docker-compose.yml with production values
# - Update DATABASE_URL
# - Update REDIS_URL
# - Update JWT_SECRET
# - Update CORS_ORIGIN

# 2. Start services
docker compose up -d

# 3. Check health
docker compose ps
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

### Step 5: Verify Deployment

```bash
# 1. Check backend health
curl http://localhost:3000/health

# 2. Check frontend
curl http://localhost:3002

# 3. Check API
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/ceo/summary

# 4. Check metrics
curl http://localhost:3000/metrics

# 5. Verify RLS is active
docker compose exec db psql -U dese -d dese_ea_plan_v5 -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true LIMIT 5;"
```

### Step 6: Configure Monitoring

```bash
# 1. Import Grafana dashboards
# - grafana/dashboard-modules-overview.json
# - grafana/dashboard-aiops-health.json
# - grafana/dashboard-predictive-risk.json

# 2. Configure Prometheus alert rules
# - prometheus/module-alerts.yml
# - prometheus/aiops-alerts.yml
# - prometheus/predictive-alerts.yml

# 3. Configure Alertmanager
# - Set up notification channels (Slack, Email, etc.)
```

---

## 🔐 Security Checklist

### Authentication & Authorization

- [x] JWT authentication implemented
- [x] RBAC (module-based) implemented
- [x] RLS (Row-Level Security) active
- [ ] Rate limiting configured for production
- [ ] Session timeout configured
- [ ] Password policy enforced

### Data Protection

- [x] Multi-tenancy isolation (RLS)
- [x] Organization-scoped data access
- [ ] Data encryption at rest (database)
- [ ] Data encryption in transit (HTTPS/TLS)
- [ ] PII data handling compliant (GDPR)

### API Security

- [x] Input validation (Zod schemas)
- [x] SQL injection prevention (Drizzle ORM)
- [x] XSS prevention (input sanitization)
- [ ] API rate limiting per user/IP
- [ ] CORS properly configured

---

## 📊 Monitoring & Observability

### Prometheus Metrics

- [x] HTTP request metrics
- [x] Database connection metrics
- [x] Module-specific metrics
- [x] Custom business metrics

### Grafana Dashboards

- [x] Module Overview Dashboard
- [x] AIOps Health Dashboard
- [x] Predictive Risk Dashboard
- [ ] Custom module dashboards (optional)

### Alerting

- [x] Module alert rules configured
- [x] System alert rules configured
- [ ] Alertmanager notification channels configured
- [ ] Runbook URLs documented

---

## 🔄 Post-Deployment

### Immediate Checks (First 24 Hours)

1. **Monitor Error Rates:**
   ```bash
   # Check Prometheus for error rates
   curl http://localhost:9090/api/v1/query?query=rate(http_requests_total{status_code=~"5.."}[5m])
   ```

2. **Check Application Logs:**
   ```bash
   docker compose logs -f app | grep ERROR
   ```

3. **Verify RLS Isolation:**
   - Test with different organization IDs
   - Verify users can only access their organization's data

4. **Monitor Performance:**
   - Check API latency (should be < 500ms p95)
   - Check database connection pool usage
   - Check Redis cache hit rate

### Weekly Maintenance

1. **Database Backup Verification:**
   - Verify backups are running
   - Test restore procedure

2. **Security Updates:**
   - Check for dependency updates
   - Review security advisories

3. **Performance Review:**
   - Review slow queries
   - Optimize database indexes
   - Review cache hit rates

---

## 🆘 Troubleshooting

### Common Issues

#### RLS Policies Not Working

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check session variables
SHOW app.current_organization_id;
SHOW app.current_user_id;
```

#### High API Latency

```bash
# Check Prometheus metrics
curl http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))

# Check database connections
curl http://localhost:3000/metrics | grep database_connections
```

#### Database Connection Issues

```bash
# Check connection pool
docker compose exec db psql -U dese -d dese_ea_plan_v5 -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection errors in logs
docker compose logs app | grep "database connection"
```

---

## 📚 References

- **Architecture:** `ARCHITECTURE.md`
- **API Guide:** `docs/API_GUIDE.md`
- **Frontend Guide:** `docs/FRONTEND_GUIDE.md`
- **Operations Guide:** `docs/OPERATIONS_GUIDE.md`
- **Security Audit:** `docs/SECURITY_AUDIT_CHECKLIST.md`

---

## ✅ Sign-Off

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Verified By:** _______________  
**Production URL:** _______________

**Notes:**
- All pre-deployment checks completed
- Monitoring configured and tested
- Security measures verified
- Backup strategy in place

