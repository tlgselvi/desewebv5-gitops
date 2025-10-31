---
alwaysApply: true
priority: high
version: 5.0.0
lastUpdated: 2025-01-27
---

# Genel Kurallar ve Proje Özeti

## 🎯 Proje Özeti

Dese EA Plan v5.0 - CPT Optimization Domain için Kubernetes + GitOps + AIOps uyumlu kurumsal planlama sistemi.

**Tech Stack:**
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + PostgreSQL (Drizzle ORM)
- **Testing**: Vitest + Supertest + Playwright
- **Package Manager**: pnpm 8.15.0
- **Infrastructure**: Docker + Kubernetes + Helm
- **Monitoring**: Prometheus + Grafana + Loki + Tempo

## 📋 Temel Prensipler

### Kod Yazım Standartları

- **TypeScript**: Her zaman explicit types kullanın, `any` kullanmaktan kaçının
- **Path Aliases**: Her zaman `@/` prefix'ini kullanın (`@/config`, `@/db`, vb.)
- **Naming**: 
  - camelCase: functions, variables
  - PascalCase: classes, interfaces, types
  - UPPER_SNAKE_CASE: constants
  - kebab-case: file names
- **File Structure**: Modüler yapıya uyun (config, db, middleware, routes, services, utils)
- **Error Handling**: Her zaman try-catch blokları kullanın ve özel error class'ları throw edin
- **Logging**: `console.log` yerine `logger` utility'sini kullanın (structured logging)

## 🗂️ Dosya Organizasyonu

```
src/
├── config/          # Configuration files
│   └── index.ts     # Main config export
├── db/              # Database
│   ├── index.ts     # DB connection
│   └── schema.ts    # Drizzle schema
├── middleware/      # Express middleware
│   ├── errorHandler.ts
│   ├── requestLogger.ts
│   └── prometheus.ts
├── routes/          # API routes
│   ├── index.ts     # Route setup
│   ├── health.ts
│   ├── seo.ts
│   └── content.ts
├── services/        # Business logic
│   ├── seoAnalyzer.ts
│   └── contentGenerator.ts
├── schemas/         # Zod validation
│   └── feedback.ts
└── utils/           # Utilities
    ├── logger.ts
    └── gracefulShutdown.ts
```

**Kurallar:**
- ✅ Her klasörün tek bir sorumluluğu olmalı
- ✅ Services → Business logic
- ✅ Routes → HTTP handlers
- ✅ Middleware → Cross-cutting concerns
- ✅ Utils → Reusable helpers

## ✅ YAPILMASI GEREKENLER

### TypeScript
- ✅ Her zaman explicit types kullanın
- ✅ Null safety için null checks yapın
- ✅ Path aliases (`@/`) kullanın
- ✅ File extensions ekleyin (`.js`)
- ✅ Generic types'ı uygun yerlerde kullanın

### Error Handling
- ✅ Her async fonksiyon için try-catch
- ✅ Özel error class'ları kullanın
- ✅ Error'ları log'layın
- ✅ User-friendly messages, detayları log'da

### Validation
- ✅ Zod schemas kullanın
- ✅ API endpoints'de validation
- ✅ Drizzle ORM kullanın (SQL injection koruması)

### Logging
- ✅ Structured logging (logger utility)
- ✅ Context bilgisi ekleyin
- ✅ Sensitive data log'lamayın

### Testing
- ✅ Her feature için unit test
- ✅ Test coverage %70+ (hedef %80+)
- ✅ Integration testler için testcontainers
- ✅ AAA pattern kullanın

## ❌ YAPILMAMASI GEREKENLER

1. ❌ **`any` type kullanmayın** - Her zaman explicit types
2. ❌ **`console.log` kullanmayın** - Logger utility kullanın
3. ❌ **Raw SQL queries** - Drizzle ORM kullanın
4. ❌ **Hardcoded secrets** - Environment variables
5. ❌ **Main branch'e direkt commit** - PR açın
6. ❌ **Büyük PR'lar** (1000+ satır) - Küçük, odaklanmış PR'lar
7. ❌ **Test yazmadan PR** - Her feature için test
8. ❌ **Relative imports** (`../../`) - Path aliases kullanın
9. ❌ **Synchronous DB operations** - async/await kullanın
10. ❌ **Unhandled promises** - Her zaman handle edin

## 🔍 Kod Review Checklist

PR açmadan önce kontrol edin:

- [ ] TypeScript types tanımlı (no `any`)
- [ ] Linting geçiyor (`pnpm lint`)
- [ ] Tests geçiyor (`pnpm test`)
- [ ] Test coverage %70+ (`pnpm test:coverage`)
- [ ] Error handling var (try-catch)
- [ ] Input validation yapıldı (Zod)
- [ ] Logging eklendi (logger, not console)
- [ ] Dokümantasyon güncellendi (README, JSDoc)
- [ ] Security kontrolü yapıldı
- [ ] No hardcoded secrets
- [ ] Path aliases kullanıldı (`@/`)
- [ ] Drizzle ORM kullanıldı (no raw SQL)

