# 🚀 Production Deployment Steps - Uygulama Raporu

**Tarih:** 2025-01-27  
**Aşama:** Production'a çıkış hazırlığı

---

## 📋 Adım 1: GitHub Actions Secrets Kontrolü

**Durum:** ⚠️ **Secrets eksik** - Manuel olarak eklenmeli

**Kontrol Komutu:**
```powershell
.\scripts\check-github-secrets.ps1 -Environment production
```

**Eksik Secrets (11 adet):**
- `KUBECONFIG_PRODUCTION`
- `KUBECONFIG_STAGING`
- `JWT_SECRET`
- `COOKIE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `PROMETHEUS_URL` (veya `MCP_PROMETHEUS_BASE_URL`)

**Aksiyon:**
1. GitHub Repository > Settings > Secrets and variables > Actions
2. Yukarıdaki secrets'ları tek tek ekleyin
3. Kontrol script'ini tekrar çalıştırın:
   ```powershell
   .\scripts\check-github-secrets.ps1 -Environment production
   ```
4. Tüm secrets'lar ✅ olana kadar devam edin

**Rehber:** `docs/GITHUB_ACTIONS_SECRETS.md`

---

## 📋 Adım 2: Backend Prod Mod Test (Local)

**Durum:** ⚠️ **Backend development modunda çalışıyor**

**Adımlar:**

1. **Mevcut backend'i durdurun** (eğer çalışıyorsa):
   - Terminal'de `Ctrl+C` ile durdurun

2. **Production modda başlatın:**
   ```powershell
   .\scripts\start-backend-production.ps1
   ```
   
   Bu script:
   - `NODE_ENV=production` set eder
   - `SKIP_NEXT=true` set eder
   - `DISABLE_RATE_LIMIT` kaldırır
   - Backend'i production modda başlatır

3. **Başka bir terminal'de auth guard testi:**
   ```powershell
   .\scripts\test-production-auth.ps1
   ```

**Beklenen Sonuçlar:**
- ✅ `GET /api/v1/auth/login` → **405** (Allow: POST)
- ✅ `POST /api/v1/auth/login` → **403** (mock_login_disabled)

**Not:** Backend production modda çalışmalı. Eğer testler başarısız olursa, backend'in `NODE_ENV=production` ile çalıştığından emin olun.

---

## 📋 Adım 3: Actions Deploy Workflow Çalıştırma

**Durum:** ⚠️ **Secrets eksik olduğu için henüz çalıştırılamadı**

**Önkoşul:** Adım 1'deki secrets'lar eklenmiş olmalı

**Komut:**
```bash
gh workflow run deploy.yml -f environment=production -f strategy=rolling
```

**Alternatif (GitHub Web UI):**
1. GitHub Repository > Actions
2. "Automated Deployment" workflow'unu seçin
3. "Run workflow" butonuna tıklayın
4. **Environment:** `production`
5. **Strategy:** `rolling`
6. "Run workflow" butonuna tıklayın

**Log İzleme:**
```bash
gh run watch <RUN_ID>
```

**Beklenen Akış:**
1. ✅ Preflight: Secrets validation
2. ✅ Deploy: Rolling strategy
3. ✅ Validate: Health checks
4. ✅ Complete: Deployment successful

**Not:** Secrets eksik olduğu için workflow validation aşamasında hata verecektir. Secrets eklendikten sonra tekrar çalıştırın.

---

## 📋 Adım 4: Deploy Sonrası Sağlık Testi

**Durum:** ⏳ **Deploy tamamlanana kadar bekleniyor**

**Test Komutu:**
```powershell
.\scripts\quick-api-test.ps1 -BaseUrl https://api.poolfab.com.tr -Environment production
```

**Beklenen Sonuçlar (4/4):**
- ✅ `GET /api/v1` → **200** (API Root)
- ✅ `GET /api/v1/auth/login` → **405** (Method Not Allowed, Allow: POST)
- ✅ `POST /api/v1/auth/login` → **403** (Mock login disabled in production)
- ✅ `GET /health/live` → **200** (Liveness Probe)
- ✅ `GET /metrics` → **200** (Prometheus Metrics)

**Manuel Test Komutları:**
```bash
# Health check
curl https://api.poolfab.com.tr/health/live

# API root
curl https://api.poolfab.com.tr/api/v1

# Auth login (GET - 405 beklenir)
curl -i https://api.poolfab.com.tr/api/v1/auth/login

# Auth login (POST - 403 beklenir)
curl -X POST https://api.poolfab.com.tr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}'

# Metrics
curl https://api.poolfab.com.tr/metrics
```

**Sorun Giderme:**
- Eğer endpoint'ler 404 dönüyorsa, Ingress yapılandırmasını kontrol edin
- Eğer 502/503 dönüyorsa, pod'ların sağlıklı olduğunu kontrol edin:
  ```bash
  kubectl get pods -n dese-ea-plan-v5
  kubectl logs -n dese-ea-plan-v5 -l app=dese-api --tail=100
  ```

---

## 📋 Adım 5: İsteğe Bağlı E2E Test

**Durum:** ⏭️ **İsteğe bağlı - Production deploy sonrası yapılabilir**

**Komut:**
```bash
pnpm test:auto --project=chromium
```

**Süre:** ~30-60 saniye (sadece Chromium)

**Tüm Browser'larla:**
```bash
pnpm test:auto  # Chromium, Firefox, WebKit
```

**UI Modu:**
```bash
pnpm test:auto:ui  # Interaktif Playwright UI
```

**Not:** E2E testler production deploy öncesi opsiyoneldir. Production deploy sonrası smoke test olarak çalıştırılabilir.

---

## 📊 Özet Durum

| Adım | Durum | Not |
|------|-------|-----|
| 1. Secrets Kontrolü | ⚠️ Eksik | 11 secret GitHub'a eklenmeli |
| 2. Backend Prod Mod Test | ⚠️ Bekliyor | Backend production modda başlatılmalı |
| 3. Workflow Çalıştırma | ⚠️ Bekliyor | Secrets eklendikten sonra |
| 4. Deploy Sonrası Health Check | ⏳ Bekliyor | Deploy tamamlanana kadar |
| 5. E2E Test | ⏭️ İsteğe Bağlı | Production deploy sonrası |

---

## 🎯 Sonraki Adımlar

1. ✅ **Secrets'ları GitHub'a ekleyin** (Adım 1)
2. ✅ **Backend'i production modda test edin** (Adım 2)
3. ✅ **Workflow'u çalıştırın** (Adım 3 - secrets sonrası)
4. ✅ **Deploy sonrası health check yapın** (Adım 4)
5. ⏭️ **E2E test çalıştırın** (Adım 5 - isteğe bağlı)

---

## 📚 İlgili Dokümanlar

- `docs/GITHUB_ACTIONS_SECRETS.md` - Secrets yapılandırma rehberi
- `docs/WORKFLOW_EXECUTION_GUIDE.md` - Workflow detayları
- `docs/PRODUCTION_SETUP_SUMMARY.md` - Production setup özeti
- `docs/DEPLOYMENT_CHECKLIST.md` - Hızlı checklist
- `docs/DEPLOYMENT_EXECUTION_REPORT.md` - Önceki execution raporu

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0

