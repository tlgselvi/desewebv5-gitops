# 🚀 CI/CD + AIOps + Health Check Optimizasyon - Tamamlandı

## ✅ Yapılan Optimizasyonlar

### 1. CI/CD Pipeline (.github/workflows/)

#### 📄 ci-cd.yml - Ana Pipeline
- **Quality & Security**: Lint, audit, Semgrep SAST scanning (8 rulesets)
- **Test Suite**: Unit tests, E2E tests, coverage
- **Build & Scan**: Docker build, Trivy@0.28.0, Syft@0.17.1, Cosign@v3.6.0
- **Deployment**: Staging ve Production deployments via ArgoCD
- **AIOps Monitoring**: Real-time anomaly detection with auto-rollback
- **SEO Monitoring**: Rank drift observer with Slack alerts
- **Post-deploy Health**: Comprehensive validation checks
- **Rollback**: Otomatik hata durumunda geri alma

#### 📄 deploy.yml - Gelişmiş Deployment
- **Pre-flight Checks**: Cluster connectivity, resources
- **Canary Deployment**: Aşamalı risk minimizasyonu
- **Rolling Deployment**: Zero downtime updates
- **Post-deployment Validation**: Smoke tests, metrics
- **Automatic Rollback**: Hata durumunda otomatik geri alma

### 2. Health Check Scripts

#### 📄 scripts/advanced-health-check.ps1
**10 Point Health Check:**
1. ✅ Kubernetes Cluster Health
2. ✅ Namespace Status
3. ✅ Pods Health (Running/Failed)
4. ✅ Deployments Status
5. ✅ Services Health
6. ✅ Ingress Configuration
7. ✅ Application HTTP Health
8. ✅ Monitoring Stack (Prometheus/Grafana)
9. ✅ Database Connection
10. ✅ Security Policies

**Kullanım:**
```powershell
# Basit
.\scripts\advanced-health-check.ps1

# Detaylı
.\scripts\advanced-health-check.ps1 -Verbose

# Notification ile
.\scripts\advanced-health-check.ps1 -NotifySlack

# veya
pnpm health:check
pnpm health:check:verbose
```

#### 📄 scripts/automated-health-monitor.ps1
**7/24 Monitoring:**
- ⏰ Periyodik health check (varsayılan: 60s)
- 🔔 Slack alerting
- 📊 Metrics collection
- 📈 Health history

**Kullanım:**
```powershell
# Sürekli monitoring
.\scripts\automated-health-monitor.ps1

# Tek seferlik
.\scripts\automated-health-monitor.ps1 -RunOnce

# veya
pnpm health:monitor
```

#### 📄 quick-health-check.ps1 (Mevcut)
Hızlı sistem kontrolü

**Kullanım:**
```powershell
.\quick-health-check.ps1
# veya
pnpm health:quick
```

### 3. GitOps Yapılandırma

#### 📄 .gitops/applications/argocd-application.yaml
- Production application configuration
- Staging application configuration
- Automated sync policies
- Health check configurations

### 4. CI/CD Setup Script

#### 📄 scripts/setup-cicd.sh
Otomatik CI/CD kurulum scripti:
- Tool installation (kubectl, helm, argocd)
- Kubernetes configuration
- ArgoCD setup
- Monitoring stack deployment
- Health check validation

**Kullanım:**
```bash
./scripts/setup-cicd.sh
# veya
pnpm cicd:setup
```

### 5. Package.json Updates

**Yeni Scripts:**
```json
{
  "health:check": "pwsh scripts/advanced-health-check.ps1",
  "health:check:verbose": "pwsh scripts/advanced-health-check.ps1 -Verbose",
  "health:monitor": "pwsh scripts/automated-health-monitor.ps1",
  "health:quick": "pwsh quick-health-check.ps1",
  "cicd:setup": "bash scripts/setup-cicd.sh",
  "cicd:sync": "pwsh gitops-sync.ps1",
  "deploy:staging": "kubectl set image ...",
  "deploy:production": "kubectl set image ..."
}
```

### 6. Dokümantasyon

#### 📄 CICD_GUIDE.md
Detaylı kullanım rehberi:
- Genel bakış
- CI/CD pipeline özellikleri
- Health check sistemi
- Deployment stratejileri
- GitHub secrets yapılandırması
- Troubleshooting
- Monitoring dashboard erişimi
- Best practices

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: İlk CI/CD Kurulumu

