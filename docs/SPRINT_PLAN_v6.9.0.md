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

### 2.1. Alerting & Monitoring İyileştirmeleri
- **Story:** Prometheus Alertmanager kurallarının gözden geçirilmesi  
  - Kyverno, ArgoCD ve Redis cache için kritik eşiklerin tanımlanması  
  - Alert payload’larının `OPERATIONS_GUIDE` ile hizalanması  
- **Story:** Grafana Dashboard güncellemeleri  
  - MCP panel metriklerini “Drill-down” panolarına bağlama  
  - Playwright E2E sonuçlarının Prometheus metriklerine eklenmesi

### 2.2. WebSocket Observability
- **Story:** MCP WebSocket yayınları için telemetry  
  - Health check & metrics data push event’lerinin izlenmesi  
  - Tempo traces ile WebSocket latency ölçümü  
- **Story:** Real-time UI feedback  
  - MCP panellerinde WebSocket fallback görselleştirmesi  
  - Redis TTL değişikliklerinde notification

### 2.3. GitOps & Dokümantasyon
- **Story:** `docs/OPERATIONS_GUIDE.md` güncellemesi → Alerting & WebSocket bölümleri  
- **Story:** `gitops/` repo README & runbook  
  - `argocd app sync` senaryoları, drift çözüm adımları, policy kontrol listesi

### 2.4. Test & Dayanıklılık
- **Story:** Playwright testi genişletme  
  - WebSocket event akışı doğrulama  
  - Alert tetikleme senaryolarında UI feedback testi
- **Story:** Load / soak testleri  
  - Redis TTL ayar değişikliklerinin performansa etkisi  
  - Prometheus sorgu süresi (timeout) regresyon testi

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