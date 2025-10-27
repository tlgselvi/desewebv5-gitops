# Dese Web v5.6 - Sprint 1.5 Ops Deployment Notes

## Day 1 - Load Testing (k6)

### Requirements
- k6 installed: `pnpm add -D k6`

### Load Test Configuration
File: `ops/loadtest.k6.js`
- Virtual Users: 20
- Duration: 30 seconds
- Target: `http://localhost:8080/api/v1/metrics`

### Run Load Test
```bash
k6 run ops/loadtest.k6.js
```

### Expected Results
- Response time < 500ms
- Success rate > 99.9%
- Error rate < 0.1%

## Day 2 - SLO & Error Budget Monitoring

### Prometheus SLO Rules
File: `ops/prometheus/slo-rules.yml`

#### Metrics Tracked
- **api_latency_p95**: 95th percentile latency
- **api_error_rate**: Error rate percentage

#### Alerts Configured
1. **HighErrorRate**: Error rate > 5% for 10 minutes (Critical)
2. **HighLatency**: P95 latency > 2s for 5 minutes (Warning)
3. **LowAvailability**: Availability < 99% for 10 minutes (Critical)

### Apply SLO Rules
```bash
kubectl apply -f ops/prometheus/slo-rules.yml
```

## Day 3 - Deployment Verification

### Deployment Status
```bash
# Check backend deployment
kubectl rollout status deployment/dese-ea-plan-v5 -n dese-ea-plan-v5

# Check frontend deployment (if exists)
kubectl rollout status deployment/cpt-ajan-frontend -n ea-web

# List all pods
kubectl get pods -n dese-ea-plan-v5 -o wide
```

### ArgoCD Sync
```bash
# Sync ArgoCD application
argocd app sync cpt-ajan
```

## Deployment Namespaces

- **Backend**: `dese-ea-plan-v5`
- **Frontend**: `ea-web` (for legacy deployments)
- **Monitoring**: `monitoring`

## Service Endpoints

- Backend API: `/api/v1`
- Metrics: `/metrics`
- Health: `/health`
- Health Liveness: `/health/live`
- Health Readiness: `/health/ready`

## Environment Variables

All environment variables are managed via ConfigMaps and Secrets in Kubernetes:
- ConfigMap: `dese-ea-plan-v5-config`
- Secrets: `dese-ea-plan-v5-secrets`

## Monitoring Dashboards

- Prometheus: `http://prometheus-service:9090` (in cluster)
- Grafana: Configured dashboards for SLO monitoring

## Rollback Procedures

If deployment fails:
```bash
# Rollback to previous version
kubectl rollout undo deployment/dese-ea-plan-v5 -n dese-ea-plan-v5

# Check rollout history
kubectl rollout history deployment/dese-ea-plan-v5 -n dese-ea-plan-v5
```

