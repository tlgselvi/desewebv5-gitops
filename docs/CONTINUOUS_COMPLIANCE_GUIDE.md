# 🔁 Continuous Compliance Loop Guide

## 📋 Overview

The Continuous Compliance Loop ensures that SBOM baseline, security policies, and configuration remain aligned across the entire application lifecycle. This system automatically detects drift, remediates within acceptable thresholds, and maintains compliance standards.

## 🔄 Loop Architecture

```
┌─────────────────┐
│  Trigger Event  │
│  (Daily/PR)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Pull SBOM from  │
│ Production       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Compare with    │
│ Baseline        │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Drift?  │
    └────┬────┘
         │
    ┌────┴────────────┐
    │                 │
    ▼                 ▼
<5%           5-10%        >10%
Auto-Rebaseline  Alert    FAIL
    │                 │        │
    └────────┬────────┴────────┘
             ▼
    ┌─────────────────┐
    │ Re-validate     │
    │ Kyverno + OPA   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Generate Report │
    │ + Notify Slack  │
    └────────┬────────┘
             │
         ┌───┴───┐
         │   Loop│
         │Complete│
         └───────┘
```

## 🚀 Auto-Rebaseline Flow

### Step-by-Step Process

1. **Trigger**: Daily cron or main branch merge
2. **Pull SBOM**: Download latest from production registry
3. **Calculate Drift**: Compare current vs. baseline SBOM
4. **Decision**:
   - **Drift < 5%**: Auto-update baseline → Commit → Continue
   - **5% ≤ Drift ≤ 10%**: Send alert → Log → Skip auto-rebaseline
   - **Drift > 10%**: **FAIL** → Require manual intervention
5. **Re-validation**: Run Kyverno + OPA policies again
6. **Report**: Generate compliance diff report
7. **Notify**: Send Slack summary

## 🛠️ Manual Operations

### Trigger Compliance Loop Manually

```bash
# Via GitHub CLI
gh workflow run ci-cd.yml --ref main

# With compliance focus
gh workflow run ci-cd.yml --ref main --raw-field compliance=true
```

### Verify SBOM Baseline Sync

```bash
# View rebaseline log
cat compliance/rebaseline.log

# Check baseline status
cat compliance/sbom-baseline.json | jq .baselineDigest
cat compliance/rebaseline-summary.json

# Compare digests
CURRENT=$(sha256sum sbom.spdx.json | cut -d' ' -f1)
BASELINE=$(jq -r '.baselineDigest' compliance/sbom-baseline.json | cut -d: -f2)
echo "Current: $CURRENT"
echo "Baseline: $BASELINE"
```

### Validate Policy Sync

```bash
# Check ArgoCD application
argocd app get policy-sync
argocd app sync policy-sync

# View policy-sync status
kubectl get application policy-sync -n argocd

# Check policy resources
kubectl get configmaps -n policy-monitoring
```

### Check Prometheus Rules

```bash
# Apply compliance alerts
kubectl apply -f prometheus/compliance-loop-alerts.yml -n monitoring

# Verify rule load
kubectl get prometheusrules -n monitoring

# View active alerts
kubectl port-forward svc/prometheus-service -n monitoring 9090:9090
# Open: http://localhost:9090/alerts
```

## 📊 Compliance Report Structure

