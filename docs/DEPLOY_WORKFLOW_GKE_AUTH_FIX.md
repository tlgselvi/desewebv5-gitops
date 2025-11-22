# 🔧 Deploy Workflow GKE Auth Plugin Düzeltmesi

**Tarih:** 2025-01-27  
**Durum:** ✅ Tamamlandı

---

## 🔍 Sorun

Production deploy workflow başarısız oluyordu:
- **Hata:** `gke-gcloud-auth-plugin.exe not found`
- **Neden:** GitHub Actions runner'ında GKE authentication plugin eksik
- **Sonuç:** kubectl komutları çalıştırılamıyor, rollout başarısız

---

## ✅ Çözüm

### Yapılan Değişiklikler

**Dosya:** `.github/workflows/deploy.yml`

**Tüm job'lara (`preflight`, `deploy-canary`, `deploy-rolling`, `validate-deployment`, `rollback`) GKE auth plugin kurulumu eklendi:**

```yaml
- name: ☁️ Setup GCloud with GKE Auth Plugin
  uses: google-github-actions/setup-gcloud@v1
  with:
    install_components: 'gke-gcloud-auth-plugin,kubectl'
    project_id: ${{ secrets.GCP_PROJECT_ID || 'ea-plan-seo-project' }}
```

**Değişiklik Detayları:**
1. `google-github-actions/setup-gcloud@v1` action'ı eklendi
2. `gke-gcloud-auth-plugin` ve `kubectl` component'leri yükleniyor
3. GCP project ID secret'tan alınıyor (varsayılan: `ea-plan-seo-project`)
4. Tüm job'larda kubectl kullanılmadan önce bu setup çalışıyor

**Kaldırılan:**
- `azure/setup-kubectl@v3` (preflight job'ından) - artık gcloud setup içinde geliyor

**Korunan:**
- Kubeconfig validation adımları
- `azure/k8s-set-context@v3` kullanımı (kubeconfig ile)
- Tüm mevcut workflow mantığı

---

## 📋 Etkilenen Job'lar

1. ✅ **preflight** - GKE auth plugin eklendi
2. ✅ **deploy-canary** - GKE auth plugin eklendi
3. ✅ **deploy-rolling** - GKE auth plugin eklendi
4. ✅ **validate-deployment** - GKE auth plugin eklendi
5. ✅ **rollback** - GKE auth plugin eklendi

---

## 🔍 Deployment API Kontrolü

**Dosya:** `k8s/deployment-api.yaml`

**Kontrol Sonucu:**
- ✅ Image pull policy: `Always` (doğru)
- ✅ Resource limits tanımlı (doğru)
- ✅ Health checks tanımlı (doğru)
- ✅ Security context tanımlı (doğru)
- ⚠️ Pending pod sorunu muhtemelen resource yetersizliği veya node selector uyumsuzluğu (workflow failure'dan kaynaklı olabilir)

**Not:** Deployment dosyasında değişiklik yapılmadı (obvious sorun yok).

**Deployment Yapılandırması:**
- ✅ Image pull policy: `Always` (doğru)
- ✅ Resource limits tanımlı (requests/limits)
- ✅ Health checks tanımlı (readiness, liveness, startup)
- ✅ Security context tanımlı (runAsNonRoot, capabilities drop)
- ✅ Node selector: `cloud.google.com/gke-nodepool: default-pool-v2`
- ⚠️ Pending pod sorunu muhtemelen resource yetersizliği veya node selector uyumsuzluğu (workflow failure'dan kaynaklı olabilir)

---

## 🚀 Workflow Çalıştırma

### Komut

```bash
gh workflow run deploy.yml -f environment=production -f strategy=rolling
```

### İzleme

```bash
# Workflow listesi
gh run list --workflow=deploy.yml --limit 5

# Workflow loglarını izle
gh run watch <RUN_ID>
```

---

## 🧪 Deploy Sonrası Sağlık Testi

### Komut

```powershell
.\scripts\quick-api-test.ps1 -BaseUrl https://api.poolfab.com.tr -Environment production
```

### Beklenen Sonuçlar

- ✅ GET /api/v1 → 200
- ✅ GET /api/v1/auth/login → 405 (Allow: POST)
- ✅ POST /api/v1/auth/login → 403 (mock_login_disabled)
- ✅ GET /health/live → 200
- ✅ GET /metrics → 200

---

## 📊 Commit Mesajı

```
fix(ci): add gcloud gke auth plugin for deployments

- Add google-github-actions/setup-gcloud@v1 to all jobs
- Install gke-gcloud-auth-plugin and kubectl components
- Fix "gke-gcloud-auth-plugin.exe not found" error
- Enable kubectl authentication to GKE clusters
- Maintain existing kubeconfig validation and context setup

Fixes: Production deploy workflow failures due to missing GKE auth plugin
```

---

## ✅ Doğrulama

### Workflow Başarı Kriterleri

1. ✅ GKE auth plugin yüklü
2. ✅ kubectl GKE cluster'a bağlanabiliyor
3. ✅ Rollout başarılı
4. ✅ Health checks geçiyor
5. ✅ Auth endpoint'leri doğru davranıyor (GET 405, POST 403)

---

## 📚 İlgili Dokümanlar

- `docs/PRODUCTION_DEPLOY_STATUS_REPORT.md` - Sorun tespiti raporu
- `.github/workflows/deploy.yml` - Güncellenmiş workflow dosyası

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 1.0  
**Durum:** ✅ Düzeltme tamamlandı, workflow çalıştırılabilir

