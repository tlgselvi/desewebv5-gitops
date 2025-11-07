# Sprint 2.7 Teknik Borç Güncelleme Planı

Bu belge, `Dese EA Plan v6.8.1` projesinde Sprint 2.7 kapsamında yapılacak bağımlılık ve altyapı güncellemelerinin güvenli bir şekilde yürütülmesi için hazırlanmıştır. Tüm adımlar Türkçe olarak dökümante edilmiştir.

## 1. Hazırlık ve Branch Stratejisi (Öncelik 1)
- Yeni branch: `git checkout -b feat/sprint-2.7-updates`
- Tüm değişiklikler bu branch üzerinde yapılacak, PR açılmadan önce ana branch’e rebase edilip çatışmalar giderilecek.
- Her adımda notlar `docs/Sprint_2.7_Tech_Debt_Plan.md` üzerinden güncellenecek.

## 2. Node (pnpm) Güncellemeleri (Öncelik 2)
1. Bağımlılık listesi için `pnpm outdated` komutu kullanıldı; major yükseltme gerektiren paketler not edildi.
2. Güncelleme sırası:
   - Önce patch/minor güncellemeler (ör. `axios`, `mathjs`, `sharp`).
   - Ardından major paketler; özellikle `express 5.x`, `redis 5.x`, `openai 6.x`, `stripe 19.x`, `zod 4.x` gibi kırıcı değişikliklere hazırlık yapılacak.
3. Her grup için adımlar:
   - `pnpm up <paket>@latest`
   - `pnpm install`
   - `pnpm lint` ve `pnpm test`
   - Jarvis efficiency chain (`pnpm health:check`) ve raporların yeşil olduğu doğrulanacak.

## 3. Python (FinBot & MuBot) Güncellemeleri (Öncelik 3)
1. Outdated paketler `pip list --outdated` ile belirlendi.
2. Güncelleme planı:
   - `numpy` -> 2.x geçişi: Prophet ve pandas uyumluluğu kontrol edilecek.
   - `pandas` ve `prometheus-client` patch/minor güncellemeleri uygulanacak.
   - `fastapi`, `uvicorn`, `starlette`, `pydantic` gibi çekirdek paketler test edildikten sonra yükseltilecek.
3. Adımlar:
   - `pip install --upgrade -r deploy/finbot-v2/requirements.txt`
   - `pip install --upgrade -r deploy/mubot-v2/requirements.txt`
   - `pytest` veya ilgili test komutları
   - Jarvis raporları ile servis health durumu kontrolü

## 4. Docker Optimizasyonları (Öncelik 4)
1. Backend Dockerfile (Node): `node:20-alpine` için `node:20.19-alpine` veya LTS `node:22-alpine` değerlendirmesi.
2. FinBot/MuBot Dockerfile’ları:
   - Multi-stage build (builder + runtime) ile imaj boyutu düşürülecek.
   - Taban imaj `python:3.11.10-slim` veya yeni 3.12 slim ile güncellenecek.
   - Pip cache temiz tutulacak (`pip install --no-cache-dir`).

## 5. Kubernetes & Ingress Refaktörü (Öncelik 5)
1. Tüm ingress YAML’larında `metadata.annotations["kubernetes.io/ingress.class"]` kaldırılıp `spec.ingressClassName: nginx` eklenecek.
2. Deployment manifestlerinde yeni imaj tag’leri (`v6.8.1` veya `v6.9.0`) kullanılacak.
3. Uygulama sırası:
   - Staging: `kubectl --context gke-staging apply -f k8s/`
   - `kubectl rollout status` ile doğrulama
   - Prod: `kubectl --context gke-prod apply -f k8s/`
   - Prometheus/Grafana ve Cloud Logging üzerinden canlı kontrol

## 6. Artifact Registry ve Rolling Update (Öncelik 6)
1. Her servis için yeni imaj:
   ```bash
   docker build -t REGION-docker.pkg.dev/PROJECT/dese-ea-plan/dese-api:v6.8.1 .
   docker push REGION-docker.pkg.dev/PROJECT/dese-ea-plan/dese-api:v6.8.1
   ```
   FinBot, MuBot, frontend için aynı süreç uygulanacak.
2. GKE rolling update: önce staging, ardından prod; gerekirse `kubectl rollout undo` ile geri dönüş planı hazır tutulacak.

## 7. CI/CD ve Dokümantasyon (Öncelik 7)
- GitHub Actions / CI pipeline dosyalarında yeni tag’lerin kullanıldığını teyit et.
- `EKSIKLER_VE_TAMAMLAMA_DURUMU.md`, `MCP_GERCEK_DURUM.md`, `reports/project_status_XXXX.md` gibi belgeler güncellenecek.
- Jarvis hafıza kayıtları ve raporları (context stats, connectivity, efficiency summary) yeni sürüm sonrası güncellenecek.

## 8. Docker ve Sistem Temizliği (Öncelik 8)
1. Analiz:
   ```bash
   docker images
   docker ps -a
   ```
2. Onaydan sonra temizlik:
   ```bash
   docker image prune -f
   docker container prune -f
   ```

