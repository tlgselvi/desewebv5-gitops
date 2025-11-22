# 🚀 Deployment Checklist - Hızlı Özet

**Son Güncelleme:** 2025-01-27

---

## ✅ 1. GitHub Actions Secrets (2 dakika)

### Kontrol:
```powershell
.\scripts\check-github-secrets.ps1 -Environment production
```

### Manuel Ekleme (GitHub Web UI):
1. **Repository** > **Settings** > **Secrets and variables** > **Actions**
2. **New repository secret** butonuna tıklayın
3. Şu secrets'ları ekleyin:

**Her zaman gerekli:**
- `KUBECONFIG_PRODUCTION`
- `KUBECONFIG_STAGING`

**Production için:**
- `JWT_SECRET`
- `COOKIE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `PROMETHEUS_URL` (veya `MCP_PROMETHEUS_BASE_URL`)

**📄 Detaylı rehber:** `docs/GITHUB_ACTIONS_SECRETS.md`

---

## ✅ 2. Workflow Çalıştırma (30 saniye)

### GitHub Web UI:
1. **Actions** sekmesi > **Automated Deployment**
2. **Run workflow** butonu
3. **Environment:** `staging` veya `production`
4. **Strategy:** `rolling`
5. **Run workflow**

### GitHub CLI:
```bash
gh workflow run deploy.yml -f environment=staging -f strategy=rolling
```

**📊 Log izleme:**
```bash
gh run watch $(gh run list --workflow=deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

**📄 Detaylı rehber:** `docs/WORKFLOW_EXECUTION_GUIDE.md`

---

## ✅ 3. Deploy Sonrası Health Check (1 dakika)

### PowerShell:
```powershell
.\scripts\quick-api-test.ps1 -BaseUrl http://localhost:3000
```

### Manuel:
```bash
curl http://localhost:3000/health/live
curl http://localhost:3000/api/v1
curl http://localhost:3000/metrics
curl -i http://localhost:3000/api/v1/auth/login  # 405 beklenir
```

**📄 Detaylı komutlar:** `docs/API_VALIDATION_COMMANDS.md`

---

## ✅ 4. Test Çalıştırma (İsteğe Bağlı)

### Unit Tests:
```bash
pnpm test  # ~3 saniye
```

### E2E Tests (Playwright):
```bash
pnpm test:auto  # ~30-60 saniye (tüm browser'lar)
pnpm test:auto --project=chromium  # ~15 saniye (sadece Chrome)
```

**Not:** E2E testler uzun sürebilir. Production deploy öncesi sadece Chromium yeterli.

---

## 📊 Hızlı Durum Özeti

| Görev | Durum | Süre |
|-------|-------|------|
| Secrets kontrolü | ⚠️ Script hazır (secrets tanımlanmalı) | 10 sn |
| Workflow çalıştırma | 📝 Manuel (GitHub UI/CLI) | 30 sn |
| Health check | ⚠️ Script hazır (backend çalışıyor olmalı) | 10 sn |
| Unit tests | ✅ **24/24 PASSED** | 3 sn |
| E2E tests | ⏭️ İsteğe bağlı | 30-60 sn |

---

## 🎯 Sonraki Adımlar

1. ✅ **Secrets'ları GitHub'a ekleyin** (yukarıdaki liste)
2. ✅ **Workflow'u çalıştırın** (staging ile test edin)
3. ✅ **Health check yapın** (deploy sonrası)
4. ⏭️ **Testler** (production deploy öncesi)

---

**📚 İlgili Dokümanlar:**
- `docs/GITHUB_ACTIONS_SECRETS.md` - Secrets yapılandırma
- `docs/WORKFLOW_EXECUTION_GUIDE.md` - Workflow detayları
- `docs/API_VALIDATION_COMMANDS.md` - API test komutları
- `docs/DEPLOYMENT_WORKFLOW_SUMMARY.md` - Workflow özeti

---

**⏱️ Toplam Süre:** ~5 dakika (secrets dahil)

