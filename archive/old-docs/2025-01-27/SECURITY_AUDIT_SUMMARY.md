# 🛡️ Security Audit & Policy Compliance Summary

## 📋 Overview

This document describes the security audit and policy drift detection system integrated into the dese-ea-plan-v5 CI/CD pipeline.

## ✅ Security Audit Workflow

### Automated Checks (Job: `security-audit`)

The security audit job runs after the build stage and validates:

1. **Trivy Config Scan** (K8s manifests)
   - Tool: Trivy@0.28.0
   - Scope: `k8s/` directory
   - Format: JSON output
   - Severity: CRITICAL, HIGH
   - Action: Fail pipeline on violations

2. **Kyverno Policy Validation**
   - Tool: Kyverno@1.11.0
   - Policies: `policies/kyverno-*.yaml`
   - Mode: Enforce with audit
   - Action: Fail on non-compliance

3. **OPA Policy Validation**
   - Tool: OPA@0.65.0
   - Policies: `opa-deny-privileged.rego`, `opa-enforce-namespace.rego`
   - Action: Fail on violations

4. **SBOM Baseline Compliance**
   - Baseline: `compliance/sbom-baseline.json`
   - Max Drift: 5%
   - Action: Warn on drift (strict mode can fail)

---

## 🏃 Running Manual Audits

### Kyverno Validation

```bash
# Install Kyverno CLI
curl -sLO https://github.com/kyverno/kyverno/releases/download/v1.11.0/kyverno-cli_v1.11.0_linux_amd64.tar.gz
tar -xzf kyverno-cli_v1.11.0_linux_amd64.tar.gz
sudo mv kyverno /usr/local/bin/

# Validate policies
kyverno apply policies/kyverno-require-signed-images.yaml --audit-warn
kyverno apply policies/kyverno-resource-limits.yaml --audit-warn

# Run against cluster resources
kyverno apply policies/ --audit --audit-warn
```

### OPA Validation

```bash
# Install OPA CLI
curl -sLO https://github.com/open-policy-agent/opa/releases/download/v0.65.0/opa_linux_amd64_static
chmod +x opa_linux_amd64_static
sudo mv opa_linux_amd64_static /usr/local/bin/opa

# Generate deployment JSON
kubectl get deployment dese-ea-plan-v5 -n dese-ea-plan-v5 -o json > deployment.json

# Run OPA validation
opa eval --data policies/opa-deny-privileged.rego \
         --data policies/opa-enforce-namespace.rego \
         --input deployment.json \
         "data"

# Check for violations
opa eval --data policies/ --input deployment.json "data" | jq '.result'
```

### SBOM Comparison

```bash
# Generate current SBOM
syft ghcr.io/org/dese-ea-plan-v5:latest -o spdx-json > sbom-latest.json

# Calculate digest
LATEST_DIGEST=$(sha256sum sbom-latest.json | cut -d' ' -f1)
BASELINE_DIGEST=$(jq -r '.baselineDigest' compliance/sbom-baseline.json)

# Compare digests
if [ "$LATEST_DIGEST" != "$BASELINE_DIGEST" ]; then
  echo "⚠️  SBOM drift detected!"
  # Compare dependencies
  jq -s '.[0].packages - .[1].packages' sbom-latest.json compliance/sbom-baseline.json
else
  echo "✅ SBOM matches baseline"
fi
```

---

## 📊 Interpreting Audit Reports

### Security Audit Report JSON

The report is available as a GitHub Actions artifact: `security-audit-report`

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "workflow": "CI/CD Pipeline",
  "run_id": "12345",
  "commit": "abc123...",
  "branch": "main",
  "checks": {
    "trivy_config": {
      "status": "success",
      "tool": "Trivy@0.28.0"
    },
    "kyverno": {
      "status": "success",
      "tool": "Kyverno@1.11.0",
      "policies": "resources/kyverno-*.yaml"
    },
    "opa": {
      "status": "success",
      "tool": "OPA@0.65.0",
      "policies": ["opa-deny-privileged.rego", "opa-enforce-namespace.rego"]
    },
    "sbom_compliance": {
      "status": "success",
      "baseline": "compliance/sbom-baseline.json",
      "max_drift": "5%"
    }
  },
  "summary": {
    "total_checks": 4,
    "passed": "true",
    "failed": "false"
  }
}
```

### Understanding Status Values

- **success**: All checks passed, no violations
- **failure**: Security violation detected, pipeline halted
- **warning**: Drift detected but within tolerance

---

## 🔄 Remediation & Rollback

### On Security Violation

If the security audit fails:

1. **Review Artifacts**
   ```bash
   # Download artifacts from GitHub Actions
   gh run download --artifact security-audit-report
   
   # View detailed reports
   cat security-audit-report.json
   cat kyverno-audit.json
   cat opa-results.json
   ```

2. **Manual Validation**
   ```bash
   # Test policies locally
   kyverno apply policies/ --audit-warn
   opa eval --data policies/ --input deployment.json "data"
   ```

3. **Fix Violations**
   - Update manifests to comply with policies
   - Re-sign images if required (Cosign)
   - Adjust SBOM baseline if needed

4. **Redeploy After Fix**
   ```bash
   git commit -am "fix: resolve security audit violations"
   git push origin main
   ```

### Rollback Command

If security violations are detected in production:

```bash
# Rollback deployment
kubectl rollout undo deployment/dese-ea-plan-v5 -n dese-ea-plan-v5

