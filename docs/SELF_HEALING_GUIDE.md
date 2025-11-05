# EA Plan v6.8.0 - Self-Healing Deployment & Drift Anticipation Guide

**Version:** v6.8.0  
**Last Update:** 2025-01-27

## Overview
EA Plan v5.2 introduces **Adaptive Resilience** with self-healing capabilities, automated configuration drift prevention, and canary rollout support for high-availability CPT optimization deployments.

## Key Features

### 1. Self-Healing Deployments
- **Automatic pod crash recovery**: Self-healing job detects CrashLoopBackOff pods and auto-restarts
- **Configuration drift healing**: Detects replica drift and triggers rolling updates to restore desired state
- **Resource scaling**: HPA automatically scales pods based on CPU, memory, and latency metrics
- **Health probe enforcement**: Automated validation of liveness and readiness probes

### 2. Drift Anticipation & Prevention
- **Kyverno policies**: Block unauthorized manual changes to deployments
- **Configuration hash tracking**: Monitor and alert on GitOps drift
- **Image signature enforcement**: Require signed container images
- **Namespace isolation**: Enforce deployment restrictions

### 3. Canary Rollout Support
- **10% traffic split**: Gradual rollout with quality gates
- **Automated quality checks**: Prometheus-based error rate monitoring
- **Traffic proportion control**: Dynamic traffic allocation between stable and canary versions
- **Rollback on failure**: Automatic rollback if error rate exceeds 5%

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Self-Healing Components                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐    ┌─────────────────┐                 │
│  │ Kyverno Policy │───→│ Drift Detection │                 │
│  │ (prevent-drift)│    │ & Enforcement   │                 │
│  └────────────────┘    └─────────────────┘                 │
│                                                              │
│  ┌────────────────┐    ┌─────────────────┐                │
│  │ HPA Scaling     │───→│ Automatic       │                │
│  │ (auto-heal)     │    │ Replica Control │                │
│  └────────────────┘    └─────────────────┘                │
│                                                              │
│  ┌────────────────┐    ┌─────────────────┐                │
│  │ Self-Healing    │───→│ Pod Recovery    │                │
│  │ Job            │    │ & Status Reset  │                │
│  └────────────────┘    └─────────────────┘                │
│                                                              │
│  ┌────────────────┐    ┌─────────────────┐                │
│  │ Prometheus      │───→│ SLO Monitoring  │                │
│  │ Alerts          │    │ & Alerting      │                │
│  └────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Guide

### 1. Deploy Self-Healing Infrastructure
```bash
# Apply base deployment structure
kubectl apply -k deploy/base

# Apply production overlay (with self-healing annotations)
kubectl apply -k deploy/overlays/prod

# Sync via ArgoCD
argocd app sync cpt-web
```

### 2. Enable Policy Enforcement
```bash
# Apply Kyverno drift prevention policies
kubectl apply -f policies/kyverno/prevent-drift.yaml

# Apply Prometheus monitoring rules
kubectl apply -f monitoring/prometheus-rules.yaml

# Apply AIOps self-healing job
kubectl apply -f aiops/self-heal-job.yaml
```

### 3. Trigger Canary Rollout
```bash
# Run via GitHub Actions workflow dispatch
gh workflow run ci-cd.yml --ref main --raw-field rollout=canary --raw-field policy_check=true

# Or trigger manually
kubectl patch deployment dese-ea-plan-v5 \
  -n dese-ea-plan-v5 \
  --patch '{"spec":{"replicas":1}}' \
  -p '{"metadata":{"annotations":{"rollout.argoproj.io/traffic-split":"{\"canary\":10,\"stable\":90}"}}}'
```

## Validation Checklist

### Self-Healing Validation
```bash
# Check self-healing job status
kubectl logs job/self-heal-cpt -n dese-ea-plan-v5 | tail -20

# Verify HPA is active
kubectl get hpa -n dese-ea-plan-v5

# Check deployment status
argorollouts get rollout cpt-web

# View ArgoCD diff
argocd app diff cpt-web
```

### Drift Prevention Validation
```bash
# Verify Kyverno policies are active
kubectl get policy -n dese-ea-plan-v5

# Test drift prevention (should be blocked)
kubectl patch deployment dese-ea-plan-v5 -n dese-ea-plan-v5 --type=json -p='[{"op":"replace","path":"/spec/replicas","value":10}]'
# Expected: DENIED by Kyverno

# Check Prometheus alerts
kubectl get prometheusrules predictive-alerts -n monitoring
```