```powershell
# 1. Secrets'i ayarla (GitHub Web UI)
# Repository > Settings > Secrets > Actions
# KUBECONFIG_STAGING
# KUBECONFIG_PRODUCTION
# SLACK_WEBHOOK

# 2. Setup script'i çalıştır
pnpm cicd:setup

# 3. Health check testi
pnpm health:check

# 4. Dev branch'e push
git push origin dev  # → Staging'e deploy olur

# 5. Main branch'e merge
git checkout main
git merge dev
git push origin main  # → Production'a deploy olur
```

### Senaryo 2: Production Health Check

```powershell
# Hızlı check
pnpm health:quick

# Detaylı check
pnpm health:check:verbose

# Sürekli monitoring
pnpm health:monitor
```

### Senaryo 3: Canary Deployment

```powershell
# GitHub Actions'da:
# 1. Workflow Dispatch
# 2. Environment: production
# 3. Strategy: canary
# 4. Run workflow

# Script otomatik olarak:
# - Canary pod'u oluşturur (%10 traffic)
# - 60 saniye metrics toplar
# - Hata yoksa %100'e çıkarır
# - Hata varsa rollback yapar
```

### Senaryo 4: Manuel Rollback

```powershell
# Rollback GitHub Actions ile:
# 1. Deploy workflow > Rollback > Run workflow

# veya manuel:
kubectl rollout undo deployment/dese-ea-plan-v5 -n dese-ea-plan-v5
```

---

## 🔐 GitHub Secrets Yapılandırması

### Gerekli Secrets

| Secret | Açıklama | Nasıl Alınır |
|--------|----------|--------------|
| `KUBECONFIG_STAGING` | Staging cluster config | `cat ~/.kube/config \| base64` |
| `KUBECONFIG_PRODUCTION` | Production cluster config | `cat ~/.kube/config \| base64` |
| `SLACK_WEBHOOK` | Slack notification webhook | [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks) |

### Secrets Kaydetme

**GitHub Web UI:**
1. Repository > Settings > Secrets and variables > Actions
2. New repository secret
3. Name ve Value'yu gire
4. Add secret

**GitHub CLI:**
```bash
gh secret set KUBECONFIG_STAGING < staging-kubeconfig.txt
gh secret set KUBECONFIG_PRODUCTION < production-kubeconfig.txt
gh secret set SLACK_WEBHOOK "https://hooks.slack.com/services/..."
```

---

## 📊 Monitoring Dashboard'ları

### Prometheus
```powershell
kubectl port-forward svc/prometheus-service -n monitoring 9090:9090
# Access: http://localhost:9090
```

### Grafana
```powershell
kubectl port-forward svc/grafana -n monitoring 3000:3000
# Access: http://localhost:3000
# Default: admin/admin
```

### ArgoCD
```powershell
# Get password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Access: https://localhost:8080
# Username: admin
```

---

## 🚨 Troubleshooting

### CI/CD Pipeline Hataları

**Build Failed:**
```bash
# Local test
pnpm install
pnpm lint
pnpm test
pnpm build
```

**Deployment Timeout:**
```bash
# Cluster connectivity
kubectl cluster-info
kubectl get nodes

# Resource check
kubectl top nodes
kubectl describe nodes
```

### Health Check Hataları

**Pods Not Running:**
```bash
# Check pod status
kubectl get pods -n dese-ea-plan-v5
kubectl describe pod <pod-name> -n dese-ea-plan-v5

# Check logs
kubectl logs <pod-name> -n dese-ea-plan-v5 --tail=100
```

**Health Endpoint Failing:**
```bash
# Test health endpoint
kubectl port-forward pod/<pod-name> 3000:3000 -n dese-ea-plan-v5
curl http://localhost:3000/health
```

---

## 📈 Metrics & Alerting

### Health Check Metrics

Health check script'i şu metrikleri takip eder:
- Cluster node availability
- Pod health (% running)
- Deployment availability
- Service endpoints
- Application response time
- Database connectivity
- Monitoring stack status

### Alert Thresholds

- **CRITICAL**: Pod failures, health endpoint down
- **DEGRADED**: Partial pod failures, slow response
- **HEALTHY**: All systems operational

### Notification Channels

- Slack alerts (configurable webhook)
- GitHub Actions notifications
- Kubernetes Events

---

## ✅ Quality Gates

Pipeline'da active olan quality gates:

1. **Code Quality**: Lint check
2. **Security**: SAST (Semgrep with 8 rulesets), Dependency scan
3. **Tests**: Unit + E2E with coverage
4. **Build**: Docker image build & signing
5. **Scan**: Trivy vulnerability scan (CRITICAL blocks)
6. **Deployment**: Health check validation
7. **Smoke Tests**: Post-deployment verification
8. **AIOps**: Anomaly detection with auto-rollback

Her stage başarısız olursa pipeline durur ve bildirim gönderir.

---

## 🤖 AIOps Integration

### Anomaly Detection
**Script**: `scripts/aiops-anomaly-detector.py`
- Z-score based anomaly detection (threshold > 3.0)
- Monitors: latency, CPU, memory, error rate
- Automatic rollback on anomaly detection
- Slack alerts with detailed metrics

**Kullanım**:
```bash
python3 scripts/aiops-anomaly-detector.py latency.json cpu.json memory.json
```

### SEO Rank Monitoring
**Script**: `scripts/seo-rank-drift-observer.py`
- Monitors keyword rankings from CPT API
- Detects >10% negative drift
- Sends Slack alerts on rank drops
- Creates baseline rankings automatically

**Kullanım**:
```bash
export CPT_API_KEY="your-api-key"
export KEYWORDS="keyword1,keyword2"
python3 scripts/seo-rank-drift-observer.py
```

### Prometheus Alert Rules
**File**: `prometheus/aiops-alerts.yml`
- High Latency: >300ms for 5m
- Pod Restarts: >5 in 10m
- CPU Usage: >90% for 5m
- Memory Pressure: >90% for 5m
- Error Rate: >5% for 10m
- Database Pool: >90 connections
- CrashLoopBackOff: Detection
- No Traffic: 10m silence

**Apply**:
```bash
kubectl apply -f prometheus/aiops-alerts.yml -n monitoring
kubectl -n monitoring exec deployment/prometheus -- kill -HUP 1
```

### ArgoCD Application
**File**: `.gitops/applications/aiops-monitor-application.yaml`
- Auto-sync enabled with self-heal
- Sync wave: 5 (deploy after main app)
- Health checks: Prometheus, Grafana, Alertmanager
- Namespace: monitoring

**Apply**:
```bash
kubectl apply -f .gitops/applications/aiops-monitor-application.yaml
argocd app sync aiops-monitor
```

### Grafana Dashboard
**File**: `grafana/dashboard-aiops-health.json`
- HTTP Latency Over Time
- CPU Anomaly Score
- SEO Rank Drift
- Error Rate Gauge
- Pod Restart Count
- Request Rate Graph
- Memory Usage Graph

**Import**:
```bash
kubectl create configmap grafana-dashboard-aiops \
  --from-file=grafana/dashboard-aiops-health.json \
  -n monitoring
```

---

## 🔍 Security Scanning (SAST)

**Tool**: Semgrep with 8 rulesets
- `p/security-audit`: Security best practices
- `p/owasp-top-ten`: OWASP Top 10 vulnerabilities
- `p/typescript`: TypeScript-specific issues
- `p/javascript`: JavaScript best practices
- `p/general-correctness`: General code correctness
- `p/performance`: Performance anti-patterns
- `p/secrets`: Secrets detection
- `p/docker`: Docker best practices

**Output**: JSON artifact uploaded to GitHub Actions
**Block Policy**: CRITICAL findings block deployment

---

## 📊 Monitoring Commands

### Check Anomaly Detector
```bash
kubectl exec -n dese-ea-plan-v5 deployment/dese-ea-plan-v5 -- \
  curl -sf http://localhost:3000/metrics | grep -E "(http_request|error_rate)"
```

### View Prometheus Alerts
```bash
kubectl port-forward svc/prometheus-service -n monitoring 9090:9090
# Open: http://localhost:9090/alerts
```

### Check Grafana Dashboard
```bash
kubectl port-forward svc/grafana -n monitoring 3000:3000
# Open: http://localhost:3000
# Dashboard: AIOps Health Dashboard
```

### Rollback on Anomaly
```bash
# Manual rollback if needed
kubectl rollout undo deployment/dese-ea-plan-v5 -n dese-ea-plan-v5
kubectl rollout status deployment/dese-ea-plan-v5 -n dese-ea-plan-v5
```

---

## 📚 Ek Kaynaklar

- [CICD_GUIDE.md](./CICD_GUIDE.md) - Detaylı kullanım rehberi
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

---

**Son Güncelleme**: 2024  
**Versiyon**: 5.0.0  
**Status**: ✅ Production Ready