## 9. Son Kontroller (Öncelik 9)
- Jarvis efficiency chain raporu (Prometheus push status: success)
- GKE pod’ları `READY` durumda
- Cloud Logging’de hata yok
- İhtiyaç halinde yatırımcı/donanım raporları güncellenecek

## 10. Kapanış (Öncelik 10)
- Pull request aç; kod review sonrası `main` branch’e merge et.
- `git tag v6.8.1` (veya `v6.9.0`) + `git push origin v6.8.1`
- Operasyon sonrası değerlendirme notlarını bu dosyaya ekle.

---

## Uygulama Notları (Güncel Durum)
- `pnpm` bağımlılıkları: `axios@1.13.2`, `mathjs@15.1.0`, `puppeteer@24.29.1`, `prom-client@15.1.3`, `winston-daily-rotate-file@5.0.0`, `@types/express@5.0.5`, `@types/nodemailer@7.0.3`, `dotenv@17.2.3`, `helmet@8.1.0`, `sharp@0.34.5` güncellendi; `pnpm test` ve `pnpm lint` başarıyla çalışıyor. `eslint` 9.x geçişi tamamlandı; `.eslintrc.cjs` ve `.eslintignore` kaldırılarak `eslint.config.js` (flat config) devreye alındı.
- Kullanılmayan `bcryptjs`, `twilio`, `node-cron` ve `@types/express-rate-limit` bağımlılıkları kaldırıldı; ilgili env tanımları konfigrasyonda tutuluyor fakat runtime’da tüketilmiyor.
- `tests/integration/testcontainers/poc.test.ts` ile testcontainers 11.x geçişi için PoC testi eklendi; varsayılan olarak `RUN_TESTCONTAINERS=true` olmadan bu test atlanıyor.
- testcontainers `11.8.0` sürümüne yükseltildi ve PoC testi Docker ortamında başarıyla çalıştırıldı.
- Kullanılmayan HTTP mock bağımlılığı `nock` projeden kaldırıldı.
- `eslint-config-prettier 10.1.8` sürümüne yükseltilerek flat config uyumluluğu doğrulandı; `pnpm lint` uyarı seviyesinde kalmaya devam ediyor.
- `@types/cheerio` paketi kaldırıldı çünkü Cheerio artık kendi tiplerini sağlıyor.
- Dotenv 17.x ile birlikte CLI/çalışma anında bilgi mesajları geliyor; prod ortamda `DOTENV_CONFIG_SILENT=true` veya custom loader tercih edilebilir.
- FinBot/MuBot `requirements.txt`: `pandas@2.2.3`, `prophet@1.2.1`, `prometheus-client@0.23.1` seviyesine çıkarıldı. Global Python ortamında `tensorflow`/`tensorflow-intel`/`onnx` paketleri `ml-dtypes` ve `protobuf` sürümlerinde çakışıyor; servislerin ayrı virtualenv üzerinde tutulması önerildi.
- Dockerfile taban imajları `node:20.19-alpine`, `python:3.11.10-slim` olarak güncellendi; multi-stage yapı korunuyor.
- Kubernetes ingress manifestleri `spec.ingressClassName` alanına geçirildi; servis bazlı ingress dosyaları oluşturuldu.
- Express 5 geçişi kapsamında MCP sunucuları, çekirdek middleware katmanı (`audit`, `requestLogger`, `prometheus`) ve içerik/analitik/proje/SEO router'ları yeni imzaya uygun hale getirildi; `contentGenerator` ile birlikte `masterControl`, `anomaly` ve `seoAnalyzer` servisleri tip güvenli hale getirildi.
- `pnpm lint` çalıştırıldı; kalan uyarılar (legacy `any` tipi ve kullanılmayan değişkenler) Sprint 2.7 kapanışındaki kalite kontrol aşamasına aktarıldı.
- `scripts/advanced-health-check.ps1` ve destek pod’ları güncellenerek kapsamlı sağlık kontrolü yeniden yeşile çekildi: monitoring stack (Prometheus + Grafana) yeniden kuruldu, uygulama health check’i JSON çıktısını doğrulayacak şekilde sadeleştirildi ve script’in deployment algılama mantığı JSON çıkışına göre revize edildi. Son rapor `Status: HEALTHY`.
- `pnpm outdated` çıktısına göre küçük (patch/minor) yükseltmeler: `vitest` ekosistemi (→4.0.8), `dotenv` (→17.2.3), `helmet` (→8.1.0), `node-cron` (→4.2.1), `prom-client` (→15.1.3).
- Büyük versiyon zıplaması gerektiren paketler kalmadı; kalan güncellemeler minor seviyede izleniyor.
- 2025-11-07 19:50 itibarıyla `docker image prune -f` ve `docker container prune -f` komutları çalıştırıldı; 394MB boş alan geri kazanıldı, Step 8 tamamlandı.
- Bir sonraki adım: major bağımlılık güncellemeleri için kod uyumluluk analizi, yeni Docker imajlarının build/push edilmesi ve GKE rolling update senaryosunun çalıştırılması.

