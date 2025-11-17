# Dese EA Plan v6.8.2

> **Durum:** Sistem üretimde ve bakım modunda. v6.8.2 ile WebSocket gözlemlenebilirliği eklendi. Güncel operasyon süreci için `docs/OPERATIONS_GUIDE.md` dokümanını takip edin.

Dese EA Plan, FinBot (finans), MuBot (muhasebe) ve AIOps/Observability modüllerini bir araya getiren kurumsal planlama platformudur. v6.8.1 sürümüyle tüm MCP katmanı gerçek veri kaynaklarına bağlıdır ve Redis + Prometheus ile izlenmektedir.

---

## 🔧 Teknoloji Yığını

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS  
- **Backend:** Node.js 20, Express 5, PostgreSQL (Drizzle ORM), Redis  
- **Monitoring:** Prometheus, Grafana, Loki, Tempo  
- **Testler:** Vitest, Supertest, Playwright  
- **Paket Yönetimi:** pnpm 8.x  
- **Dağıtım:** Docker, Kubernetes, Helm, ArgoCD

---

## ✅ Ön Gereksinimler

- Node.js 20.19 veya üzeri  
- pnpm 8.x  
- PostgreSQL 15  
- Redis 7  
- Docker (opsiyonel) & Kubernetes araçları (opsiyonel)

---

## 🛠️ Kurulum

```bash
git clone https://github.com/dese-ai/dese-ea-plan-v5.git
cd dese-ea-plan-v5

pnpm install
cp env.example .env   # İçeriği güncel gereksinimlere göre düzenleyin

pnpm db:migrate       # İlk kurulumda veritabanı şemasını hazırlayın
pnpm dev              # Geliştirme sunucusunu başlatın
```

Produksiyon derlemesi için:

```bash
pnpm build
```

Docker tabanlı çalıştırma veya Kubernetes dağıtımı için `docs/OPERATIONS_GUIDE.md` ve `gitops-workflow.md` referans alın.

---

## 🐳 Docker ile Yerel Geliştirme

```bash
cp env.example .env           # Gerekli gizli anahtarları ve şifreleri doldurun
docker compose up --build     # Uygulama + PostgreSQL + Redis servislerini başlatır
```

Servisleri durdurmak ve volume'ları kaldırmak için:

```bash
docker compose down -v
```

> Not: İlk çalıştırmada `postgres_data` ve `redis_data` volume'ları otomatik oluşturulur. Uygulama konteyneri `db` ve `redis` servislerinin sağlıklı olmasını bekleyerek başlar.

---

## 🧪 Test Komutları

```bash
pnpm test           # Vitest birimleri
pnpm test:coverage  # Coverage raporu
pnpm test:auto      # Playwright E2E senaryoları
```

---

## 📚 Ana Dokümanlar

- `PROJECT_MASTER_DOC.md` – Canlı durumun tek kaynağı  
- `docs/OPERATIONS_GUIDE.md` – On-call prosedürleri ve sorun giderme  
- `docs/SPRINT_PLAN_v6.9.0.md` – Bir sonraki sprint için plan taslağı  
- `RELEASE_NOTES_v6.8.1.md` – Son sürümdeki değişiklikler ve öğrenilenler

---

## 📝 Lisans & İletişim

Bu proje MIT lisansı altındadır (bkz. `LICENSE`). Sorular için: dev@dese.ai.
