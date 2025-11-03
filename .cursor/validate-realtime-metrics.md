# DESE JARVIS System Validation Prompt

## Context
**EA Plan Master Control v6.7.0** – `sprint/2.6-predictive-correlation`  
**Focus:** Realtime Metrics Dashboard (Redis Streams + WS + Prometheus)  
**Mode:** Stepwise validation & auto-report  
**Purpose:** Sistem kararlılık analizi, DESE JARVIS yönlendirme için veri toplama

## Usage

```bash
# Run validation
pnpm metrics:validate

# Or directly
pwsh scripts/validate-realtime-metrics.ps1
```

## Validation Steps

### STEP 1 — Prometheus metric export check
- Validates: `ws_connections`, `ws_broadcast_total`, `ws_latency_seconds`, `stream_consumer_lag`
- Endpoint: `http://localhost:3001/metrics`
- Output: Sample metrics display

### STEP 2 — Redis Streams health
- Checks: `finbot.events`, `mubot.events`, `dese.events`
- Validates: Stream length, consumer groups, pending messages
- Tool: `redis-cli` (if available)

### STEP 3 — WebSocket gateway ping/pong
- Tests: Connection, ping/pong latency
- Endpoint: `ws://localhost:3001/ws`
- Validates: RTT measurement capability

### STEP 4 — Report summary
- Pass/Fail status for each check
- Error and warning collection
- Exit code: 0 (success), 1 (errors), 2 (partial)

## Return Format

The script outputs structured console output that should be returned directly to DESE JARVIS for next-task analysis.

## Integration with Cursor

This prompt can be used as a context reference in Cursor AI to:
1. Run periodic system validation
2. Detect metric export issues
3. Monitor Redis Streams health
4. Validate WebSocket gateway functionality
5. Generate automated health reports

## Example Output

```
=== DESE JARVIS SYSTEM VALIDATION ===
▶️ STEP 1 — Prometheus metric export check
  ✅ ws_connections found
  ✅ ws_broadcast_total found
  ✅ ws_latency_seconds found
  ✅ stream_consumer_lag found
  ✅ All Prometheus metrics exported successfully

▶️ STEP 2 — Redis Streams health
  ✅ finbot.events active (length: 15)
  ✅ Redis Streams active (1/3 streams)

▶️ STEP 3 — WebSocket gateway ping/pong
  ✅ WS connected
  ✅ WS latency OK

▶️ STEP 4 — Report summary
Validation Results:
  • Prometheus Metrics: ✅ PASS
  • Redis Streams: ✅ PASS
  • WebSocket Gateway: ✅ PASS

Summary: 3/3 checks passed
```

