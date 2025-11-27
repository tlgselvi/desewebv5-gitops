# Production Deployment Checklist - DESE EA PLAN v7.0.0

**Version:** 7.0.0  
**Last Updated:** 2025-01-27  
**Status:** ✅ Ready for Production

---

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] **Environment Variables**
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL` (PostgreSQL connection string)
  - [ ] `JWT_SECRET` (minimum 32 characters)
  - [ ] `REDIS_URL` (Redis connection string)
  - [ ] `PORT` (default: 3000)
  - [ ] `FRONTEND_URL` (production frontend URL)
  - [ ] `CORS_ORIGIN` (allowed origins)

- [ ] **API Credentials**
  - [ ] Bank API credentials (if using banking integration)
  - [ ] E-Fatura credentials (Foriba API)
  - [ ] WhatsApp Business API credentials (Meta)
  - [ ] TCMB API key (for exchange rates)
  - [ ] OpenAI API key (for JARVIS AI)
  - [ ] GenAI App Builder credentials (if using)

- [ ] **Database**
  - [ ] PostgreSQL 14+ installed and running
  - [ ] Database created (`dese_ea_plan_v5`)
  - [ ] Database migrations applied (`pnpm db:migrate`)
  - [ ] RLS policies enabled and tested
  - [ ] Database backup strategy configured
  - [ ] Connection pooling configured

- [ ] **Redis**
  - [ ] Redis 6+ installed and running
  - [ ] Redis persistence configured (AOF or RDB)
  - [ ] Redis password set (if required)
  - [ ] Redis memory limits configured

### 2. Security Checklist

- [ ] **Authentication & Authorization**
  - [ ] JWT secret is strong (32+ characters)
  - [ ] JWT expiration time configured (default: 24h)
  - [ ] RBAC permissions seeded (`pnpm rbac:seed`)
  - [ ] RLS policies active on all tables
  - [ ] Super admin user created

- [ ] **API Security**
  - [ ] CORS configured for production domains only
  - [ ] Rate limiting enabled
  - [ ] Request size limits configured
  - [ ] HTTPS enforced (TLS 1.2+)
  - [ ] Security headers configured (Helmet.js)

- [ ] **Data Protection**
  - [ ] Encryption at rest enabled (database)
  - [ ] Encryption in transit (TLS/SSL)
  - [ ] Sensitive data encrypted (integration credentials)
  - [ ] PII data handling compliant
  - [ ] Audit logging enabled

- [ ] **Network Security**
  - [ ] Firewall rules configured
  - [ ] Database not exposed to public internet
  - [ ] Redis not exposed to public internet
  - [ ] VPN or private network for internal services

### 3. Application Health

- [ ] **Code Quality**
  - [ ] All tests passing (`pnpm test`)
  - [ ] Test coverage ≥ 70% (`pnpm test:coverage`)
  - [ ] Linting passed (`pnpm lint`)
  - [ ] No critical security vulnerabilities (`pnpm audit`)

- [ ] **Build & Deployment**
  - [ ] Production build successful (`pnpm build`)
  - [ ] Docker images built and tagged
  - [ ] Docker Compose configuration verified
  - [ ] Health check endpoints tested (`/health`, `/ready`, `/live`)

- [ ] **Monitoring & Logging**
  - [ ] Prometheus metrics endpoint configured (`/metrics`)
  - [ ] Grafana dashboards imported
  - [ ] Alert rules configured
  - [ ] Log aggregation configured (if using)
  - [ ] Error tracking configured (Sentry, etc.)

### 4. Infrastructure

- [ ] **Server Requirements**
  - [ ] Minimum 2 CPU cores
  - [ ] Minimum 4GB RAM
  - [ ] Minimum 20GB disk space
  - [ ] Network bandwidth sufficient

- [ ] **Docker & Containers**
  - [ ] Docker 20.10+ installed
  - [ ] Docker Compose 2.0+ installed
  - [ ] Container registry access configured
  - [ ] Container health checks configured

- [ ] **DNS & SSL**
  - [ ] Domain name configured
  - [ ] DNS records (A, CNAME) set
  - [ ] SSL certificate obtained (Let's Encrypt, etc.)
  - [ ] SSL certificate auto-renewal configured
  - [ ] HTTPS redirect configured

### 5. Backup & Recovery

- [ ] **Database Backups**
  - [ ] Automated daily backups configured
  - [ ] Backup retention policy (30 days minimum)
  - [ ] Backup restoration tested
  - [ ] Point-in-time recovery configured (if available)

- [ ] **Application Backups**
  - [ ] Configuration files backed up
  - [ ] Environment variables backed up (securely)
  - [ ] Docker volumes backed up

- [ ] **Disaster Recovery**
  - [ ] Recovery plan documented
  - [ ] Recovery time objective (RTO) defined
  - [ ] Recovery point objective (RPO) defined
  - [ ] Disaster recovery tested

---

## 🚀 Deployment Steps

### Step 1: Prepare Environment

```bash
# Clone repository
git clone <repository-url>
cd desewebv5

