#!/bin/bash

# DESE JARVIS Diagnostic Chain - Phase 1
# Sistem sağlık kontrolü ve raporlama

echo "══════════════════════════════════════════════════════════════"
echo "   DESE JARVIS DIAGNOSTIC CHAIN - PHASE 1"
echo "══════════════════════════════════════════════════════════════"
echo ""

# Rapor dosyası oluştur
DATE=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="reports/diagnostic"
REPORT_FILE="$REPORT_DIR/phase1_report_$DATE.txt"

mkdir -p "$REPORT_DIR"

echo "# DESE JARVIS Diagnostic Chain - Phase 1 Report" > "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

RESULTS=()

# [1/5] MCP Discovery
echo ">> [1/5] MCP Discovery..."
echo "Checking MCP servers..."

FINBOT_STATUS="❌"
MUBOT_STATUS="❌"
DESE_STATUS="❌"

if curl -s http://localhost:5555/finbot/health > /dev/null 2>&1; then
    FINBOT_STATUS="✅"
    echo "  FinBot (5555): $FINBOT_STATUS" | tee -a "$REPORT_FILE"
else
    echo "  FinBot (5555): $FINBOT_STATUS" | tee -a "$REPORT_FILE"
fi

if curl -s http://localhost:5556/mubot/health > /dev/null 2>&1; then
    MUBOT_STATUS="✅"
    echo "  MuBot (5556): $MUBOT_STATUS" | tee -a "$REPORT_FILE"
else
    echo "  MuBot (5556): $MUBOT_STATUS" | tee -a "$REPORT_FILE"
fi

if curl -s http://localhost:5557/dese/health > /dev/null 2>&1; then
    DESE_STATUS="✅"
    echo "  DESE (5557): $DESE_STATUS" | tee -a "$REPORT_FILE"
else
    echo "  DESE (5557): $DESE_STATUS" | tee -a "$REPORT_FILE"
fi

echo "" | tee -a "$REPORT_FILE"
RESULTS+=("MCP Discovery: ${FINBOT_STATUS}${MUBOT_STATUS}${DESE_STATUS}")

# [2/5] Module Health Check
echo ">> [2/5] Module Health Check..."

check_health() {
    local module=$1
    local port=$2
    
    echo -n "  Testing $module..."
    if RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:$port/$module/health 2>/dev/null); then
        HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
        BODY=$(echo "$RESPONSE" | head -n -1)
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo " ✅ (HTTP $HTTP_CODE)"
            echo "    Response: $BODY" | tee -a "$REPORT_FILE"
            return 0
        else
            echo " ⚠️  (HTTP $HTTP_CODE)"
            return 1
        fi
    else
        echo " ❌ (offline)"
        echo "    $module unreachable" | tee -a "$REPORT_FILE"
        return 2
    fi
}

check_health "finbot" "5555"
check_health "mubot" "5556"
check_health "dese" "5557"

echo "" | tee -a "$REPORT_FILE"

# [3/5] Network & API Latency
echo ">> [3/5] Network & API Latency..."

measure_latency() {
    local module=$1
    local port=$2
    
    echo -n "  $module: "
    
    if command -v curl > /dev/null 2>&1; then
        # Windows'ta date +%s%3N çalışmaz, alternatif yaklaşım
        START=$(date +%s)
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/$module/health 2>/dev/null)
        END=$(date +%s)
        LATENCY=$((END - START))
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo "${LATENCY}s ✅"
            echo "    HTTP $HTTP_CODE, Latency: ${LATENCY}s" | tee -a "$REPORT_FILE"
        else
            echo "timeout ⚠️"
        fi
    else
        echo "curl not available"
    fi
}

measure_latency "finbot" "5555"
measure_latency "mubot" "5556"
measure_latency "dese" "5557"

echo "" | tee -a "$REPORT_FILE"

# [4/5] Config Integrity
echo ">> [4/5] Config Integrity..."

CONFIG_FOUND="❌"

if [ -f ".cursor/upgrade-protocol-v1.2.yaml" ]; then
    CONFIG_FOUND="✅"
    echo "  upgrade-protocol-v1.2.yaml found $CONFIG_FOUND" | tee -a "$REPORT_FILE"
    
    if grep -q "version:" .cursor/upgrade-protocol-v1.2.yaml 2>/dev/null; then
        echo "  version key found ✅" | tee -a "$REPORT_FILE"
    else
        echo "  version key missing ⚠️" | tee -a "$REPORT_FILE"
    fi
else
    echo "  Config file not found $CONFIG_FOUND" | tee -a "$REPORT_FILE"
fi

if [ -f ".cursor/jarvis-config.json" ]; then
    echo "  jarvis-config.json found ✅" | tee -a "$REPORT_FILE"
else
    echo "  jarvis-config.json not found ⚠️" | tee -a "$REPORT_FILE"
fi

echo "" | tee -a "$REPORT_FILE"

# [5/5] Summary Export
echo ">> [5/5] Summary Export..."

echo "Diagnostic completed. Report saved to: $REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"
echo "---" | tee -a "$REPORT_FILE"
echo "END OF REPORT" | tee -a "$REPORT_FILE"

# Son özet
echo ""
echo "══════════════════════════════════════════════════════════════"
echo "   DIAGNOSTIC COMPLETED"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "Report: $REPORT_FILE"
echo ""

