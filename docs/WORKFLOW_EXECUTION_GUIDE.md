# 🚀 GitHub Actions Workflow Çalıştırma Rehberi

**Versiyon:** 1.0  
**Son Güncelleme:** 2025-01-27

---

## 📋 Ön Hazırlık

### 1. Secrets Kontrolü

Önce secrets'ların tanımlı olduğundan emin olun:

#### PowerShell ile:
```powershell
.\scripts\check-github-secrets.ps1 -Environment production
```

#### Bash ile:
```bash
bash scripts/check-github-secrets.sh production
```

#### Gerekli Secrets:

**Her zaman gerekli:**
- `KUBECONFIG_PRODUCTION` - Production Kubernetes config
- `KUBECONFIG_STAGING` - Staging Kubernetes config

**Production environment için:**
- `JWT_SECRET` - JWT token secret
- `COOKIE_KEY` - Cookie session key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_CALLBACK_URL` - Google OAuth callback URL
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `PROMETHEUS_URL` veya `MCP_PROMETHEUS_BASE_URL` - Prometheus endpoint (en az biri)

---

## 🎯 Workflow Çalıştırma

### Yöntem 1: GitHub Web UI

1. **Repository'ye gidin:**
   ```
   https://github.com/[OWNER]/dese-ea-plan-v5
   ```

2. **Actions sekmesine tıklayın**

3. **"Automated Deployment" workflow'unu seçin**

4. **"Run workflow" butonuna tıklayın**

5. **Parametreleri ayarlayın:**
   - **Environment:** `staging` veya `production`
   - **Strategy:** `rolling` veya `canary`

6. **"Run workflow" butonuna tıklayın**

### Yöntem 2: GitHub CLI

```bash
# Staging deployment (rolling)
gh workflow run deploy.yml \
  -f environment=staging \
  -f strategy=rolling

# Production deployment (rolling)
gh workflow run deploy.yml \
  -f environment=production \
  -f strategy=rolling

# Production deployment (canary)
gh workflow run deploy.yml \
  -f environment=production \
  -f strategy=canary
```

### Yöntem 3: API ile

```bash
# GitHub Personal Access Token gerekli
export GITHUB_TOKEN="ghp_..."

# Workflow dispatch
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/[OWNER]/dese-ea-plan-v5/actions/workflows/deploy.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "environment": "staging",
      "strategy": "rolling"
    }
  }'
```

---

## 📊 Workflow Log İzleme

### GitHub Web UI

1. Actions sekmesine gidin
2. "Automated Deployment" workflow run'unu seçin
3. İlgili job'ı seçin (preflight, deploy-canary, deploy-rolling, vb.)
4. Step'leri genişleterek logları inceleyin

### GitHub CLI ile

```bash
# Workflow run'ları listele
gh run list --workflow=deploy.yml

# Son run'un ID'sini al
RUN_ID=$(gh run list --workflow=deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')

# Logları izle
gh run watch $RUN_ID

# Logları indir
gh run view $RUN_ID --log > workflow-logs.txt
```

### Belirli Step Logları

```bash
# Preflight job logları
gh run view $RUN_ID --job=<PREFLIGHT_JOB_ID> --log

# Deploy job logları
gh run view $RUN_ID --job=<DEPLOY_JOB_ID> --log
```

---

## ✅ Deploy Sonrası Doğrulama

### Quick Health Check

#### PowerShell:
```powershell
.\scripts\quick-api-test.ps1
```

#### Bash:
```bash
bash scripts/quick-api-test.sh
```

### Manuel Test

```bash
# Health endpoint
curl http://localhost:3000/health/live

# API root
curl http://localhost:3000/api/v1

# Metrics
curl http://localhost:3000/metrics

# Auth login (GET - 405 beklenir)
curl -i http://localhost:3000/api/v1/auth/login

# Auth login (POST - production'da 403, development'ta 200)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

### Kubernetes Port Forward

Eğer servis Kubernetes'te çalışıyorsa:

```bash
# Port forward
kubectl port-forward svc/[SERVICE_NAME] 3000:3000 -n [NAMESPACE]

# Ardından health check'leri çalıştırın
```

---

## 🧪 Test Komutları

### Unit/Integration Tests

```bash
# Tüm testleri çalıştır
pnpm test

# Coverage ile
pnpm test:coverage

# Watch mode
pnpm test --watch

# UI ile
pnpm test:ui
```

### E2E Tests (Playwright)

```bash
# Tüm E2E testleri
pnpm test:auto

# UI ile
pnpm test:auto:ui

# Belirli test dosyası
pnpm test:auto tests/e2e/auth.spec.ts

# Belirli proje (chromium, firefox, webkit)
pnpm test:auto --project=chromium
```

---

## 🔍 Troubleshooting

### Workflow Başarısız Olursa

1. **Secrets kontrolü:**
   ```powershell
   .\scripts\check-github-secrets.ps1 -Environment production
   ```

2. **Preflight job loglarına bakın:**
   - Kubeconfig validation hatası mı?
   - Production secrets eksik mi?

3. **Deploy job loglarına bakın:**
   - Kubernetes API connection hatası mı?
   - Deployment timeout mu?

### Deployment Başarısız Olursa

1. **Kubernetes cluster'a bağlanın:**
   ```bash
   # Kubeconfig'i export edin
   export KUBECONFIG=~/.kube/config-production
   
   # Pod durumunu kontrol edin
   kubectl get pods -n [NAMESPACE]
   
   # Pod loglarını inceleyin
   kubectl logs [POD_NAME] -n [NAMESPACE]
   ```

2. **Health check'leri çalıştırın:**
   ```powershell
   .\scripts\quick-api-test.ps1
   ```

3. **Rollback yapın:**
   ```bash
   gh workflow run deploy.yml -f environment=production -f strategy=rollback
   ```

---

## 📚 İlgili Dokümanlar

- `docs/GITHUB_ACTIONS_SECRETS.md` - Secrets yapılandırma rehberi
- `docs/DEPLOYMENT_WORKFLOW_SUMMARY.md` - Workflow detayları
- `docs/API_VALIDATION_COMMANDS.md` - API test komutları
- `docs/OPERATIONS_GUIDE.md` - Operasyonel prosedürler

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0

