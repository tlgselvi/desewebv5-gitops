# v5.7.1 Production Runbook

## Overview
This runbook covers the v5.7.1 stable release with Feedback Persistence and AIOps features.

## Release Information
- **Version**: v5.7.1
- **Commit**: 98ee13c
- **Tag**: v5.7.1
- **Status**: ✅ LOCKED STABLE
- **Environment**: Production

## Architecture

### Components
- **Backend**: Node.js + Express + PostgreSQL + Redis
- **Frontend**: Next.js 14 + React + TypeScript + Tailwind
- **Observability**: Prometheus + Grafana + OTel
- **AIOps**: Telemetry Agent + Anomaly Detection + Auto-Remediation
- **Security**: JWT/JWKS + RBAC + Network Policies

### Key Features
- Feedback persistence with Redis (7-day TTL)
- AIOps drift detection and anomaly scoring
- Auto-remediation with action suggestions
- Complete observability pipeline
- JWT key rotation support

## Monitoring

### Critical Metrics
- **P95 Latency**: < 150ms
- **Error Rate**: < 0.5%
- **Availability**: > 99.9%
- **Redis Uptime**: > 99.9%
- **Feedback Success Rate**: > 99.5%

### Dashboards
- **AIOps Dashboard**: `/aiops` - Real-time drift monitoring
- **Grafana**: AIOps Feedback & Stability panels
- **Prometheus**: Custom AIOps metrics

### Alerts
- High latency (> 150ms for 5 minutes)
- High error rate (> 0.5% for 10 minutes)
- Redis connection failures (> 5 in 5 minutes)
- Feedback storage failures

## Troubleshooting

### Common Issues

#### 1. Redis Connection Issues
**Symptoms**: Feedback not saving, Redis errors in logs
**Diagnosis**:
```bash
kubectl exec -n dese-ea-plan-v5 <pod> -- redis-cli ping
kubectl logs -n dese-ea-plan-v5 <pod> | grep redis
```
**Resolution**:
- Check Redis pod status
- Verify network policies
- Check Redis configuration

#### 2. High Latency
**Symptoms**: P95 latency > 150ms
**Diagnosis**:
```bash
curl http://localhost:3000/metrics/aiops
kubectl top pods -n dese-ea-plan-v5
```
**Resolution**:
- Scale up backend pods
- Check Redis performance
- Review database queries

#### 3. AIOps Metrics Not Updating
**Symptoms**: Metrics counters not incrementing
**Diagnosis**:
```bash
curl http://localhost:3000/metrics/aiops | grep aiops_feedback_total
```
**Resolution**:
- Check Prometheus scraping
- Verify metrics endpoint
- Review OTel configuration

### Emergency Procedures

#### Rollback
```bash
# Immediate rollback
kubectl argo rollouts undo cpt-ajan-backend -n dese-ea-plan-v5

# Check rollback status
kubectl argo rollouts get rollout cpt-ajan-backend -n dese-ea-plan-v5
```

#### Scale Up
```bash
# Scale backend
kubectl scale rollout cpt-ajan-backend --replicas=5 -n dese-ea-plan-v5

# Scale Redis
kubectl scale deployment redis --replicas=2 -n dese-ea-plan-v5
```

#### Emergency Maintenance
```bash
# Put in maintenance mode
kubectl patch deployment cpt-ajan-backend -n dese-ea-plan-v5 -p '{"spec":{"replicas":0}}'

# Restore after maintenance
kubectl patch deployment cpt-ajan-backend -n dese-ea-plan-v5 -p '{"spec":{"replicas":3}}'
```

## API Endpoints

### Feedback API
- `POST /api/v1/aiops/feedback` - Submit feedback
- `GET /api/v1/aiops/feedback` - Retrieve feedback
- `DELETE /api/v1/aiops/feedback` - Clear feedback

### AIOps API
- `GET /api/v1/aiops/collect` - Collect telemetry
- `GET /api/v1/aiops/health` - Health check
- `POST /api/v1/aiops/remediate` - Trigger remediation

### Monitoring
- `GET /metrics` - Prometheus metrics
- `GET /metrics/aiops` - AIOps metrics
- `GET /.well-known/jwks.json` - JWT keys
- `GET /health` - Health check

## Security

### Authentication
- JWT tokens with RS256 algorithm
- Key rotation via JWKS endpoint
- Clock skew tolerance: ±60 seconds

### Authorization
- RBAC with least privilege
- Service accounts for pods
- Network policies for traffic control

### Secrets Management
- Redis credentials in K8s secrets
- JWT keys in secure storage
- Regular key rotation

## Performance Tuning

### Backend Optimization
- Connection pooling for Redis
- Database query optimization
- Response compression
- Caching strategies

### Redis Optimization
- Memory usage monitoring
- TTL management
- Persistence configuration
- Connection limits

### Monitoring Optimization
- Metric sampling rates
- Log retention policies
- Alert threshold tuning
- Dashboard performance

## Maintenance

### Regular Tasks
- **Daily**: Check error rates and latency
- **Weekly**: Review security scans
- **Monthly**: Update dependencies
- **Quarterly**: Security audit

### Backup Procedures
- Redis data backup
- Database backups
- Configuration backups
- Secret rotation

## Support Contacts
- **DevOps Team**: devops@company.com
- **On-Call**: +1-XXX-XXX-XXXX
- **Security**: security@company.com

## Change Log
- **v5.7.1**: Initial stable release with AIOps
- **v5.6-stable**: Previous stable version

---

**Last Updated**: $(date)  
**Version**: v5.7.1  
**Status**: LOCKED STABLE

