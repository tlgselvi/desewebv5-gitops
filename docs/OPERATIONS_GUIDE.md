# OPERATIONS GUIDE · Dese EA Plan v6.8.1

**Sürüm:** 6.8.1 (Final)  
**Son Güncelleme:** 2025-11-12  
**Amaç:** Production ortamındaki MCP katmanını (FinBot, MuBot, Jarvis AIOps, Observability) sürdürülebilir şekilde işletmek için gerekli standart operasyon prosedürlerini derlemek.

---

## 1. Monitoring (İzleme)

| Dashboard | Konum | Ne İzlenmeli? | Notlar |
|-----------|-------|---------------|--------|
| **MCP Dashboard Health** | Grafana → `MCP/MCP Dashboard Health` | Redis cache hit rate, API latency (p95), `Promise.allSettled` hata yüzdesi | Trafik artışı > %20 ise Redis TTL ayarını gözden geçirin (`MCP_CACHE_TTL_SECONDS`). |
| **System Performance** | Grafana → `Platform/System Performance` | CPU & bellek (FinBot, MuBot, AIOps), PostgreSQL bağlantıları, Redis latency | Kritik eşikler: CPU > %85, bellek > %80, Redis latency > 120 ms. |
| **Jarvis Automation Chain** | Grafana → `Automation/Jarvis Chain` | Kyverno policy onayları, ArgoCD sync durumları, automation success rate | Alarm seviyesi düşerse `scripts/jarvis-efficiency-chain.ps1` çıktısını kontrol edin. |
| **Prometheus Alerts Overview** | Grafana → `Observability/Prometheus Alerts` | Firing alert sayısı, SLA ihlalleri | Alarm sayısı artarsa Alertmanager panosundan alarm detayı alın. |

**Rutin:**  
- Hafta içi her gün mesai başlangıcında `MCP Dashboard Health` ve `System Performance` panoları gözden geçirilmeli.  
- Büyük deploy sonrasında (VEYA MCP TTL ayarı değiştikten sonra) ilk 30 dakika boyunca panolar canlı izlenmeli.  
- Jarvis zinciri raporları `.json` formatında `reports/` dizinine düşer; gerekirse Grafana ile çapraz kontrol edin.

---

## 2. Alerting (Alarm Yönetimi)

1. **Alarm bildirimi alındı (Prometheus Alertmanager, e-posta, Slack):**
   - Alarm adını, etkilediği servisi ve tetiklenme süresini kaydedin.
2. **İlk inceleme:**
   - Grafana `Prometheus Alerts Overview` panelinde detayı açın.
   - Alarm ilgili servisin panelinde (örn. FinBot, MuBot) metrik trendlerini kontrol edin.
3. **Log ve Trace analizi:**
   - Loki: `loki` log pipeline’ında `severity=error AND service="<servis-adı>"` ile filtreleyin.
   - Tempo: ilgili trace ID varsa `Tempo Traces` panelinden root cause incelemesi yapın.
4. **Hızlı müdahale:**
   - MCP sorgularında hata varsa Redis cache’i temizleyip tekrar deneyin (bkz. Troubleshooting).
   - Kyverno/ArgoCD kaynaklı ise `argocd app sync <app>` ve Kyverno policy durumlarını doğrulayın.
5. **Kayıt & iletişim:**
   - Incident yönetim aracına (OBS-xxx) not düşülmeli.
   - Alarm kapandıktan sonra `OPERATIONS_GUIDE.md` referanslı follow-up notu/PR eklentisi oluşturun.

---

## 3. Testing (Doğrulama)

### 3.1. Uçtan Uca (E2E) Testler

```bash
# Tüm Playwright projeleri (chromium, firefox, webkit) ile çalıştır
pnpm test:auto

# Sadece Chromium ve MCP panelleri (CI smoke)
pnpm test:auto -- --project=chromium tests/e2e/mcp-*.spec.ts

# Playwright UI modu (lokal debugging)
pnpm test:auto:ui
```

**Ne zaman çalıştırılır?**
- Production deploy öncesi smoke testi (minimum Chromium koşusu)
- MCP konfigürasyon değişiklikleri (Prometheus sorguları, Redis TTL vb.)
- Redis veya backend health endpoint’lerinde manuel bakım sonrası

### 3.2. Unit / Integration Testleri

```bash
pnpm test           # Vitest suite
pnpm test:coverage  # Coverage raporu
pnpm lint           # ESLint kontrolü
```

---

## 4. Deployment (Dağıtım)

### 4.1. Ön Hazırlık