### compliance-diff-report.json

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "workflow": "CI/CD Pipeline",
  "run_id": "12345",
  "commit": "abc123...",
  "sbom_rebaseline": {
    "status": "success",
    "drift_detected": true,
    "drift_percent": 6.2,
    "baseline_updated": true
  },
  "kyverno_revalidation": {
    "status": "success",
    "compliant": true,
    "violations": 0
  },
  "opa_revalidation": {
    "status": "success",
    "compliant": true,
    "violations": 0
  },
  "summary": {
    "overall_compliance": true,
    "sbom_updated": true,
    "actions_taken": ["auto-rebaseline", "policy revalidation"]
  }
}
```

## 🔔 Slack Alert Examples

### Auto-Rebaseline Success

```
🔁 Continuous Compliance Loop Complete
📊 SBOM Rebaseline: success (drift: 6.2%)
⚙️ Kyverno Revalidation: success (100% compliant)
📘 OPA Revalidation: success (0 violations)
✅ Baseline updated automatically
```

### Drift Alert (5-10%)

```
⚠️ SBOM Drift Detected
📊 Drift: 7.5% (within tolerance)
🔔 Alert sent, auto-rebaseline skipped
📋 Review: compliance/compliance-diff-report.json
```

### Non-Compliance Failure

```
❌ Compliance Revalidation Failed
📊 SBOM Rebaseline: success
⚙️ Kyverno Revalidation: failure (2 violations)
📘 OPA Revalidation: failure (1 violation)
🛑 Pipeline halted - Manual intervention required
```

## 📋 Compliance Matrix

| Metric | Threshold | Action | Severity |
|--------|-----------|--------|----------|
| SBOM Drift | < 5% | Auto-rebaseline | ✅ Normal |
| SBOM Drift | 5-10% | Alert only | ⚠️ Warning |
| SBOM Drift | > 10% | FAIL | ❌ Critical |
| Kyverno Compliance | < 100% | FAIL | ❌ Critical |
| OPA Violations | > 0 | FAIL | ❌ Critical |
| Overall Compliance | < 95% | Alert | ⚠️ Warning |

## 🔧 Manual Override Procedures

### Force Rebaseline (Emergency)

```bash
# 1. Generate new SBOM
syft ghcr.io/org/dese-ea-plan-v5:latest -o spdx-json > sbom-latest.json

# 2. Update baseline manually
python3 scripts/auto_rebaseline.py

# 3. Commit and push
git add compliance/sbom-baseline.json
git commit -m "chore: manual rebaseline [EMERGENCY]"
git push origin main

# 4. Verify
gh run list --workflow=ci-cd.yml | head -5
```

### Disable Auto-Rebaseline Temporarily

```bash
# Edit workflow condition
# .github/workflows/ci-cd.yml
# Change: if: github.ref == 'refs/heads/main'
# To: if: false  # Disabled temporarily
```

### Resolve Non-Compliance

```bash
# 1. Review violations
cat kyverno-audit.json
cat opa-results.json

# 2. Apply fixes
# Update manifests to comply

# 3. Re-run validation
kyverno apply policies/ --audit-warn
opa eval --data policies/ --input deployment.json "data"

# 4. Push fixes
git commit -am "fix: resolve compliance violations"
git push origin main
```

## 🚀 Quick Commands

### Run Full Compliance Loop

```bash
# Trigger via GitHub Actions
gh workflow run ci-cd.yml --ref main

# Monitor execution
gh run watch

# View compliance job logs
gh run view --log | grep "Continuous Compliance"
```

### Verify Loop Completion

```bash
# Check rebaseline log
tail -f compliance/rebaseline.log

# View compliance summary
cat compliance/compliance-diff-report.json | jq .

# Check baseline digest
jq -r '.baselineDigest' compliance/sbom-baseline.json
```

### Monitor Prometheus Alerts

```bash
# Apply alert rules
kubectl apply -f prometheus/compliance-loop-alerts.yml -n monitoring

# Check for active alerts
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.alertname=="SBOMDriftPercentage")'

# View compliance metrics
kubectl port-forward svc/prometheus-service -n monitoring 9090:9090
```

## ✅ Success Criteria

The Continuous Compliance Loop is successful when:

- ✅ SBOM drift < 10%
- ✅ Kyverno compliance: 100%
- ✅ OPA violations: 0
- ✅ Baseline auto-updated (if drift < 5%)
- ✅ Compliance report generated
- ✅ Slack notification sent
- ✅ Pipeline completes without failures

## 📚 Related Documentation

- [Security Audit Summary](./SECURITY_AUDIT_SUMMARY.md)
- [Deployment Summary](../DEPLOYMENT_SUMMARY.md)
- [CICD Guide](../CICD_GUIDE.md)
- [AIOps Summary](../AIOPS_DEPLOYMENT_SUMMARY.md)

---

**Last Updated**: 2024  
**Version**: 5.0.0  
**Status**: ✅ Production Ready

