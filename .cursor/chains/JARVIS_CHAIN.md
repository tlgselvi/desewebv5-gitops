# 🔗 JARVIS Chain - Cursor AI Efficiency Chain

**Versiyon:** 6.8.0  
**Durum:** ⚠️ Bazı Scriptler Eksik

---

## 🎯 JARVIS Chain Nedir?

JARVIS (Just A Rather Very Intelligent System) - Automated system health checks and efficiency optimization for Cursor AI development environment.

---

## 📋 Chain Adımları

### 1. Context Cleanup
- Eski `.cursor/memory/` dosyalarını temizle
- Geçersiz context dosyalarını sil
- Archive klasörüne taşı

### 2. Log Archive
- Eski log dosyalarını arşivle
- Log rotation kontrolü
- Disk alanı kontrolü

### 3. MCP Connectivity Audit
- FinBot MCP (port 5555) - Health check
- MuBot MCP (port 5556) - Health check
- DESE MCP (port 5557) - Health check
- Observability MCP (port 5558) - Health check

### 4. LLM Benchmark
- Placeholder (henüz implement edilmedi)
- LLM performans testi

### 5. Context Stats Report
- Context dosyası boyutları
- Memory kullanımı
- Dosya sayıları

### 6. Metrics Push
- Prometheus'a metrikleri gönder
- Health check metrikleri
- MCP server metrikleri

---

## 🚀 Mevcut Alternatifler

### Health Check
```bash
pnpm health:check              # Basic health check
pnpm health:check:verbose      # Verbose health check
pnpm health:monitor            # Continuous monitoring
```

**Script:** `scripts/advanced-health-check.ps1`

### Metrics Validation
```bash
pnpm metrics:test              # Test Prometheus metrics
pnpm metrics:validate          # Validate realtime metrics
```

---

## ⚠️ Eksik Scriptler

### Oluşturulması Gereken
1. `scripts/jarvis-efficiency-chain.ps1` - Ana efficiency chain
2. `scripts/jarvis-diagnostic-phase1.ps1` - Phase 1 diagnostics
3. `scripts/jarvis-diagnostic-phase2.ps1` - Phase 2 diagnostics
4. `scripts/jarvis-diagnostic-phase3.ps1` - Phase 3 diagnostics

**Durum:** Bu scriptler henüz oluşturulmadı. Mevcut `advanced-health-check.ps1` kullanılabilir.

---

## 📊 MCP Server Health Check

### Endpoints
```bash
# FinBot MCP
curl http://localhost:5555/finbot/health

# MuBot MCP
curl http://localhost:5556/mubot/health

# DESE MCP
curl http://localhost:5557/dese/health

# Observability MCP
curl http://localhost:5558/observability/health
```

### Package Scripts
```bash
pnpm mcp:finbot        # Start FinBot MCP
pnpm mcp:mubot         # Start MuBot MCP
pnpm mcp:dese          # Start DESE MCP
pnpm mcp:observability # Start Observability MCP
pnpm mcp:all           # Start all MCP servers
```

---

## 📝 Detaylar

**Dosyalar:**
- `.cursor/memory/JARVIS_DURUMU.md` - JARVIS durumu detayları
- `DESE_JARVIS_CONTEXT.md` - JARVIS context bilgileri
- `scripts/advanced-health-check.ps1` - Mevcut health check

---

**Son Güncelleme:** 2025-01-27  
**Versiyon:** 6.8.0