- `.env` veya ortam gizli değişkenlerini aşağıdaki başlıklara göre güncelleyin:
  - `MCP_CACHE_TTL_SECONDS`
  - `MCP_PROMETHEUS_BASE_URL`, `MCP_PROMETHEUS_AUTH_TOKEN`, `MCP_PROMETHEUS_TIMEOUT_MS`
  - Modül bazlı health ve Prometheus sorgu URL’leri (`MCP_FINBOT_*`, `MCP_MUBOT_*`, `MCP_AIOPS_*`, `MCP_OBSERVABILITY_*`)
  - Backend API ve Redis bağlantı bilgileri (`DATABASE_URL`, `REDIS_URL`, `PORT`)
- Değişiklikler git ile commitlenmeli; `.env` içerikleri yalnızca Secret Manager/Kubernetes secret’larına uygulanmalı.

### 4.2. GitOps / ArgoCD Akışı

```bash
# GitOps repo güncellemesi
git add .
git commit -m "chore: release v6.8.1"
git push origin main

# ArgoCD senkronizasyonu
argocd app sync dese-api
argocd app sync dese-frontend
argocd app sync dese-finbot
argocd app sync dese-mubot
argocd app sync observability

# Senkron durumunu doğrula
argocd app get dese-api
```

**Kontrol Listesi:**
1. `pnpm lint`, `pnpm test`, `pnpm test:auto -- --project=chromium` ✅
2. `docker-compose` yada Kubernetes staging ortamında smoke test ✅
3. ArgoCD `SYNCED` ve `HEALTHY` uyarısı yok ✅

---

## 5. Troubleshooting (Sorun Giderme)

| Sorun | Belirti | Çözüm Adımları |
|-------|---------|----------------|
| **Redis Cache Stale / Yanlış Veri** | MCP panelleri eski veri gösteriyor veya `Promise.allSettled` fallback’e düşüyor. İlgili alarmlar: **RedisDown**, **RedisHighMemoryUsage**, **RedisLowCacheHitRatio** | 1. Alarmı Alertmanager’dan inceleyin. 2. Redis’e bağlanın: `redis-cli -h <host> -p <port>`  3. Aşağıdaki “Redis Alarm Yönetimi” adımlarını uygulayın. |
| **Prometheus Timeout** | E2E testi veya API `Failed to fetch MCP dashboard data` döndürüyor | 1. `MCP_PROMETHEUS_TIMEOUT_MS` değerini 8000+ yapmayı düşünün. 2. Prometheus `targets` panelini kontrol edin. 3. Tempo/Grafana panolarını inceleyin. |
| **ArgoCD Sync Drift** | `argocd app diff` drift gösteriyor, MCP UI güncellenmiyor | 1. `argocd app sync <app>`  2. Kyverno policy loglarını Loki’de inceleyin. 3. Gerekirse `kubectl rollout restart deployment/<deployment>` |
| **Kyverno Policy Block** | Deploy sırasında Kyverno policy hatası | 1. `kubectl logs -n kyverno deployment/kyverno`  2. İlgili policy’yi `kubectl get cpol` ile kontrol edin. 3. Policy güncellemesini GitOps repo üzerinden yapın; manuel override etmeyin. |
| **API Bağlantı Hatası (401/403)** | MCP API ları auth hatası dönüyor | 1. JWT secret ve RBAC izinlerini kontrol edin (`src/middleware/auth.ts`, `src/rbac/`). 2. Redis cache temizliği sonrası tekrar deneyin. 3. Gerekirse `rbac:seed` komutunu çalıştırın. |
| **Promise Rejection Analysis** | Prometheus alarmı MCP dashboard servisinde yüksek `Promise.allSettled` hata oranı bildiriyor | 1. Redis cache hit oranını kontrol edin (`RedisCacheHitRateLow` alarmı var mı?). 2. `src/services/mcp/` altındaki veri kaynaklarının health endpoint’lerini test edin. 3. Hata veren kaynağı izole edip yeniden başlatın veya fallback veri kaynağına yönlendirin. |
| **WebSocket Connection Issues** | Aktif WebSocket bağlantısı yok; alarm 15 dakikadır sıfır bağlantı bildiriyor | 1. `docker compose logs app` ile WebSocket bağlantı loglarını inceleyin. 2. Reverse proxy (NGINX/Load balancer) health check’lerini kontrol edin. 3. Gerekirse WebSocket sunucusunu yeniden başlatın (`pnpm dev:all` veya ilgili service restart). |
| **WebSocket Event Publishing Failure** | Belirli bir modül (örn. finbot) WebSocket event yayınlamıyor | 1. `pushContextUpdate` kaynaklarını kontrol edin (FinBot servis logları). 2. Prometheus’ta `mcp_websocket_events_published_total` metriğini modül bazında inceleyin. 3. Veri kaynağını yeniden tetikleyin veya manuel context push deneyin. |

### Redis Alarm Yönetimi

