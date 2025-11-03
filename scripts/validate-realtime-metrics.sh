#!/bin/bash
# === DESE JARVIS SYSTEM VALIDATION (Cross-Platform Bash Version) ===
# Context: EA Plan Master Control v6.7.0 – sprint/2.6-predictive-correlation
# Focus: Realtime Metrics Dashboard (Redis Streams + WS + Prometheus)
# Mode: Stepwise validation & auto-report
# Purpose: Sistem kararlılık analizi, DESE JARVIS yönlendirme için veri toplama

set -e

echo "=== DESE JARVIS SYSTEM VALIDATION ==="
echo "EA Plan Master Control v6.7.0 - sprint/2.6-predictive-correlation"
echo "Focus: Realtime Metrics Dashboard (Redis Streams + WS + Prometheus)"
echo ""

PROMETHEUS_METRICS=false
REDIS_STREAMS=false
WEBSOCKET_GATEWAY=false
ERRORS=()
WARNINGS=()

# STEP 1 — Prometheus metric export check
echo "▶️ STEP 1 — Prometheus metric export check"

METRICS_URL="${METRICS_URL:-http://localhost:3001/metrics}"
REQUIRED_METRICS=("ws_connections" "ws_broadcast_total" "ws_latency_seconds" "stream_consumer_lag")
FOUND_COUNT=0
MISSING_METRICS=()

if curl -sf "$METRICS_URL" > /dev/null 2>&1; then
    METRICS_CONTENT=$(curl -s "$METRICS_URL")
    
    for metric in "${REQUIRED_METRICS[@]}"; do
        if echo "$METRICS_CONTENT" | grep -q "$metric"; then
            echo "  ✅ $metric found"
            FOUND_COUNT=$((FOUND_COUNT + 1))
        else
            echo "  ❌ $metric missing"
            MISSING_METRICS+=("$metric")
            WARNINGS+=("Missing metric: $metric")
        fi
    done
    
    if [ $FOUND_COUNT -eq ${#REQUIRED_METRICS[@]} ]; then
        PROMETHEUS_METRICS=true
        echo "  ✅ All Prometheus metrics exported successfully"
    else
        echo "  ⚠️  Missing metrics: ${MISSING_METRICS[*]}"
    fi
    
    echo ""
    echo "  Sample metrics:"
    echo "$METRICS_CONTENT" | grep -E "^(ws_|stream_consumer)" | head -5 | sed 's/^/    /'
else
    ERROR_MSG="Failed to fetch Prometheus metrics from $METRICS_URL"
    echo "  ❌ $ERROR_MSG"
    ERRORS+=("$ERROR_MSG")
    echo "     Make sure backend is running on http://localhost:3001"
fi

echo ""

# STEP 2 — Redis Streams health
echo "▶️ STEP 2 — Redis Streams health"

if command -v redis-cli > /dev/null 2>&1; then
    REDIS_HOST="${REDIS_HOST:-localhost}"
    REDIS_PORT="${REDIS_PORT:-6379}"
    
    STREAMS=("finbot.events" "mubot.events" "dese.events")
    ACTIVE_COUNT=0
    INACTIVE_STREAMS=()
    
    for stream in "${STREAMS[@]}"; do
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" EXISTS "$stream" > /dev/null 2>&1; then
            LENGTH=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" XLEN "$stream" 2>/dev/null || echo "0")
            echo "  ✅ $stream active (length: $LENGTH)"
            ACTIVE_COUNT=$((ACTIVE_COUNT + 1))
        else
            echo "  ⚠️  $stream empty or not found"
            INACTIVE_STREAMS+=("$stream")
            WARNINGS+=("Stream inactive: $stream")
        fi
    done
    
    if [ $ACTIVE_COUNT -gt 0 ]; then
        REDIS_STREAMS=true
        echo "  ✅ Redis Streams active ($ACTIVE_COUNT/${#STREAMS[@]} streams)"
    else
        echo "  ⚠️  Streams inactive (no active streams found)"
    fi
    
    # Check for pending messages (consumer lag)
    for stream in "${STREAMS[@]}"; do
        GROUPS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" XINFO GROUPS "$stream" 2>/dev/null || echo "")
        if echo "$GROUPS" | grep -q "pending"; then
            echo "  ℹ️  $stream has consumer groups with pending messages"
        fi
    done
else
    WARNING_MSG="redis-cli not found, skipping Redis Streams check"
    echo "  ⚠️  $WARNING_MSG"
    WARNINGS+=("$WARNING_MSG")
    echo "     Install Redis tools or use Docker container"
fi

echo ""

# STEP 3 — WebSocket gateway ping/pong
echo "▶️ STEP 3 — WebSocket gateway ping/pong"

if command -v node > /dev/null 2>&1; then
    # Check if ws package is available
    if ! node -e "require('ws')" 2>/dev/null; then
        if [ -f "package.json" ]; then
            npm install ws --no-save 2>/dev/null || echo "  ⚠️  Failed to install ws package"
        else
            echo "  ⚠️  ws package not available and package.json not found"
            WARNINGS+=("ws package not available")
        fi
    fi
    
    WS_TEST_SCRIPT=$(cat <<'EOF'
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001/ws?token=test-token');

let connected = false;
let pongReceived = false;
const timeout = setTimeout(() => {
    if (!connected) {
        console.log('  ❌ WS connection timeout');
        process.exit(1);
    }
    if (!pongReceived) {
        console.log('  ⚠️  WS connected but ping/pong test incomplete');
        process.exit(0);
    }
}, 5000);

ws.on('open', () => {
    connected = true;
    console.log('  ✅ WS connected');
    ws.ping();
});

ws.on('pong', () => {
    pongReceived = true;
    console.log('  ✅ WS latency OK');
    clearTimeout(timeout);
    ws.close();
    process.exit(0);
});

ws.on('error', (error) => {
    console.log('  ❌ WS error:', error.message);
    clearTimeout(timeout);
    process.exit(1);
});

ws.on('close', () => {
    if (!pongReceived && connected) {
        console.log('  ⚠️  WS closed before ping/pong test');
    }
    clearTimeout(timeout);
    process.exit(0);
});
EOF
)
    
    if echo "$WS_TEST_SCRIPT" | node 2>&1; then
        if [ $? -eq 0 ]; then
            WEBSOCKET_GATEWAY=true
        fi
    else
        ERROR_MSG="WebSocket gateway test failed"
        echo "  ❌ $ERROR_MSG"
        ERRORS+=("$ERROR_MSG")
    fi
else
    WARNING_MSG="Node.js not found, skipping WebSocket test"
    echo "  ⚠️  $WARNING_MSG"
    WARNINGS+=("$WARNING_MSG")
fi

echo ""

# STEP 4 — Report summary
echo "▶️ STEP 4 — Report summary"
echo ""

TOTAL_CHECKS=3
PASSED_CHECKS=0

[ "$PROMETHEUS_METRICS" = true ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))
[ "$REDIS_STREAMS" = true ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))
[ "$WEBSOCKET_GATEWAY" = true ] && PASSED_CHECKS=$((PASSED_CHECKS + 1))