# Checkout production branch
git checkout main

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.production
# Edit .env.production with production values
```

### Step 2: Database Setup

```bash
# Run migrations
pnpm db:migrate

# Seed RBAC permissions
pnpm rbac:seed

# Verify RLS policies
psql -U dese -d dese_ea_plan_v5 -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;"
```

### Step 3: Build Application

```bash
# Build backend
pnpm build:backend

# Build frontend
pnpm build:frontend

# Or build everything
pnpm build
```

### Step 4: Start Services

```bash
# Using Docker Compose
docker-compose -f docker-compose.yml up -d

# Or using PM2 (if not using Docker)
pm2 start dist/index.js --name dese-ea-plan
```

### Step 5: Verify Deployment

```bash
# Check health
curl http://localhost:3000/health

# Check readiness
curl http://localhost:3000/ready

# Check liveness
curl http://localhost:3000/live

# Check metrics
curl http://localhost:3000/metrics
```

---

## ✅ Post-Deployment Verification

### 1. Application Health

- [ ] Health endpoint returns `200 OK`
- [ ] Ready endpoint returns `200 OK`
- [ ] Live endpoint returns `200 OK`
- [ ] Metrics endpoint accessible
- [ ] Frontend loads correctly
- [ ] API endpoints respond correctly

### 2. Authentication & Authorization

- [ ] User login works
- [ ] JWT tokens generated correctly
- [ ] RBAC permissions enforced
- [ ] RLS policies working (test with different users)
- [ ] Super admin access verified

### 3. Module Functionality

- [ ] Finance module accessible
- [ ] CRM module accessible
- [ ] Inventory module accessible
- [ ] HR module accessible
- [ ] IoT module accessible
- [ ] SEO module accessible
- [ ] Service module accessible

### 4. External Integrations

- [ ] Bank API connection (if configured)
- [ ] E-Fatura integration (if configured)
- [ ] WhatsApp integration (if configured)
- [ ] TCMB API (exchange rates)
- [ ] JARVIS AI service

### 5. Monitoring & Alerts

- [ ] Prometheus scraping metrics
- [ ] Grafana dashboards showing data
- [ ] Alert rules firing correctly
- [ ] Logs being collected
- [ ] Error tracking working

---

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DATABASE_URL` in `.env`
   - Verify PostgreSQL is running
   - Check firewall rules
   - Verify database exists

2. **Redis Connection Failed**
   - Check `REDIS_URL` in `.env`
   - Verify Redis is running
   - Check Redis password (if set)

3. **JWT Token Invalid**
   - Verify `JWT_SECRET` is set correctly
   - Check token expiration time
   - Verify token format

4. **RLS Policies Not Working**
   - Verify RLS is enabled on tables
   - Check session variables are set
   - Verify `organizationId` in JWT payload

5. **Frontend Not Loading**
   - Check `FRONTEND_URL` in `.env`
   - Verify CORS configuration
   - Check browser console for errors

### Logs

```bash
# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs -f db

# Redis logs
docker-compose logs -f redis
```

---

## 📞 Support

For issues or questions:
- Check documentation: `docs/`
- Review logs: `docker-compose logs`
- Contact DevOps team
- Open issue in repository

---

## 📝 Notes

- This checklist should be reviewed and updated before each production deployment
- All items must be checked before marking deployment as complete
- Keep a record of deployment date, version, and any issues encountered

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Version:** 7.0.0  
**Status:** ☐ Ready ☐ Issues Found