**RedisDown (redis_up == 0)**  
Olası nedenler: konteyner/pod çökmesi, ağ kesintisi, yanlış kimlik bilgisi.  
Adımlar:
1. `docker compose ps redis` veya `kubectl get pods -l app=redis` ile Redis durumunu doğrulayın.  
2. Gerekirse `docker compose restart redis` ya da ilgili pod/deployment’ı yeniden başlatın.  
3. Ağ erişimi ve firewall kurallarını kontrol edin; port yönlendirmelerini doğrulayın.  
4. Yeniden ayağa kalktığında `redis-cli PING` ile yanıt alın.

**RedisHighMemoryUsage (> %90)**  
Olası nedenler: TTL’siz genişleyen anahtarlar, büyük payload’lar, eksik `maxmemory-policy`.  
Adımlar:
1. `redis-cli INFO memory` ile hangi keyspace’in büyüdüğünü tespit edin.  
2. Gereksiz anahtarları silin veya TTL ekleyin (`redis-cli EXPIRE`).  
3. `maxmemory` ve `maxmemory-policy` ayarlarını gözden geçirip gerektiğinde güncelleyin.  
4. Uygulama servislerinin cache kullanımını analiz edin; batched işlemleri optimize edin.

**RedisLowCacheHitRatio (< %80)**  
Olası nedenler: uygunsuz cache stratejisi, TTL’lerin çok kısa olması, yeni veri pattern’i.  
Adımlar:
1. `redis-cli INFO stats` ile hit/miss oranlarını doğrulayın.  
2. MCP servislerindeki TTL değerlerini (`MCP_CACHE_TTL_SECONDS`) gerektiğinde artırın.  
3. Cache’lenmemesi gereken dinamik verileri hariç tutun; data modelini gözden geçirin.  
4. Değişikliklerden sonra Redis’i veya ilgili servisleri yeniden başlatın; Grafana `Redis Overview` paneli üzerinden trendleri izleyin.

### Promise Rejection Analysis

1. `promtool` veya Grafana üzerinden `mcp_dashboard_promises_settled_total` metriklerini inceleyin; hangi kaynak (module/eventType) hata üretiyor belirleyin.  
2. İlgili MCP modülünün health endpoint’lerini kontrol edin (`/mcp/<module>/health`).  
3. Redis/cache TTL ayarlarını gözden geçirin; stale veri varsa `redis-cli` ile `mcp:dashboard:*` anahtarlarını temizleyin.  
4. Sorunlu downstream servisi yeniden başlatın veya fallback moduna alın; alarm kapandığında post-mortem kaydı oluşturun.

### WebSocket Connection Issues

1. `docker compose logs app` veya `kubectl logs` ile WebSocket başlangıç loglarında hata var mı kontrol edin.  
2. Trafik yönlendiricinin (NGINX, API Gateway) WebSocket upgrade başlıklarını doğru ilettiğinden emin olun.  
3. Eğer tüm müşteriler bağlantı kurmuyorsa, client tarafı endpoint’lerini ve ağ firewall kurallarını doğrulayın.  
4. WebSocket sunucusunu yeniden başlatıp (`pnpm dev:all` ya da ilgili deployment restart) tekrar bağlantı açılmasını izleyin.

### WebSocket Event Publishing Failure

1. Alarmın işaret ettiği modül için `mcp_websocket_events_published_total` metriğinde artış var mı takip edin.  
2. `pushContextUpdate` veya `pushEvent` çağrılarını yapan servislerin loglarında hata (timeout, invalid payload) olup olmadığını kontrol edin.  
3. Veri pipeline’ı durmuşsa, ilgili cron/job veya ingestion servislerini yeniden başlatın.  
4. Manuel olarak test event’i yayınlayarak metrik artışını doğrulayın; alarm çözüldüğünde kalıcı kök neden analizi yapın.

**Ek Komutlar:**
- `pnpm metrics:validate` – Prometheus/grafana metrik doğrulaması
- `pwsh scripts/advanced-health-check.ps1` – tam sağlık raporu
- `kubectl logs deployment/<svc> -n <namespace>` – servis logları
- `npx playwright show-trace trace.zip` – başarısız E2E trace inceleme

---

## 6. İletişim & Devir Teslim

- **On-call / DevOps Kanalı:** `#ops-mcp` (Slack)  
- **E-posta:** dev@dese.ai  
- **Dokümantasyon:** `docs/` dizini, Notion → *Dese EA Plan / Operations*  
- **Versiyon Takibi:** `RELEASE_NOTES_v6.8.1.md`, `GUNCELLEME_OZETI_v6.8.1.md`  
- **Otomasyon Scriptleri:** `scripts/` dizini (Jarvis, health check, Prometheus doğrulama)

---

> Bu rehber, v6.8.1 sürümü ile MCP katmanının tam entegrasyon ve otomasyon sonrasında geçerli operasyonel prosedürleri içerir. Yeni sürümlerde güncellendiğinden emin olun.

