# Sprint Plan · v6.9.0 (Taslak)

**Durum:** Taslak – Onay Bekleniyor  
**Hedef Sürüm:** v6.9.0  
**Planlanan Başlangıç:** 2025-11-18  
**Odak Alanı:** MCP Alerting & Telemetry İyileştirmeleri, GitOps Dokümantasyonu, WebSocket Observability

---

## 1. Sprint Hedefi (Draft)

> MCP katmanında alerting, telemetry ve web-socket tabanlı gözlemlenebilirliği güçlendirerek operasyon ekibinin erken müdahale kapasitesini artırmak; GitOps dokümantasyonunu güncellemek.

---

## 2. Planlanan Temalar & Hikâyeler

### 2.1. Alerting & Monitoring İyileştirmeleri _(Tamamlandı)_
- **Story:** Prometheus Alertmanager kurallarının gözden geçirilmesi  
  - Kyverno, ArgoCD ve Redis cache için kritik eşiklerin tanımlanması  
  - Alert payload’larının `OPERATIONS_GUIDE` ile hizalanması  
- **Story:** Grafana Dashboard güncellemeleri  
  - MCP panel metriklerini “Drill-down” panolarına bağlama  
  - Playwright E2E sonuçlarının Prometheus metriklerine eklenmesi

### 2.2. WebSocket Observability _(Tamamlandı)_
- **Story:** MCP WebSocket yayınları için telemetry  
  - Health check & metrics data push event’lerinin izlenmesi _(Tamamlandı)_
  - Tempo traces ile WebSocket latency ölçümü _(Tamamlandı)_
  - Grafana `websocket-observability` dashboard’u ile aktif bağlantı ve event akışının görselleştirilmesi _(Tamamlandı)_
- **Story:** Real-time UI feedback  
  - MCP panellerinde WebSocket fallback görselleştirmesi _(Tamamlandı)_
  - Redis TTL değişikliklerinde notification _(Tamamlandı)_

### 2.3. GitOps & Dokümantasyon
- **Story:** `docs/OPERATIONS_GUIDE.md` güncellemesi → Alerting & WebSocket bölümleri  
- **Story:** `gitops/` repo README & runbook  
  - `argocd app sync` senaryoları, drift çözüm adımları, policy kontrol listesi

### 2.4. Test & Dayanıklılık
- **Story:** Playwright testi genişletme  
  - WebSocket event akışı doğrulama
  - Alert tetikleme senaryolarında UI feedback testi  
  - WebSocket metriklerinin (`mcp_websocket_active_connections`, `mcp_websocket_events_published_total`) Grafana API üzerinden doğrulandığı E2E testi ekleme _(Tamamlandı)_
  - Geliştirici deneyimini iyileştir: WebSocket E2E testi için mock server ekle _(Tamamlandı)_
- **Story:** Load / soak testleri  
  - Redis TTL ayar değişikliklerinin performansa etkisi  
  - Prometheus sorgu süresi (timeout) regresyon testi

### 2.5. Teknik Hazırlık (Yeni)
- **Bağımlılık Güncellemeleri:** `cheerio@^1.1.2`, `http-proxy-middleware@^3.0.5`, `puppeteer@^24.30.0`, `stripe@^19.3.1`, `testcontainers@^11.8.1`, `@types/node@^24.10.1`, `@typescript-eslint/*@^8.46.4`, `typescript-eslint@^8.46.4`. `pnpm@10.x` major sürümü güvenlik ve monorepo davranışı açısından ayrıca doğrulanacak.
- **Geliştirici Scripti:** Güvenli güncellemeler için `scripts/prep-deps-patch.ps1` altında `pnpm update <paket>` çağrılarını zincirleyen otomasyon taslağı çıkarılacak; değişiklikler `pnpm install` ile doğrulanacak.
- **Refactoring Odakları:** MCP sunucularında (FinBot, MuBot, Observability) tekrar eden rate limit, cache (Redis) ve WebSocket bildirim akışları ortak yardımcı fonksiyonlara taşınacak; `asyncHandler` + `logger` kullanımındaki yinelenen bloklar sadeleştirilecek.
- **Gözden Geçirme:** Refactoring sonrası riskli alanlar (JWT/RBAC guard’ları, Redis TTL, Prometheus entegrasyonu) için hedeflenen smoke test listesi hazırlanacak; değişiklikler `docs/OPERATIONS_GUIDE.md` ile hizalanacak.

---

## 3. Çıktı Tanımı (Definition of Done – Taslak)

- Prometheus Alertmanager kuralları güncellendi ve staging/prod’da test edildi  
- Grafana panoları yeni metriklerle güncellendi; `OPERATIONS_GUIDE` referansı eklendi  
- WebSocket telemetry + UI feedback MVP’si devreye alındı  
- Playwright testleri WebSocket & alert senaryolarını kapsıyor  
- GitOps runbook’u (ArgoCD + Kyverno) Net bir checker listesi sunuyor  
- Tüm değişiklikler için vitest / Playwright / lint pipeline’ları geçmiş durumda

---

> Not: Bu doküman sprint planlama toplantısı için taslaktır. Onaylandıktan sonra `SPRINT_PLAN_v6.9.0.md` güncellenip “Final” duruma çekilecek.