# Release Automation Documentation

**Version:** v5.8.0  
**Last Updated:** $(date)  
**Purpose:** Sprint 2.6 automated release pipeline documentation

---

## Overview

Sprint 2.6 release automation consists of three core scripts that work together to ensure a safe, validated, and auditable release process:

1. **signoff-progress.sh** - Tracks approval completion rate
2. **release-automation.sh/.ps1** - Orchestrates full release workflow
3. **post-deployment-validation.sh/.ps1** - Validates deployment success

---

## Prerequisites

### Required Tools
- **Git** - Version control and tagging
- **ArgoCD CLI** - Kubernetes deployment orchestration
- **bash** (Linux/macOS) or **PowerShell** (Windows) - Script execution

### Required Files
- `v5.8.0_RELEASE_CHECKLIST.md` - Complete with all approvals
- `ops/post-deployment-validation.sh` (Linux/macOS) or `.ps1` (Windows)

---

## Scripts

### 1. Sign-off Progress Tracker

**Purpose:** Monitor approval completion and determine release readiness.

#### Usage (Linux/macOS)
```bash
bash ops/signoff-progress.sh
```

#### Usage (Windows/PowerShell)
```powershell
pwsh -ExecutionPolicy Bypass -File ops/signoff-progress.sh
```

#### Output
- Checkbox completion rate
- Approval status for all 7 roles (Tech Lead, DevOps, Security, QA, PO, CEO, Stakeholders)
- Overall release readiness status (✅ GO or ❌ NO-GO)

#### Exit Codes
- `0` - All approvals complete, ready for release
- `1` - Approvals incomplete, release blocked

---

### 2. Release Automation

**Purpose:** Execute complete release workflow with automatic validation.

#### Usage (Linux/macOS)
```bash
# Default tag (v5.8.0)
bash ops/release-automation.sh

# Custom tag
bash ops/release-automation.sh v5.8.1
```

#### Usage (Windows/PowerShell)
```powershell
# Default tag (v5.8.0)
prsh ops/release-automation.ps1

# Custom tag
pwsh ops/release-automation.ps1 -ReleaseTag v5.8.1
```

#### Workflow Steps
1. **Validation Phase** - Runs `signoff-progress.sh` to verify approvals
2. **Git Tag & Push** - Creates and pushes release tag
3. **ArgoCD Deployment** - Syncs and deploys to Kubernetes
4. **Post-Deployment Validation** - Runs health and metrics checks
5. **Final Lock** - Updates `FINAL_STATUS_V5.8.0.md` with "LOCKED STABLE ✅"

#### Rollback
Automatic rollback triggered if:
- Validation phase fails
- ArgoCD deployment fails
- Post-deployment validation fails

```bash
# Manual rollback command
argocd app rollback aiops-prod
```

---

### 3. Post-Deployment Validation

**Purpose:** Verify deployment health, metrics, and SLO compliance.

#### Usage (Linux/macOS)
```bash
bash ops/post-deployment-validation.sh --env prod --tag v5.8.0
```

#### Usage (Windows/PowerShell)
```powershell
pwsh ops/post-deployment-validation.ps1 -env prod -tag v5.8.0
```

#### Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `--env` / `-env` | Environment (prod/staging/dev) | `prod` |
| `--tag` / `-tag` | Release tag | `v5.8.0` |
| `--baseUrl` / `-baseUrl` | Base URL for API | `http://localhost:3000` |
| `--p95LatencyTargetMs` / `-p95LatencyTargetMs` | p95 latency target (ms) | `250` |
| `--errorRateTarget` / `-errorRateTarget` | Error rate target (0-1) | `0.005` (0.5%) |
| `--burnRateTarget` / `-burnRateTarget` | Error budget burn rate (0-1) | `0.10` (10%) |

#### Validation Checks
1. **Health Endpoint** - `GET /health` returns 200 OK
2. **Metrics Endpoint** - `GET /metrics/aiops` returns valid metrics
3. **p95 Latency** - Must be < target (default: 250ms)
4. **Error Rate** - Must be < target (default: 0.5%)
5. **Burn Rate** - Must be < target (default: 10%)

#### Exit Codes
- `0` - All validations passed
- `1` - One or more validations failed

---

## Complete Release Workflow

### Day 5 Release Preparation

1. **Complete Checklist**
   ```bash
   # Edit v5.8.0_RELEASE_CHECKLIST.md and fill in all sections
   # Ensure all approvals are marked with ✅
   ```

2. **Verify Sign-off Status**
   ```bash
   bash ops/signoff-progress.sh
   # Should show: ✓ All approvals received. Ready for release!
   ```

3. **Execute Release**
   ```bash
   # Linux/macOS
   bash ops/release-automation.sh
   
   # Windows
   pwsh ops/release-automation.ps1
   ```

4. **Monitor Deployment**
   ```bash
   # Check ArgoCD status
   argocd app get aiops-prod
   
   # Check pod status
   kubectl get pods -n dese-ea-plan-v5
   ```

5. **Verify Success**
   - Script should output: `[SUCCESS] v5.8.0 deployed and validated. System locked stable.`
   - `FINAL_STATUS_V5.8.0.md` should contain "Status: LOCKED STABLE ✅"

---

## Troubleshooting

### Approval Incomplete
**Error:** `[FAIL] Approvals incomplete`

**Solution:** Complete all required approvals in `v5.8.0_RELEASE_CHECKLIST.md`

### Health Check Failed
**Error:** `[FAIL] Health endpoint not OK`

**Solution:**
```bash
# Check pod status
kubectl get pods -n dese-ea-plan-v5

# Check logs
kubectl logs -n dese-ea-plan-v5 <pod-name>

# Restart if needed
kubectl rollout restart deployment/cpt-ajan-backend -n dese-ea-plan-v5
```

### Metrics Threshold Exceeded
**Error:** `[ERROR] Threshold checks failed`

**Solution:**
- Check Grafana dashboards for metric details
- Review application logs for performance issues
- Consider rollback if persistent: `argocd app rollback aiops-prod`

### ArgoCD Sync Failed
**Error:** `argocd app sync` timeout or error

**Solution:**
```bash
# Check sync status
argocd app get aiops-prod

# Retry sync
argocd app sync aiops-prod --force

# Check for conflicts
argocd app diff aiops-prod
```

---

## Security Considerations

- All scripts use `set -euo pipefail` (Bash) or `$ErrorActionPreference = 'Stop'` (PowerShell)
- Git tags are annotated with release metadata
- ArgoCD apps require explicit sync commands
- Rollback procedures are validated before execution

---

## Related Documentation

- `v5.8.0_RELEASE_CHECKLIST.md` - Release checklist and sign-off
- `DESE_WEB_V5.6_SPRINT_PLAN.md` - Sprint planning and Day 5 summary
- `docs/PRODUCTION_RUNBOOK_V5.7.1.md` - Production operations guide
- `FINAL_STATUS_V5.7.1.md` - Previous release final status

---

**Maintainer:** DevOps Team  
**Support:** devops@company.com  
**Version:** 1.0
