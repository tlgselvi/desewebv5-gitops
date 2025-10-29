# EA Plan v6.x Lifecycle Pipeline Guide

## 🎯 Pipeline Overview

The EA Plan v6.x system follows a complete lifecycle pipeline with 15 distinct phases:

```
[init] → [predictive] → [drift] → [adaptive] → [autoscaling] → [healing] → 
[security] → [optimization] → [go-live] → [finbot/mubot deploy] → 
[prometheus/grafana] → [inspect] → [aiops validation] → [audit/export] → 
[maintenance]
```

## 📋 Phase Details

### 1. INIT - System Initialization
- Creates required namespaces (`ea-web`, `monitoring`, `aiops`)
- Initializes pipeline tracking ConfigMap
- Sets up base infrastructure

### 2. PREDICTIVE - Predictive Analysis Setup
- Deploys AIOps predictive models
- Configures forecast horizon and confidence thresholds
- Triggers initial model training

### 3. DRIFT - Drift Monitoring
- Enables drift detection mechanisms
- Configures anomaly detection thresholds
- Sets up drift alerting

### 4. ADAPTIVE - Adaptive Tuning
- Activates adaptive configuration management
- Enables dynamic parameter adjustment
- Sets up feedback loops

### 5. AUTOSCALING - Auto-scaling Configuration
- Applies Horizontal Pod Autoscaler (HPA) configurations
- Configures resource-based scaling
- Sets up predictive autoscaling

### 6. HEALING - Self-Healing Configuration
- Applies auto-remediation rules
- Configures self-healing policies
- Sets up automatic recovery mechanisms

### 7. SECURITY - Security Hardening
- Applies network policies
- Enforces Pod Security Standards
- Configures RBAC and secrets management

### 8. OPTIMIZATION - Performance Optimization
- Applies performance tuning configurations
- Optimizes resource allocation
- Configures cache and connection pooling

### 9. GO-LIVE - Production Activation
- Executes production go-live script
- Validates production readiness
- Activates production configurations

### 10. FINBOT/MUBOT DEPLOY - AIOps Components
- Deploys FinBot (Cost & ROI Forecasting)
- Deploys MuBot (Multi-source Data Ingestion)
- Configures AIOps service mesh

### 11. PROMETHEUS/GRAFANA - Monitoring Stack
- Deploys Prometheus monitoring
- Deploys Grafana dashboards
- Configures ServiceMonitors and metrics collection

### 12. INSPECT - System Inspection
- Displays system status
- Shows pod states across namespaces
- Validates component health

### 13. AIOPS VALIDATION - AIOps Validation
- Validates FinBot health and metrics
- Validates MuBot health and metrics
- Checks AIOps service connectivity

### 14. AUDIT/EXPORT - System Audit & Export
- Runs comprehensive system audit
- Exports cluster state to reports
- Generates compliance documentation

### 15. MAINTENANCE - Ongoing Maintenance
- Cleans up old jobs and resources
- Updates pipeline status
- Performs routine maintenance tasks

## 🚀 Usage

### Run Entire Pipeline
```bash
# Bash
bash ops/ea-plan-v6-pipeline.sh

# PowerShell
./ops/ea-plan-v6-pipeline.ps1
```

### Run Specific Phase
```bash
# Bash
PHASE=init bash ops/ea-plan-v6-pipeline.sh
PHASE=predictive bash ops/ea-plan-v6-pipeline.sh
PHASE=go-live bash ops/ea-plan-v6-pipeline.sh

# PowerShell
./ops/ea-plan-v6-pipeline.ps1 -Phase init
./ops/ea-plan-v6-pipeline.ps1 -Phase predictive
./ops/ea-plan-v6-pipeline.ps1 -Phase go-live
```

### Run Up to a Specific Phase
```bash
# Run all phases up to and including "autoscaling"
PHASE=autoscaling bash ops/ea-plan-v6-pipeline.sh

# PowerShell
./ops/ea-plan-v6-pipeline.ps1 -Phase autoscaling
```