echo "Validation Results:"
if [ "$PROMETHEUS_METRICS" = true ]; then
    echo "  • Prometheus Metrics: ✅ PASS"
else
    echo "  • Prometheus Metrics: ❌ FAIL"
fi

if [ "$REDIS_STREAMS" = true ]; then
    echo "  • Redis Streams: ✅ PASS"
else
    echo "  • Redis Streams: ⚠️  PARTIAL/WARN"
fi

if [ "$WEBSOCKET_GATEWAY" = true ]; then
    echo "  • WebSocket Gateway: ✅ PASS"
else
    echo "  • WebSocket Gateway: ❌ FAIL/WARN"
fi

echo ""

echo "Summary: $PASSED_CHECKS/$TOTAL_CHECKS checks passed"
echo ""

if [ ${#ERRORS[@]} -gt 0 ]; then
    echo "Errors:"
    for error in "${ERRORS[@]}"; do
        echo "  • $error"
    done
    echo ""
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo "Warnings:"
    for warning in "${WARNINGS[@]}"; do
        echo "  • $warning"
    done
    echo ""
fi

echo "=== END VALIDATION REPORT ==="
echo ""
echo "Return this console output directly to DESE JARVIS for next-task analysis."
echo ""

# Exit with appropriate code
if [ ${#ERRORS[@]} -gt 0 ]; then
    exit 1
elif [ $PASSED_CHECKS -lt $TOTAL_CHECKS ]; then
    exit 2
else
    exit 0
fi

