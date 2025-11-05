# EA Plan v6.8.0 - Deployment Checklist

**Version:** v6.8.0  
**Last Update:** 2025-01-27

## Pre-Deployment

- [ ] All tests passing (`npm test` in both frontend and backend)
- [ ] Docker images built and pushed to registry
- [ ] Kubernetes manifests reviewed and updated
- [ ] Environment variables configured in ConfigMaps/Secrets
- [ ] ArgoCD application configured
- [ ] Backup of current deployment taken

## Deployment

### 1. Build & Tag
```bash
# Backend
docker build -t $REGISTRY_URL/dese-ea-plan-v6.8.0:latest .
docker push $REGISTRY_URL/dese-ea-plan-v6.8.0:latest

# Frontend
cd frontend
docker build -t $REGISTRY_URL/dese-ea-plan-frontend-v6.8.0:latest .
docker push $REGISTRY_URL/dese-ea-plan-frontend-v6.8.0:latest
```

### 2. Git Tag
```bash
git add .
git commit -m "release: EA Plan v6.8.0"
git tag v6.8.0
git push origin main --tags
```

### 3. Apply Kubernetes Resources
```bash
kubectl apply -f ops/k8s/backend-deployment.yaml
kubectl apply -f ops/k8s/backend-service.yaml
kubectl apply -f ops/k8s/frontend-deployment.yaml
kubectl apply -f ops/k8s/frontend-service.yaml
```

### 4. Verify Deployment
```bash
# Check rollout status
kubectl rollout status deployment/cpt-ajan-backend -n dese-ea-plan-v5
kubectl rollout status deployment/cpt-ajan-frontend -n dese-ea-plan-v5

# Check pods
kubectl get pods -n dese-ea-plan-v5 -o wide

# Check services
kubectl get svc -n dese-ea-plan-v5
```

### 5. ArgoCD Sync
```bash
argocd app sync cpt-ajan
argocd app wait cpt-ajan --health --timeout 120
```

### 6. Validate SLO Rules
```bash
promtool check rules ops/prometheus/slo-rules.yml
```

## Post-Deployment Verification

- [ ] Backend health check passes
- [ ] Frontend loads successfully
- [ ] All pods in Running state
- [ ] No error logs in pod logs
- [ ] Metrics being scraped by Prometheus
- [ ] ArgoCD shows application as healthy
- [ ] SLO baselines established

## Rollback Criteria

Deploy should be rolled back if:
- Error rate > 5% for 10 minutes
- P95 latency > 2 seconds
- Availability drops below 99%
- Critical pod crashes detected
- Security issue discovered

## Rollback Commands
```bash
kubectl rollout undo deployment/cpt-ajan-backend -n dese-ea-plan-v5
kubectl rollout undo deployment/cpt-ajan-frontend -n dese-ea-plan-v5
```

## Success Criteria

✅ All health checks passing
✅ No critical alerts firing
✅ Load test passing (k6 run ops/loadtest.k6.js)
✅ Metrics baseline established
✅ ArgoCD sync successful

