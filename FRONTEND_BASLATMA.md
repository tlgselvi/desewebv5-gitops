# 🚀 Frontend Başlatma Rehberi

**Tarih:** 2025-11-05  
**Durum:** Frontend'ler başlatılıyor

---

## 📱 Frontend Projeleri

Projede **2 adet Next.js frontend** bulunmaktadır:

### 1. Frontend (Ana Dashboard)
- **Klasör:** `frontend/`
- **Port:** 3000 (default)
- **URL:** http://localhost:3000
- **Teknoloji:** Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Özellikler:**
  - SEO Dashboard
  - FinBot Dashboard (Accounts, Transactions, Budgets, Scenario, AI Personas)
  - AIOps Dashboard
  - Admin Paneli (Audit, Permissions, Realtime)
  - Projects Management
  - Tools

### 2. DESE Web (AIOps Platform)
- **Klasör:** `dese-web/`
- **Port:** 3001
- **URL:** http://localhost:3001
- **Teknoloji:** Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Özellikler:**
  - AIOps Dashboard
  - Anomalies Detection
  - Metrics & Alerts
  - Feedback System
  - NextAuth Authentication

---

## 🚀 Başlatma Komutları

### Frontend (Port 3000)
```bash
cd C:\desesonpro\desewebv5\frontend
npm run dev
# veya
$env:PORT=3000; npm run dev
```

**URL:** http://localhost:3000

### DESE Web (Port 3001)
```bash
cd C:\desesonpro\desewebv5\dese-web
$env:PORT=3001; npm run dev
# veya
npm run dev -- -p 3001
```

**URL:** http://localhost:3001

---

## 📊 Frontend Özellikleri

### Frontend (Ana Dashboard)

#### Sayfalar:
- `/` - Ana Dashboard (Projects listesi)
- `/projects` - Proje yönetimi
- `/aiops` - AIOps dashboard
- `/finbot` - FinBot ana sayfa
  - `/finbot/accounts` - Hesap yönetimi
  - `/finbot/transactions` - İşlemler
  - `/finbot/budgets` - Bütçe yönetimi
  - `/finbot/scenario` - Senaryo analizi
  - `/finbot/ai-personas` - AI Personas
- `/admin/audit` - Audit logları
- `/admin/permissions` - Yetki yönetimi
- `/admin/realtime` - Gerçek zamanlı metrikler
- `/tools` - Araçlar
- `/login` - Giriş sayfası

#### Teknolojiler:
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- @tanstack/react-query (data fetching)
- Zustand (state management)
- Framer Motion (animations)
- Recharts (charts)
- Lucide React (icons)

---

### DESE Web (AIOps Platform)

#### Sayfalar:
- `/` - Ana sayfa (AIOps platform overview)
- `/aiops` - AIOps dashboard
- `/anomalies` - Anomali tespiti
- `/feedback` - Feedback sistemi
- `/login` - Giriş sayfası (NextAuth)

#### API Routes:
- `/api/aiops/metrics` - AIOps metrikleri
- `/api/aiops/health` - Health check
- `/api/metrics/alerts` - Alert metrikleri
- `/api/metrics/vitals` - Web Vitals
- `/api/auth/[...nextauth]` - NextAuth

#### Teknolojiler:
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- NextAuth (authentication)
- SWR (data fetching)
- Recharts (charts)
- Framer Motion (animations)
- Lucide React (icons)

---

## 🔧 Başlatma Durumu

### Frontend (Port 3000)
- **Durum:** 🟢 Başlatılıyor...
- **URL:** http://localhost:3000
- **Komut:** `npm run dev` (frontend/ klasöründe)

### DESE Web (Port 3001)
- **Durum:** 🟢 Başlatılıyor...
- **URL:** http://localhost:3001
- **Komut:** `npm run dev -- -p 3001` (dese-web/ klasöründe)

---

## 🌐 Erişim

Her iki frontend de başlatıldıktan sonra:

1. **Ana Dashboard:** http://localhost:3000
2. **DESE AIOps Platform:** http://localhost:3001

---

## 📝 Notlar

- Her iki frontend de aynı anda çalışabilir (farklı portlar)
- Backend API (port 3000/3001) çalışıyor olmalı
- PostgreSQL ve Redis servisleri çalışıyor olmalı

---

**Başlatma Tarihi:** 2025-11-05  
**Durum:** Frontend'ler başlatılıyor...

