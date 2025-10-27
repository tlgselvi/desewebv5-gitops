# Dese Web v5.6 - Sprint 1: Core + Security + Validation

**Status:** 🚀 ACTIVE  
**Start Date:** 2024-12-19  
**Sprint Duration:** Week 1 (5 days)  
**Current Progress:** Day 1 Complete (20%)  

---

## Executive Summary

Sprint 1 focuses on establishing core infrastructure: React RSC setup, security (JWT + RBAC), data validation (Zod), and initial testing framework.

---

## Day 1 Status ✅ COMPLETE

### Completed Tasks
- ✅ Next 14 app router + RSC initialized
- ✅ TanStack Query configured (staleTime: 30s, retry: 3)
- ✅ Zustand store created (user, metrics, aiops slices)
- ✅ Axios API client setup
- 🟡 Base Layout (Sidebar + Header) → 70% complete

### Metrics
- Build latency: **52s** (target: <60s) ✅
- API ping (`/health`): **200 OK** ✅
- Frontend bundle: **472 KB** (gzip)

---

## Day 2 Plan (Current) 📋

### Tasks
- [ ] Layout completion (Theme Toggle + Navigation)
- [ ] Zod Schemas → `MetricsResponseSchema`, `AIOpsResponseSchema`
- [ ] Vitest setup + first test (MetricCard component)
- [ ] GitHub Actions CI pipeline (lint + build only)

### Deliverables
- Complete Layout component
- Type-safe API schemas
- Test infrastructure
- CI/CD foundation

---

## Day 3-4 Plan: Security Phase 🔒

### Tasks
- [ ] JWT rotation logic (<5 min threshold)
- [ ] RBAC middleware (FastAPI dependencies)
- [ ] ProtectedRoute HOC (UI guard)
- [ ] Audit log → Prometheus exporter
- [ ] OpenTelemetry trace (%25 sampling)

### Prometheus Metrics
```yaml
cpt_user_action_total{action="metrics.view"} 1
cpt_token_rotation_total 2
cpt_rbac_denied_total{role="user"} 0
```

---

## Day 5 Plan: Validation + Test ✅

### Tasks
- [ ] Zod integration tests
- [ ] Vitest coverage >95%
- [ ] Docker build
- [ ] K8s preprod deployment (namespace: ea-web)
- [ ] Smoke test → `/api/v1/health`

---

## Progress Metrics Tracker

| Metric | Status | Target | Status |
|--------|--------|--------|--------|
| Build latency | 52s | <60s | ✅ |
| Validation errors | 0 | 0 | ✅ |
| JWT rotation | Planned | <5min | ⏳ |
| RBAC accuracy | N/A | 100% | ⏳ |
| Test coverage | N/A | ≥95% | ⏳ |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| JWT rotation + RBAC sync issues | High | Coordinate testing on Day 3 |
| Zod schema mismatch | Medium | API contract review |
| Test coverage <95% | Low | Additional unit tests |

---

**Next Action:** Start Day 2 tasks (Layout + Zod + Vitest)
