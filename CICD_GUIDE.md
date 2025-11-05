# 🚀 CI/CD ve Health Check Optimizasyon Rehberi

**Version:** v6.8.0  
**Last Update:** 2025-01-27

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [CI/CD Pipeline Özellikleri](#cicd-pipeline-özellikleri)
3. [Health Check Sistemi](#health-check-sistemi)
4. [Deployment Stratejileri](#deployment-stratejileri)
5. [Kullanım](#kullanım)
6. [GitHub Secrets Yapılandırması](#github-secrets-yapılandırması)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Genel Bakış

Production seviyesinde çalışan DevOps ortamı için optimize edilmiş CI/CD pipeline ve otomatik health check yapıları.

### Özellikler

- ✅ **Otomatik Test & Build**: GitHub Actions ile entegre
- ✅ **Multi-stage Deployment**: Staging → Production
- ✅ **Security Scanning**: Trivy, Semgrep, Cosign
- ✅ **GitOps**: ArgoCD entegrasyonu
- ✅ **Health Monitoring**: 7/24 otomatik sağlık kontrolü
- ✅ **Canary & Rolling Deployment**: Risk-free deployment
- ✅ **Automatic Rollback**: Hata durumunda otomatik geri alma

---

## 🔄 CI/CD Pipeline Özellikleri

### 1. Quality & Security Gate

**Dosya**: `.github/workflows/ci-cd.yml`

- Code linting (ESLint)
- Security audit (pnpm audit)
- SAST scanning (Semgrep)
- Dependency scanning

### 2. Test Suite

- Unit tests (Vitest)
- E2E tests (Playwright)
- Test coverage raporları
- PostgreSQL & Redis container tests

### 3. Build & Scan

- Multi-stage Docker build
- Image signing (Cosign)
- Vulnerability scanning (Trivy)
- GHCR registry push

### 4. Deployment

**Staging** (dev branch):
```yaml
- Automatic deployment on push
- Smoke tests
- Rollout verification
```

**Production** (main branch):
```yaml
- Manual approval required
- Rollback capability
- Slack notifications
- 10-minute timeout
```

---

## 🏥 Health Check Sistemi

### Gelişmiş Health Check Script

**Dosya**: `scripts/advanced-health-check.ps1`

#### Özellikler:

- ✅ Cluster health
- ✅ Pod status
- ✅ Deployment status
- ✅ Services check
- ✅ Ingress status
- ✅ Application health (HTTP)
- ✅ Monitoring stack
- ✅ Database connection
- ✅ Storage (PVCs)
- ✅ Security policies

#### Kullanım:

```powershell
# Basit health check
pnpm health:check

# Detaylı log ile
pnpm health:check:verbose

# Slack bildirimi ile
pwsh scripts/advanced-health-check.ps1 -NotifySlack

# Belirli namespace için
pwsh scripts/advanced-health-check.ps1 -Namespace production
```

### Otomatik Health Monitor

**Dosya**: `scripts/automated-health-monitor.ps1`

#### Özellikler:

- ⏰ Periyodik monitoring (varsayılan: 60 saniye)
- 🔔 Alerting (Slack entegrasyonu)
- 📊 Metrics collection
- 📈 Health history tracking

#### Kullanım:

```powershell
# Sürekli monitoring
pnpm health:monitor

# Tek seferlik kontrol
pwsh scripts/automated-health-monitor.ps1 -RunOnce

# Özel interval
pwsh scripts/automated-health-monitor.ps1 -IntervalSeconds 120 -NotifyOnFailure
```

### Quick Health Check

**Dosya**: `quick-health-check.ps1`

Hızlı sistem kontrolü için minimal script.

```powershell
pnpm health:quick
```

---

## 🚀 Deployment Stratejileri

### 1. Rolling Deployment

**Varsayılan strateji**. Gradual rollout ile sıfır downtime.

**Avantajlar:**
- Zero downtime
- Otomatik pod replacement
- Health checks built-in

**Kullanım:**
```bash
# GitHub Actions'ta otomatik
# Veya manuel:
kubectl set image deployment/dese-ea-plan-v5 \
  dese-ea-plan-v5=ghcr.io/org/repo:dese-ea-plan-v5:SHA \
  -n dese-ea-plan-v5
```

### 2. Canary Deployment

**Risk minimizasyonu** için aşamalı deployment.

**Avantajlar:**
- %10-25 traffic ile test
- Hata durumunda hızlı geri alma
- Metrics tabanlı karar

**Kullanım:**
```bash
# GitHub Actions > deploy.yml > Workflow Dispatch
# Strategy: Canary
```

**Canary Workflow:**
1. %10 traffic canary'e yönlendir
2. 60 saniye metrics topla
3. Hata yoksa %100'e çıkar
4. Hata varsa otomatik rollback

### 3. Blue-Green Deployment

**Anlık geçiş** için full switch.

**Workflow:**
1. Yeni versiyon "green" environment'a deploy
2. Health checks
3. Tüm traffic'i "green"e yönlendir
4. "Blue" environment'ı temizle

---

## 📖 Kullanım

### CI/CD Pipeline'i Çalıştırma

#### 1. Otomatik Trigger (Push)

```bash
# dev branch'e push → Staging deploy
git checkout dev
git push origin dev

# main branch'e push → Production deploy
git checkout main
git push origin main
```

#### 2. Manual Deployment

GitHub Actions > Deploy workflow > Run workflow

**Seçenekler:**
- Environment: staging / production
- Strategy: rolling / canary / blue-green

### Health Check Çalıştırma

#### PowerShell ile:

```powershell
# Basit check
.\scripts\advanced-health-check.ps1

# Detaylı
.\scripts\advanced-health-check.ps1 -Verbose

# Notification ile
.\scripts\advanced-health-check.ps1 -NotifySlack

# Otomatik monitoring
.\scripts\automated-health-monitor.ps1
```

#### npm scripts ile:

```bash
pnpm health:check          # Full health check
pnpm health:check:verbose  # Detailed output
pnpm health:monitor        # Continuous monitoring
pnpm health:quick         # Quick status
```

### CI/CD Setup Script

İlk kurulum için:

```bash
# Linux/Mac
chmod +x scripts/setup-cicd.sh
./scripts/setup-cicd.sh

# PowerShell (Windows)
pwsh scripts/advanced-health-check.ps1
```

---

## 🔐 GitHub Secrets Yapılandırması

### Gerekli Secrets

GitHub > Settings > Secrets and variables > Actions

#### 1. Kubernetes Config

```bash
# Staging
KUBECONFIG_STAGING="<base64-encoded-kubeconfig>"

# Production  
KUBECONFIG_PRODUCTION="<base64-encoded-kubeconfig>"
```

**Kubeconfig hazırlama:**
```bash
# Staging cluster config
cat ~/.kube/config | base64 -w 0

# veya minikube
kubectl config view --flatten | base64 -w 0
```

#### 2. Docker Registry

```bash
# GitHub Container Registry
GITHUB_TOKEN="${{ secrets.GITHUB_TOKEN }}"  # Auto-provided

# Alternatif (Docker Hub)
DOCKER_USERNAME="your-username"
DOCKER_PASSWORD="your-password"
```

#### 3. Notification

```bash
# Slack Webhook
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### Secrets Kaydetme

```bash
# Method 1: GitHub Web UI
# Repository > Settings > Secrets > New repository secret

# Method 2: GitHub CLI
gh secret set KUBECONFIG_STAGING < staging-kubeconfig.txt
gh secret set KUBECONFIG_PRODUCTION < production-kubeconfig.txt
gh secret set SLACK_WEBHOOK "https://hooks.slack.com/services/..."
```

---

## 🔍 Troubleshooting

### 1. CI/CD Pipeline Hataları

#### Build Failed

```bash
# Local test
pnpm install
pnpm lint
pnpm test
pnpm build
```

#### Image Push Failed

```bash
# Registry login test
docker login ghcr.io -u $GITHUB_USERNAME
docker push ghcr.io/org/repo:dese-ea-plan-v5

# Permissions check
gh auth status
```

#### Deployment Timeout

```bash
# Cluster connectivity
kubectl cluster-info
kubectl get nodes

# Resource check
kubectl top nodes
kubectl describe nodes
```

### 2. Health Check Hataları

#### Pods Not Running

```bash
# Check pod status
kubectl get pods -n dese-ea-plan-v5
kubectl describe pod <pod-name> -n dese-ea-plan-v5

# Check logs
kubectl logs <pod-name> -n dese-ea-plan-v5 --tail=100
```

#### Health Endpoint Failing

```bash
# Test health endpoint
kubectl port-forward pod/<pod-name> 3000:3000 -n dese-ea-plan-v5
curl http://localhost:3000/health
```

#### Database Connection Issues

```bash
# Check database pods
kubectl get pods -n default -l app=postgres

# Test connection
kubectl exec -it <app-pod> -n dese-ea-plan-v5 -- psql $DATABASE_URL
```

### 3. Rollback

#### Manuel Rollback

```bash
# View deployment history
kubectl rollout history deployment/dese-ea-plan-v5 -n dese-ea-plan-v5

# Rollback to previous
kubectl rollout undo deployment/dese-ea-plan-v5 -n dese-ea-plan-v5

# Rollback to specific revision
kubectl rollout undo deployment/dese-ea-plan-v5 -n dese-ea-plan-v5 --to-revision=2
```

#### Otomatik Rollback (GitHub Actions)

Pipeline'da otomatik trigger edilir:
- Health checks fail
- Rollout timeout
- Smoke tests fail

---

## 📊 Monitoring Dashboard

### Prometheus

```bash
# Port forward
kubectl port-forward svc/prometheus-service -n monitoring 9090:9090

# Access
http://localhost:9090
```

### Grafana

```bash
# Port forward
kubectl port-forward svc/grafana -n monitoring 3000:3000

# Access
http://localhost:3000
# Default: admin/admin
```

### ArgoCD

```bash
# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access
https://localhost:8080
# Username: admin
```

---

## 🎯 Best Practices

### 1. Deployment

- ✅ Her zaman önce staging'e deploy
- ✅ Test'leri local'de çalıştır
- ✅ Production için manual approval kullan
- ✅ Rollback planı hazırla

### 2. Health Monitoring

- ✅ Health checks'i otomatik çalıştır
- ✅ Alerting'i aktif tut
- ✅ Metrics'i monitör et
- ✅ Log'ları takip et

### 3. Security

- ✅ Secrets'i güvenli sakla
- ✅ Image signing yap
- ✅ Vulnerability scan çalıştır
- ✅ Network policies uygula

### 4. GitOps

- ✅ Infrastructure as Code
- ✅ Git commit'i doğru yap
- ✅ Semantic versioning kullan
- ✅ Changelog tut

---

## 📚 Ek Kaynaklar

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)

---

## 🤝 Katkı

Production health check ve CI/CD pipeline'ını geliştirmek için:

1. Issue aç
2. Feature branch oluştur
3. Pull request gönder
4. Code review'e bekle
5. Merge!

---

**Son Güncelleme**: 2024
**Versiyon**: 5.0.0