## 📊 Phase Execution Order

The pipeline executes phases sequentially, with each phase depending on previous phases:

```
init (required)
  └─> predictive
      └─> drift
          └─> adaptive
              └─> autoscaling
                  └─> healing
                      └─> security
                          └─> optimization
                              └─> go-live
                                  ├─> finbot-mubot (can run independently)
                                  ├─> monitoring (can run independently)
                                  ├─> inspect (can run independently)
                                  ├─> validation (can run independently)
                                  ├─> audit (can run independently)
                                  └─> maintenance (can run independently)
```

## 🔍 Phase Status Tracking

Pipeline progress is tracked in the `ea-plan-v6-pipeline` ConfigMap in the `ea-web` namespace:

```bash
kubectl get configmap ea-plan-v6-pipeline -n ea-web -o yaml
```

## ⚠️ Error Handling

By default, the pipeline stops on errors. To continue despite errors:

```bash
# Bash (with skip errors)
SKIP_ERRORS=true PHASE=all bash ops/ea-plan-v6-pipeline.sh

# PowerShell
./ops/ea-plan-v6-pipeline.ps1 -Phase all -SkipErrors
```

## 📝 Examples

### Daily Maintenance
```bash
PHASE=maintenance bash ops/ea-plan-v6-pipeline.sh
```

### Quick Inspection
```bash
PHASE=inspect bash ops/ea-plan-v6-pipeline.sh
```

### Deploy AIOps Components Only
```bash
PHASE=finbot-mubot bash ops/ea-plan-v6-pipeline.sh
```

### Full Production Deployment
```bash
PHASE=go-live bash ops/ea-plan-v6-pipeline.sh
```

## 🎯 Integration with Other Scripts

The pipeline integrates with:
- `ops/production-go-live.sh` - Production activation
- `ops/deploy-finbot-mubot.sh` - AIOps component deployment
- `ops/audit-ea-plan-v6.sh` - System audit
- `ops/finbot-quick-inspect.sh` - FinBot inspection

## 🤖 Automatic Deployment

### GitHub Actions Auto Deploy

The pipeline can be automatically triggered via GitHub Actions:

```yaml
# .github/workflows/ea-plan-v6-auto-deploy.yml
```

**Triggers:**
- Push to `main`, `sprint/**`, or `feature/**` branches
- Changes in `ops/`, `deploy/`, `finbot/`, or `mubot/` directories
- Manual workflow dispatch
- Daily schedule (2 AM UTC for maintenance)

**Setup:**
1. Add `KUBECONFIG` secret to GitHub repository
2. Ensure GitHub Actions are enabled
3. Push changes - deployment runs automatically

### Auto Deploy Trigger Scripts

**Manual trigger:**
```bash
# Bash
bash ops/auto-deploy-trigger.sh

# PowerShell
./ops/auto-deploy-trigger.ps1 -Phase all
```

**Watch mode (auto-deploy on file changes):**
```bash
bash ops/watch-and-deploy.sh
```

### Deployment Scenarios

**1. Full Auto Deploy (CI/CD)**
- Triggered on git push
- Builds images and deploys automatically
- Runs full pipeline

**2. Manual Phase Trigger**
- Select specific phase via GitHub Actions UI
- Or use command: `gh workflow run ea-plan-v6-auto-deploy.yml -f phase=go-live`

**3. Watch Mode (Development)**
- Watches for file changes
- Auto-deploys when changes detected
- Useful for local development

## 📚 Related Documentation

- [`EA_PLAN_V6_AUDIT_GUIDE.md`](./EA_PLAN_V6_AUDIT_GUIDE.md) - Audit procedures
- [`PROMETHEUS_QUERY_GUIDE.md`](./PROMETHEUS_QUERY_GUIDE.md) - Prometheus queries
- [`README_PRODUCTION_GO_LIVE.md`](../ops/README_PRODUCTION_GO_LIVE.md) - Production deployment

