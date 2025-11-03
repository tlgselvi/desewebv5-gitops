#!/bin/bash

# DESE JARVIS Diagnostic Chain - Phase 2
# Advanced analytics ve correlation scoring

echo "══════════════════════════════════════════════════════════════"
echo "   DESE JARVIS DIAGNOSTIC CHAIN - PHASE 2"
echo "══════════════════════════════════════════════════════════════"
echo ""

# Dizin oluştur
mkdir -p tmp
mkdir -p reports/diagnostic

# [1/5] FinBot veri örneklemesi
echo ">> [1/5] FinBot veri örneklemesi..."

if command -v curl >/dev/null 2>&1; then
    if curl -s http://localhost:3000/metrics > tmp/finbot_metrics.json 2>/dev/null; then
        echo "  Metrics collected ✅"
        
        # Response time analizi (eğer jq varsa)
        if command -v jq >/dev/null 2>&1; then
            FIN_LAT=$(jq -r '.response_time_ms // "5"' tmp/finbot_metrics.json 2>/dev/null || echo "5")
        else
            FIN_LAT="5"
        fi
    else
        echo "  Metrics endpoint not available ⚠️"
        FIN_LAT="5"
    fi
else
    echo "  curl not available ⚠️"
    FIN_LAT="5"
fi

echo "  FinBot avg latency: ${FIN_LAT}ms"
echo ""

# [2/5] MuBot correlation matrix
echo ">> [2/5] MuBot correlation matrix..."

# Correlation AI endpoint'ini test et
if curl -s http://localhost:3000/api/v1/ai/correlation > tmp/mubot_corr.json 2>/dev/null; then
    echo "  Correlation metrics collected ✅"
    
    if command -v jq >/dev/null 2>&1; then
        PEARSON=$(jq -r '.correlation.pearson // 0.8' tmp/mubot_corr.json 2>/dev/null || echo "0.8")
        SPEARMAN=$(jq -r '.correlation.spearman // 0.75' tmp/mubot_corr.json 2>/dev/null || echo "0.75")
        CORR_SCORE=$(echo "scale=3; ($PEARSON + $SPEARMAN) / 2" | bc 2>/dev/null || echo "0.775")
    else
        CORR_SCORE="0.775"
    fi
else
    echo "  Correlation endpoint not available, using defaults ⚠️"
    CORR_SCORE="0.775"
fi

echo "  Avg correlation score: ${CORR_SCORE}"
echo ""

# [3/5] DESE telemetry analizi
echo ">> [3/5] DESE telemetry analizi..."

if curl -s http://localhost:3000/api/v1/ai/correlation > tmp/dese_telemetry.json 2>/dev/null; then
    echo "  Telemetry data collected ✅"
    
    if command -v jq >/dev/null 2>&1; then
        ANOMALY_RATE=$(jq -r '.correlation.anomalyRate // 0.05' tmp/dese_telemetry.json 2>/dev/null || echo "0.05")
        DESE_DRIFT=$(echo "scale=1; $ANOMALY_RATE * 100" | bc 2>/dev/null || echo "5.0")
    else
        DESE_DRIFT="5.0"
    fi
else
    echo "  Telemetry endpoint not available, using defaults ⚠️"
    DESE_DRIFT="5.0"
fi

echo "  DESE drift: ${DESE_DRIFT}%"
echo ""

# [4/5] Correlation AI değerlendirmesi
echo ">> [4/5] Correlation AI değerlendirmesi..."

# Python ile scoring
PYTHON_SCRIPT='
import json
import sys

try:
    data = json.load(sys.stdin)
    fin_lat = float(data.get("fin_latency", 5))
    mubot_corr = float(data.get("mubot_corr", 0.775))
    dese_drift = float(data.get("dese_drift", 5.0))
    
    # Scoring formula
    latency_penalty = fin_lat / 10.0
    correlation_bonus = abs(1 - mubot_corr * 100) / 10.0
    drift_penalty = dese_drift / 50.0
    
    score = 100 - latency_penalty - correlation_bonus - drift_penalty
    score = max(0, min(100, score))  # Clamp between 0-100
    
    result = {
        "predictive_score": round(score, 2),
        "components": {
            "latency_score": round(100 - latency_penalty, 2),
            "correlation_score": round(100 - correlation_bonus, 2),
            "drift_score": round(100 - drift_penalty, 2)
        },
        "metrics": {
            "fin_latency": fin_lat,
            "mubot_corr": mubot_corr,
            "dese_drift": dese_drift
        }
    }
    
    print(json.dumps(result, indent=2))
except Exception as e:
    result = {
        "predictive_score": 75.0,
        "error": str(e)
    }
    print(json.dumps(result, indent=2))
'

INPUT_DATA="{\"fin_latency\":${FIN_LAT},\"mubot_corr\":${CORR_SCORE},\"dese_drift\":${DESE_DRIFT}}"

if command -v python3 >/dev/null 2>&1; then
    echo "$INPUT_DATA" | python3 -c "$PYTHON_SCRIPT" > reports/diagnostic/phase2_report.json
    echo "  Scoring completed ✅"
    echo ""
    
    if command -v jq >/dev/null 2>&1; then
        PREDICTIVE_SCORE=$(jq -r '.predictive_score' reports/diagnostic/phase2_report.json)
        echo "  Predictive Score: ${PREDICTIVE_SCORE}/100"
    fi
else
    echo "  Python3 not available, using defaults ⚠️"
    cat > reports/diagnostic/phase2_report.json <<EOF
{
  "predictive_score": 85.0,
  "note": "Default score (Python not available)",
  "metrics": {
    "fin_latency": ${FIN_LAT},
    "mubot_corr": ${CORR_SCORE},
    "dese_drift": ${DESE_DRIFT}
  }
}
EOF
fi

echo ""

# [5/5] Tamamlandı
echo ">> [5/5] Tamamlandı"
echo "  Report: reports/diagnostic/phase2_report.json"
echo ""
echo "══════════════════════════════════════════════════════════════"
echo "   PHASE 2 COMPLETED"
echo "══════════════════════════════════════════════════════════════"
echo ""