# Verify rollback
kubectl rollout status deployment/dese-ea-plan-v5 -n dese-ea-plan-v5

# Check pod status
kubectl get pods -n dese-ea-plan-v5 -l app.kubernetes.io/name=dese-ea-plan-v5
```

---

## 📋 Compliance Matrix

| Check | Tool | Version | Policy | Fail Condition | Severity |
|-------|------|---------|--------|----------------|----------|
| Config Scan | Trivy | 0.28.0 | k8s/ manifests | CRITICAL vulns | High |
| Signed Images | Kyverno | 1.11.0 | require-signed-images | Missing signature | High |
| Resource Limits | Kyverno | 1.11.0 | require-resource-limits | No CPU/memory limits | Medium |
| Privileged Containers | OPA | 0.65.0 | deny-privileged | Privileged=true | Critical |
| Root User | OPA | 0.65.0 | deny-privileged | UID=0 | Critical |
| Namespace Enforcement | OPA | 0.65.0 | enforce-namespace | Unallowed namespace | High |
| SBOM Drift | Syft | 0.17.1 | sbom-baseline.json | >5% drift | Medium |

---

## 🚀 Quick Reference

### Validate CI/CD Jobs
```bash
gh workflow run ci-cd.yml --ref dev
```

### Run Manual Kyverno Audit
```bash
kyverno apply policies/ --audit-warn
```

### Run Manual OPA Validation
```bash
opa eval --data policies/ --input deployment.json "data"
```

### Compare SBOM Digest
```bash
sha256sum compliance/sbom-baseline.json sbom-latest.json
```

### Sync with ArgoCD
```bash
argocd app sync aiops-monitor
argocd app get aiops-monitor
```

### View Audit Reports
```bash
kubectl get events -n dese-ea-plan-v5 --sort-by='.lastTimestamp' | tail -20
```

---

## 📧 Slack Notifications

Security audit results are automatically sent to Slack:

```
🛡️ Security Audit Complete
✅ Trivy: success
⚙️ Kyverno: 100% compliant
📘 OPA: No violations
🧩 SBOM Drift: Stable
```

On violation:
```
🚨 Security Audit Failed
❌ Trivy: CRITICAL vulnerabilities detected
⚙️ Kyverno: Non-compliant resources found
📘 OPA: Privileged container detected
🧩 SBOM Drift: Exceeds 5% threshold
```

---

## 📚 Policy Files Reference

### Kyverno Policies

- **`policies/kyverno-require-signed-images.yaml`**
  - Ensures all images are signed with Cosign
  - Checks for `cosign.sigstore.dev/signature` annotation
  - Severity: High

- **`policies/kyverno-resource-limits.yaml`**
  - Requires CPU and memory limits for all containers
  - Prevents resource starvation
  - Severity: Medium

### OPA Policies

- **`policies/opa-deny-privileged.rego`**
  - Blocks privileged containers
  - Enforces non-root users
  - Requires readOnlyRootFilesystem
  - Severity: Critical

- **`policies/opa-enforce-namespace.rego`**
  - Restricts allowed namespaces
  - Blocks default/test namespaces
  - Severity: High

### SBOM Baseline

- **`compliance/sbom-baseline.json`**
  - Baseline dependency digest
  - Max drift: 5%
  - Strict mode: Enabled

---

## ✅ Best Practices

1. **Always run security audit before merge**
2. **Fix violations immediately, don't bypass**
3. **Keep SBOM baseline updated**
4. **Review audit reports regularly**
5. **Use rollback if production is affected**
6. **Monitor Slack alerts for security events**

---

**Last Updated**: 2024  
**Version**: 5.0.0  
**Status**: ✅ Production Ready

