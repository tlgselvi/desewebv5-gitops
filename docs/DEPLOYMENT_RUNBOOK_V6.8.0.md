# Deployment Runbook - Dese EA Plan v6.8.0

**Version:** 6.8.0  
**Last Updated:** 2025-01-27  
**Purpose:** Production deployment procedures and operational guide

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Procedures](#deployment-procedures)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Rollback Procedures](#rollback-procedures)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Troubleshooting](#troubleshooting)
7. [Emergency Contacts](#emergency-contacts)

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (`pnpm test`)
- [ ] Test coverage > 70% (`pnpm test:coverage`)
- [ ] Linting passed (`pnpm lint`)
- [ ] No TypeScript errors
- [ ] Security scan completed (`ops/security-scan.sh`)
- [ ] Code review approved

### Configuration

- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Secrets updated in Kubernetes
- [ ] ConfigMaps updated
- [ ] RBAC permissions seeded (`pnpm rbac:seed`)
- [ ] MCP servers configured

### Infrastructure

- [ ] Kubernetes cluster accessible
- [ ] Docker images built and pushed
- [ ] Helm charts updated
- [ ] Network policies configured
- [ ] Resource limits set
- [ ] Monitoring configured

### Documentation

- [ ] API documentation updated
- [ ] Changelog updated
- [ ] Release notes prepared
- [ ] Deployment plan reviewed

---

## Deployment Procedures

### Environment: Development

```bash
# 1. Build Docker image
docker build -t dese-ea-plan-v5:6.8.0-dev .

# 2. Push to registry
docker push registry.example.com/dese-ea-plan-v5:6.8.0-dev

# 3. Apply Kubernetes manifests
kubectl apply -f k8s/ -n dese-ea-plan-v5-dev

# 4. Verify deployment
kubectl rollout status deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-dev

# 5. Run health checks
curl http://dev-api.dese.ai/health
```

### Environment: Staging

```bash
# 1. Tag release
git tag -a v6.8.0-staging -m "Release v6.8.0 to staging"

# 2. Build and push
docker build -t dese-ea-plan-v5:6.8.0-staging .
docker push registry.example.com/dese-ea-plan-v5:6.8.0-staging

# 3. Deploy with Helm
helm upgrade dese-ea-plan-v5 ./helm/dese-ea-plan-v5 \
  --namespace dese-ea-plan-v5-staging \
  --set image.tag=6.8.0-staging \
  --set environment=staging

# 4. Verify
kubectl rollout status deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-staging
```

### Environment: Production

#### Blue-Green Deployment

```bash
# 1. Create production tag
git tag -a v6.8.0 -m "Release v6.8.0"

# 2. Build production image
docker build -t dese-ea-plan-v5:6.8.0 .
docker push registry.example.com/dese-ea-plan-v5:6.8.0

# 3. Deploy to green environment
helm upgrade dese-ea-plan-v5-green ./helm/dese-ea-plan-v5 \
  --namespace dese-ea-plan-v5-prod \
  --set image.tag=6.8.0 \
  --set environment=production \
  --set deployment.name=dese-ea-plan-v5-green

# 4. Wait for green to be healthy
kubectl rollout status deployment/dese-ea-plan-v5-green -n dese-ea-plan-v5-prod

# 5. Run smoke tests
./scripts/smoke-tests.sh production

# 6. Switch traffic to green
kubectl patch service dese-ea-plan-v5 -n dese-ea-plan-v5-prod \
  -p '{"spec":{"selector":{"version":"green"}}}'

# 7. Monitor for 15 minutes
watch -n 5 'kubectl get pods -n dese-ea-plan-v5-prod'

# 8. If stable, scale down blue
kubectl scale deployment dese-ea-plan-v5-blue --replicas=0 -n dese-ea-plan-v5-prod
```

#### Rolling Update Deployment

```bash
# 1. Deploy with rolling update
helm upgrade dese-ea-plan-v5 ./helm/dese-ea-plan-v5 \
  --namespace dese-ea-plan-v5-prod \
  --set image.tag=6.8.0 \
  --set strategy.type=RollingUpdate \
  --set strategy.rollingUpdate.maxSurge=1 \
  --set strategy.rollingUpdate.maxUnavailable=0

# 2. Monitor rollout
kubectl rollout status deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod

# 3. Verify health
curl https://api.dese.ai/health
```

---

## Post-Deployment Verification

### Health Checks

```bash
# 1. API Health
curl https://api.dese.ai/health | jq

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "version": "6.8.0"
# }

# 2. MCP Servers
curl http://localhost:5555/finbot/health
curl http://localhost:5556/mubot/health
curl http://localhost:5557/dese/health
curl http://localhost:5558/observability/health

# 3. Database Connection
kubectl exec -it deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod -- \
  node -e "import('./src/db/index.js').then(m => m.db.query('SELECT 1'))"

# 4. Redis Connection
kubectl exec -it deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod -- \
  redis-cli ping
```

### Functional Tests

```bash
# 1. Authentication
TOKEN=$(curl -X POST https://api.dese.ai/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' | jq -r .token)

# 2. API Endpoints
curl -H "Authorization: Bearer $TOKEN" https://api.dese.ai/api/v1/permissions

# 3. RBAC Verification
curl -H "Authorization: Bearer $TOKEN" https://api.dese.ai/api/v1/privacy/export

# 4. Metrics
curl https://api.dese.ai/metrics | grep http_requests_total
```

### Performance Checks

```bash
# 1. Response Times
ab -n 1000 -c 10 https://api.dese.ai/health

# 2. Database Query Performance
kubectl exec -it deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod -- \
  node -e "import('./src/services/rbac/permissionService.js').then(m => m.permissionService.findAll())"

# 3. Memory Usage
kubectl top pods -n dese-ea-plan-v5-prod
```

---

## Rollback Procedures

### Quick Rollback (Last 5 minutes)

```bash
# Rollback to previous version
kubectl rollout undo deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod

# Verify rollback
kubectl rollout status deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod
```

### Rollback to Specific Version

```bash
# 1. List deployment history
kubectl rollout history deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod

# 2. Rollback to specific revision
kubectl rollout undo deployment/dese-ea-plan-v5 \
  --to-revision=5 \
  -n dese-ea-plan-v5-prod

# 3. Verify
kubectl rollout status deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod
```

### Blue-Green Rollback

```bash
# 1. Switch traffic back to blue
kubectl patch service dese-ea-plan-v5 -n dese-ea-plan-v5-prod \
  -p '{"spec":{"selector":{"version":"blue"}}}'

# 2. Scale down green
kubectl scale deployment dese-ea-plan-v5-green --replicas=0 -n dese-ea-plan-v5-prod
```

See `ops/rollback-procedure.sh` for automated rollback script.

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **API Health:**
   - Response time (p95 < 500ms)
   - Error rate (< 1%)
   - Request rate

2. **Database:**
   - Connection pool usage
   - Query latency
   - Replication lag

3. **MCP Servers:**
   - Health status
   - Response times
   - Error rates

4. **Infrastructure:**
   - CPU usage (< 80%)
   - Memory usage (< 80%)
   - Disk usage (< 90%)

### Alert Thresholds

- **Critical:** API downtime > 1 minute
- **High:** Error rate > 5%
- **Medium:** Response time p95 > 1000ms
- **Low:** CPU usage > 90%

### Grafana Dashboards

- Realtime Metrics: `/grafana/dashboards/realtime-metrics`
- Performance: `/grafana/dashboards/performance`
- MCP Servers: `/grafana/dashboards/mcp-servers`

---

## Troubleshooting

### Common Issues

#### Issue: Pods not starting

```bash
# Check pod status
kubectl get pods -n dese-ea-plan-v5-prod

# Check logs
kubectl logs deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod

# Check events
kubectl describe pod <pod-name> -n dese-ea-plan-v5-prod
```

#### Issue: Database connection errors

```bash
# Verify database credentials
kubectl get secret dese-ea-plan-v5-secrets -n dese-ea-plan-v5-prod -o yaml

# Test connection
kubectl exec -it deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod -- \
  node -e "import('./src/db/index.js').then(m => m.db.query('SELECT 1'))"
```

#### Issue: High memory usage

```bash
# Check memory usage
kubectl top pods -n dese-ea-plan-v5-prod

# Check for memory leaks
kubectl exec -it deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod -- \
  node --expose-gc --max-old-space-size=512 src/index.ts

# Review heap snapshots
kubectl exec -it deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod -- \
  node --heapsnapshot-signal=SIGUSR2 src/index.ts
```

#### Issue: MCP servers not responding

```bash
# Check MCP server pods
kubectl get pods -l app=mcp-server -n dese-ea-plan-v5-prod

# Check logs
kubectl logs -l app=mcp-server -n dese-ea-plan-v5-prod

# Restart MCP servers
kubectl rollout restart deployment/mcp-server -n dese-ea-plan-v5-prod
```

---

## Emergency Contacts

### On-Call Rotation

- **Primary:** devops@dese.ai | +90 XXX XXX XX XX
- **Secondary:** security@dese.ai | +90 XXX XXX XX XX
- **Escalation:** cto@dese.ai | +90 XXX XXX XX XX

### Escalation Path

1. **Level 1:** DevOps Team (0-30 minutes)
2. **Level 2:** Security Team (30-60 minutes)
3. **Level 3:** CTO (60+ minutes)

---

## Appendices

### A. Environment Variables

```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL=<from-secret>
REDIS_URL=<from-secret>
JWT_SECRET=<from-secret>
PORT=3001
LOG_LEVEL=info
```

### B. Resource Limits

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### C. Database Migrations

```bash
# Run migrations
kubectl exec -it deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod -- \
  pnpm db:migrate

# Verify migrations
kubectl exec -it deployment/dese-ea-plan-v5 -n dese-ea-plan-v5-prod -- \
  pnpm db:studio
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-27  
**Next Review:** 2025-04-27