### Canary Rollout Validation
```bash
# Check canary traffic split
kubectl get deployment dese-ea-plan-v5 -n dese-ea-plan-v5 -o yaml | grep traffic-split

# Monitor canary metrics
kubectl exec -n monitoring deployment/prometheus -- \
  wget -qO- "http://localhost:9090/api/v1/query?query=sum(rate(http_requests_total{deployment='dese-ea-plan-v5-canary'}[5m]))"

# Check risk prediction
cat aiops/risk-prediction.json | jq .

# View rollback history
tail -20 logs/rollback-history.log
```

## Monitoring & Alerts

### Key Metrics
- `self_healing_actions_total`: Number of healing actions executed
- `canary_traffic_percentage`: Canary traffic allocation
- `config_drift_detected_total`: Configuration drift events
- `aiops_risk_score`: Predicted deployment risk (0-1)

### Alert Thresholds
| Alert | Threshold | Severity |
|-------|-----------|----------|
| DeploymentReplicaDrift | 5m | Warning |
| PodCrashLoopBackOff | 5m | Critical |
| CanaryHighErrorRate | 5% | Critical |
| LatencySLOViolation | P99 > 1.0s | Critical |
| AvailabilitySLOViolation | Error rate > 0.1% | Critical |

## Manual Override Commands

### Force Rollback
```bash
# Rollback to previous revision
argocd app rollback cpt-web

# Or via kubectl
kubectl rollout undo deployment/dese-ea-plan-v5 -n dese-ea-plan-v5
```

### Disable Self-Healing (Emergency)
```bash
# Suspend self-healing job
kubectl annotate cronjob self-heal-cpt -n dese-ea-plan-v5 \
  cronjob.kubernetes.io/suspended='true'

# Re-enable
kubectl annotate cronjob self-heal-cpt -n dese-ea-plan-v5 \
  cronjob.kubernetes.io/suspended='false'
```

### Bypass Drift Prevention (Admin Only)
```bash
# Temporarily disable Kyverno validation
kubectl patch policy prevent-configuration-drift -n dese-ea-plan-v5 --type=json \
  -p='[{"op":"replace","path":"/spec/validationFailureAction","value":"audit"}]'

# Re-enable enforcement
kubectl patch policy prevent-configuration-drift -n dese-ea-plan-v5 --type=json \
  -p='[{"op":"replace","path":"/spec/validationFailureAction","value":"enforce"}]'
```

## SLO Compliance

| SLO Metric | Target | Measurement |
|------------|--------|-------------|
| Availability | 99.9% | Error rate monitoring |
| Latency (P99) | < 1.0s | HTTP request duration |
| Recovery Time | < 5m | Pod crash to ready |
| Drift Resolution | < 10m | Configuration hash recovery |

## Troubleshooting

### Self-Healing Job Not Running
```bash
# Check CronJob schedule
kubectl get cronjob self-heal-cpt -n dese-ea-plan-v5

# View recent job executions
kubectl get jobs -n dese-ea-plan-v5 | grep self-heal

# Check logs
kubectl logs job/self-heal-cpt-<timestamp> -n dese-ea-plan-v5
```

### Drift Prevention Blocking Valid Changes
```bash
# Check policy status
kubectl describe policy prevent-configuration-drift -n dese-ea-plan-v5

# View Kyverno events
kubectl get events -n dese-ea-plan-v5 --field-selector involvedObject.kind=Policy

# Test policy in audit mode
kyverno apply policies/kyverno/prevent-drift.yaml --audit-warn
```

### Canary Rollout Stuck
```bash
# Check rollout status
argorollouts get rollout cpt-web

# Pause canary
argorollouts pause rollout cpt-web

# Resume canary
argorollouts resume rollout cpt-web

# Abort canary and rollback
argorollouts abort rollout cpt-web
```

## Next Steps

1. **Monitor SLO compliance** for 7 days without interruption
2. **Verify self-healing actions** are logged in `logs/rollback-history.log`
3. **Validate drift prevention** by attempting manual changes
4. **Test canary rollouts** with multiple traffic percentage levels (10%, 25%, 50%)
5. **Review Prometheus alerts** for false positive rate
6. **Expand to additional environments** (staging, production variants)

---

**EA Plan v5.2** | CPT Optimization | Self-Healing & Drift Anticipation
