# 🎯 DESE JARVIS - Persistent Project Context

**Project:** EA Plan Master Control v6.7.0  
**Version:** 6.7.0  
**Last Updated:** 2025-11-03  
**Core Rules:** `.cursor/rules.yaml`

---

## 📦 Project Overview

Enterprise-level modular system including:
- **FinBot** (Finance Engine) - FastAPI, Python 3.11
- **MuBot** (Accounting Engine) - Express.js, TypeScript
- **DESE** (Analytics Layer) - Next.js 16 + React 19 + Express.js

Hybrid sync architecture: REST + Prometheus. Backend: Express.js + FastAPI. Frontend: Next.js 16 + React 19.

---

## 🧠 Core Architecture

### Backend Structure

**FinBot:**
- Framework: FastAPI
- Prefix: `/api/v1/finbot`
- Language: Python 3.11
- Exposes: `metrics`, `health`, `accounts`, `transactions`, `budgets`
- Prometheus Metrics: `finbot_api_request_total`, `finbot_api_request_duration_seconds`

**MuBot:**
- Framework: Express.js
- Prefix: `/api/v1/mubot`
- Language: TypeScript
- Exposes: `metrics`, `health`

**DESE:**
- Framework: Express.js
- Prefix: `/api/v1`
- Language: TypeScript
- Exposes: `auth`, `projects`, `seo`, `content`, `analytics`, `aiops`, `feedback`

### Communication
- Protocol: REST
- Metrics: Prometheus
- Cache: Redis
- Mode: hybrid (real-time API + 5m metrics batch)

---

## 🔐 Security & Access

### Authentication
- Method: JWT (Bearer Token)
- Expiry: 24h
- Refresh Token: true
- Bypass Header: `X-Master-Control-CLI` (development only)

### Authorization (RBAC)
- Roles: `admin`, `user`, `finance_analyst`, `accountant`, `viewer`, `seo_analyst`
- Permission System: Planned
- FinBot Endpoints: Require `finance_analyst`, `accountant`, or `admin`

---

## 📁 Code Conventions

### Path Aliases
- **ALWAYS** use `@/` prefix for imports
- ✅ `import { config } from '@/config/index.js'`
- ❌ `import { config } from '../../config/index.js'`

### Type Safety
- **NEVER** use `any` type
- Always explicit types
- Null safety with null checks

### Logging
- **NEVER** use `console.log`
- **ALWAYS** use `logger` utility
- Structured JSON logging format

### Error Handling
- **ALWAYS** wrap async operations in try-catch
- Use `asyncHandler` middleware for route handlers
- Errors forwarded to error handling middleware via `next()`

### Database Queries
- **NEVER** raw SQL
- **ALWAYS** use Drizzle ORM
- ✅ `db.query.users.findFirst({ where: eq(users.id, id) })`

---

## 🧪 Testing Standards

### Framework
- Unit/Integration: Vitest + Supertest
- E2E: Playwright
- Coverage Target: 80%+

### Test Patterns
- AAA Pattern (Arrange, Act, Assert)
- Mock external dependencies (Redis, fetch, database)
- Test naming: `should [expected behavior] when [condition]`

### Recent Test Additions
- FinBot routes: 11 tests (all passing ✓)
- Test scenarios: 401, 403, 200 (cache hit/miss), 502 upstream errors
- Authorization tests for all roles

---

## 📊 Observability

### Prometheus Metrics
- **FinBot Metrics:**
  - `finbot_api_request_total` (Counter)
  - `finbot_api_request_duration_seconds` (Histogram)
- **Labels:** `method`, `path`, `status_code`
- **Endpoint:** `/metrics`

### Structured Logging
Every FinBot request logs:
- `method`: HTTP method
- `path`: Endpoint path
- `status`: HTTP status code
- `duration_ms`: Request duration in milliseconds
- `userId`: User ID (if authenticated)

### Monitoring Stack
- Metrics: Prometheus
- Dashboards: Grafana
- Traces: Tempo
- Logs: Loki
- Telemetry: OpenTelemetry

---

## 🚀 CI/CD & Deployment

### CI
- Provider: GitHub Actions
- Stages: `lint`, `build`, `test`, `security_scan`
- Scanners: Trivy, Syft, Snyk

### CD
- Provider: ArgoCD
- Method: GitOps
- Registry: GHCR

### Environments
- `dev`, `staging`, `prod`

---

## 📋 Current State

### ✅ Completed
- FinBot REST API integration
- Prometheus metrics for FinBot
- Comprehensive test suite (11 tests)
- RBAC middleware implementation
- Redis caching with stale fallback
- Structured logging
- Path aliases throughout codebase
- Predictive Correlation AI v1
- JARVIS Diagnostic Chain (Phase 1-3)
- JARVIS Efficiency Chain
- Hydration mismatch fixes
- Backend port configuration (3001)
- Audit schema refactoring
- Docker services setup

### 🔄 In Progress / Planned
- Real-time module sync (FinBot ↔ MuBot)
- Full RBAC completion (permission matrix)
- GDPR/KVKK compliance
- AES-256 encryption at rest
- HashiCorp Vault secret management

---

## 🗂️ File Structure

```
src/
├── config/
│   ├── index.ts           # Main config
│   └── prometheus.ts      # Prometheus metrics config
├── middleware/
│   ├── auth.ts            # JWT authentication + RBAC
│   ├── errorHandler.ts   # Error handling middleware
│   ├── finbotMetrics.ts   # FinBot Prometheus metrics
│   └── prometheus.ts      # General Prometheus middleware
├── routes/
│   ├── finbot.ts          # FinBot API routes
│   ├── finbot.test.ts     # FinBot test suite
│   └── index.ts           # Route setup
├── services/
│   └── storage/
│       └── redisClient.ts # Redis client & caching
└── utils/
    └── logger.ts          # Winston logger
```

---

## 💡 Quick Commands

### Load Context
When starting a new chat, simply type:
> **"Load DESE JARVIS context"**

### Common Tasks
- Add new route: Follow `.cursor/rules.yaml` + use path aliases
- Add metrics: Update `src/config/prometheus.ts` + create middleware
- Add tests: Use Vitest + Supertest pattern from `src/routes/finbot.test.ts`
- Add RBAC: Use `authorize(['role1', 'role2'])` middleware

---

## 📚 Key References

- **Core Rules:** `.cursor/rules/` (modüler yapı)
- **Code Standards:** `CODING_STANDARDS.md`
- **Contributing:** `CONTRIBUTING.md`
- **Project Analysis:** `PROJE_DURUM_ANALIZI.json`
- **System Health:** `SYSTEM_HEALTH_REPORT.json`
- **Plan Status:** `PLAN_DURUM_RAPORU.json`

---

## ⚠️ Important Notes

- Codebase is actually at **v5.8.0 STABLE RELEASE** level
- v6.0–v6.1 versions ("quantum-secure communication", "multi-cloud federation") are **plan-only**, not implemented
- All modules communicate via REST API; Prometheus data is for monitoring only
- KVKK/GDPR requirements target completion by 2025-Q4

---

## 🔄 Session Continuity

This context file (`/.cursor/context.md`) is loaded automatically when you say:
> **"Load DESE JARVIS context"**

It provides:
- Current project state
- Architecture patterns
- Code conventions
- Test patterns
- Security requirements
- Roadmap focus areas

All context is preserved across sessions, allowing seamless continuation of work.

---

**Last State:** FinBot REST API integration with Prometheus metrics and comprehensive test suite (11 tests, all passing).

