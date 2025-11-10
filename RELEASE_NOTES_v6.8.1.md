# Dese EA Plan v6.8.1 Release Notes

**Yayın Tarihi:** 2025-11-09  
**Sprint:** 2.7 – Teknik Borç Temizleme

## 🎯 Öne Çıkanlar

- Tüm servisler Google Cloud GKE üzerinde `poolfab.com.tr` alan adıyla production’da çalışıyor.
- Node.js bağımlılıkları kritik patch/major sürümlere yükseltildi (axios 1.13.2, mathjs 15.1.0, puppeteer 24.29.1, prom-client 15.1.3, helmet 8.1.0, dotenv 17.2.3, testcontainers 11.8.0 vb.). Kullanılmayan `bcryptjs`, `twilio`, `node-cron`, `nock` ve `@types/cheerio` bağımlılıkları kaldırıldı.
- Express çekirdeği 5.1.0 sürümüne taşındı; MCP katmanı, middleware ve çekirdek router'lar yeni handler imzasıyla güncellendi.
- FinBot/MuBot Python servisleri `pandas 2.2.3`, `prophet 1.2.1`, `prometheus-client 0.23.1` seviyesine çıkarıldı.
- Docker taban imajları `node:20.19-alpine` ve `python:3.11.10-slim` olarak güncellendi.
- Backend (`dese-api`), frontend, FinBot ve MuBot Docker imajları `v6.8.1` ve `latest` etiketleriyle Artifact Registry’ye push edildi; Kubernetes manifestleri yeni tag’lerle güncellendi.
- Kubernetes ingress manifestleri `spec.ingressClassName` kullanacak şekilde refaktör edildi.
- `docs/Sprint_2.7_Tech_Debt_Plan.md` güncellenerek uygulama notları ve öncelik sıraları eklendi; kullanılmayan `bcryptjs` ve `twilio` bağımlılıkları temizlendi.
- Sprint 2.7 Step 8 kapsamında yerel Docker imajı/containers temizliği (`docker image prune -f`, `docker container prune -f`) tamamlandı.
- Kyverno admission controller manifestleri yeniden üretildi; CRD’ler ayrı kustomize kaynağına taşındı, kaynak limitleri düşürüldü ve helm test hook’u devre dışı bırakıldı. ArgoCD `security` uygulaması yeniden senkronize edilerek stabil hâle getirildi.

## 🔄 CI/CD & Deploy

- GitHub Actions → Artifact Registry → ArgoCD pipeline’ı ile `v6.8.1` etiketi production’a alındı.
- Rolling update prosedürü README’de dokümante edildi.
- Jarvis automation chain ile post-deploy sağlık taraması zorunlu hale getirildi.
- ArgoCD `security` uygulamasında yaşanan CRD annotation limit sorunu çözülerek senkronizasyon normalleşti; Kyverno webhooks yeniden kayıt edildi.

## ✅ Test & Doğrulama

- `pnpm test` Vitest suite’i ve Prometheus/Redis sağlık kontrolleri temiz geçti.
- ESLint v9 flat konfigürasyonu (`eslint.config.js`) devrede; `pnpm lint` mevcut uyarılar dışında hatasız çalışıyor.
- Jarvis zinciri raporları (`reports/jarvis_efficiency_summary_*.json`) prod sonrası çalıştırıldı.
- Kyverno admission controller podları için canlı sağlık kontrolleri, TLS secret yenilemesi ve webhook validasyon testleri başarıyla tamamlandı.

## 🛡️ Politika & Governance

- Kyverno CRD’leri ayrı `kyverno-crds.yaml` dosyasında kustomize sync-wave `-1` ile yönetiliyor; `ServerSideApply=true` anotasyonu ile ArgoCD apply başarısı garanti altına alındı.
- `kyverno-helm.yaml` içerisindeki admission controller kaynak istekleri `20m CPU / 96Mi RAM` seviyesine çekildi, gereksiz background/cleanup/reports controller’lar devre dışı bırakıldı.
- Helm’in `kyverno-admission-controller-metrics` test pod’u kapatıldı; release pipeline’ı prod ortamda hatalı hook çalıştırmayacak şekilde düzenlendi.
- `gitops/apps/security/base/kustomization.yaml` yeniden düzenlenerek Kyverno manifestleri ve CRD’leri temiz şekilde ayrıldı.
- Dokümantasyon tarafında `PROJE_DURUM_ANALIZ_RAPORU.md`, `PROJE_DURUM_DETAYLI_RAPOR.md`, `PROJECT_MASTER_DOC.md` ve `DOKUMENTASYON_GUNCELLEME_RAPORU.md` Kyverno/ArgoCD iyileştirmelerini yansıtacak şekilde revize edildi.

## ⚠️ Bilinen Hususlar

- `tensorflow-intel` → `ml-dtypes` sürüm uyumsuzluğu (pip resolver uyarısı). ML bileşenleri yükseltilmeden önce test edilmeli.
- `pnpm lint` için proje kökünde ESLint konfigürasyonu yeniden bağlanacak (Sprint 2.7 devam görevi).

## 📚 Referanslar

- `docs/Sprint_2.7_Tech_Debt_Plan.md`
- `docs/GCP_MIGRATION_DURUM_OZETI.md`
- `reports/jarvis_efficiency_summary_20251107.json`

---

> Bu yayın ile beraber Dese EA Plan v6.8.1, GKE production ortamında teknik borç temizliği adımlarını tamamlamış ve Jarvis otomasyon raporlarıyla doğrulanmıştır.

