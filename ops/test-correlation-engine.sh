#!/bin/bash
# Sprint 2.6 Day 1 - Correlation Engine API Tests

set -e

echo "========================================="
echo "Sprint 2.6 Day 1 - Correlation Engine Tests"
echo "========================================="
echo ""

BASE_URL="http://localhost:8080/api/v1/aiops"
TIMEOUT=30

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Test 1: Health Check
echo "1️⃣ Testing Correlation Engine Health..."
echo "---------------------------"
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health.json "$BASE_URL/correlation/health" --max-time $TIMEOUT)
HTTP_CODE="${HEALTH_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    print_status 0 "Health check passed"
    cat /tmp/health.json | jq '.'
else
    print_status 1 "Health check failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 2: Calculate Correlation
echo "2️⃣ Testing Correlation Calculation..."
echo "---------------------------"
CORRELATION_PAYLOAD='{
  "metric1": "http_requests_total",
  "metric2": "http_request_duration_seconds",
  "timeRange": "1h"
}'

CORRELATION_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/correlation.json \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$CORRELATION_PAYLOAD" \
  "$BASE_URL/correlation/calculate" \
  --max-time $TIMEOUT)

HTTP_CODE="${CORRELATION_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    print_status 0 "Correlation calculation passed"
    cat /tmp/correlation.json | jq '.'
else
    print_status 1 "Correlation calculation failed (HTTP $HTTP_CODE)"
    cat /tmp/correlation.json
fi
echo ""

# Test 3: Correlation Matrix
echo "3️⃣ Testing Correlation Matrix..."
echo "---------------------------"
MATRIX_PAYLOAD='{
  "metrics": [
    "http_requests_total",
    "http_request_duration_seconds",
    "cpu_usage_percent",
    "memory_usage_percent"
  ],
  "timeRange": "1h"
}'

MATRIX_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/matrix.json \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$MATRIX_PAYLOAD" \
  "$BASE_URL/correlation/matrix" \
  --max-time $TIMEOUT)

HTTP_CODE="${MATRIX_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    print_status 0 "Correlation matrix generation passed"
    cat /tmp/matrix.json | jq '.matrix.correlations | length'
    print_info "Generated $(cat /tmp/matrix.json | jq '.matrix.correlations | length') correlations"
else
    print_status 1 "Correlation matrix generation failed (HTTP $HTTP_CODE)"
    cat /tmp/matrix.json
fi
echo ""

# Test 4: Strong Correlations
echo "4️⃣ Testing Strong Correlations..."
echo "---------------------------"
STRONG_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/strong.json \
  "$BASE_URL/correlation/strong?metrics=http_requests_total,http_request_duration_seconds,cpu_usage_percent&threshold=0.5" \
  --max-time $TIMEOUT)

HTTP_CODE="${STRONG_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    print_status 0 "Strong correlations retrieval passed"
    STRONG_COUNT=$(cat /tmp/strong.json | jq '.correlations | length')
    print_info "Found $STRONG_COUNT strong correlations"
    cat /tmp/strong.json | jq '.correlations[] | {metric1, metric2, pearson, strength}'
else
    print_status 1 "Strong correlations retrieval failed (HTTP $HTTP_CODE)"
    cat /tmp/strong.json
fi
echo ""

# Test 5: Metric Impact Prediction
echo "5️⃣ Testing Metric Impact Prediction..."
echo "---------------------------"
IMPACT_PAYLOAD='{
  "targetMetric": "http_request_duration_seconds",
  "metrics": [
    "http_requests_total",
    "cpu_usage_percent",
    "memory_usage_percent"
  ],
  "timeRange": "1h"
}'

IMPACT_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/impact.json \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$IMPACT_PAYLOAD" \
  "$BASE_URL/correlation/impact" \
  --max-time $TIMEOUT)

HTTP_CODE="${IMPACT_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    print_status 0 "Metric impact prediction passed"
    cat /tmp/impact.json | jq '.impacts[] | {metric, impact, correlation}'
else
    print_status 1 "Metric impact prediction failed (HTTP $HTTP_CODE)"
    cat /tmp/impact.json
fi
echo ""

# Performance Test
echo "6️⃣ Performance Test..."
echo "---------------------------"
print_info "Testing correlation calculation performance..."

START_TIME=$(date +%s%3N)
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"metric1": "http_requests_total", "metric2": "http_request_duration_seconds", "timeRange": "5m"}' \
  "$BASE_URL/correlation/calculate" \
  --max-time $TIMEOUT > /dev/null
END_TIME=$(date +%s%3N)

DURATION=$((END_TIME - START_TIME))
TARGET_MS=500

if [ $DURATION -lt $TARGET_MS ]; then
    print_status 0 "Performance test passed (${DURATION}ms < ${TARGET_MS}ms)"
else
    print_status 1 "Performance test failed (${DURATION}ms >= ${TARGET_MS}ms)"
fi
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""

TOTAL_TESTS=6
PASSED_TESTS=0

# Count passed tests
[ "$(cat /tmp/health.json | jq -r '.success')" = "true" ] && ((PASSED_TESTS++))
[ "$(cat /tmp/correlation.json | jq -r '.success')" = "true" ] && ((PASSED_TESTS++))
[ "$(cat /tmp/matrix.json | jq -r '.success')" = "true" ] && ((PASSED_TESTS++))
[ "$(cat /tmp/strong.json | jq -r '.success')" = "true" ] && ((PASSED_TESTS++))
[ "$(cat /tmp/impact.json | jq -r '.success')" = "true" ] && ((PASSED_TESTS++))
[ $DURATION -lt $TARGET_MS ] && ((PASSED_TESTS++))

echo "Tests Passed: $PASSED_TESTS/$TOTAL_TESTS"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}✅ All tests passed! Correlation Engine is operational.${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. ✅ Correlation Engine implemented"
    echo "2. ✅ API endpoints tested"
    echo "3. ✅ Performance within targets"
    echo "4. [ ] Day 2: ML-based predictive remediation"
    echo "5. [ ] Day 3: Enhanced anomaly detection"
else
    echo -e "${RED}❌ Some tests failed. Review logs above.${NC}"
    exit 1
fi

echo ""
echo "Sprint 2.6 Day 1 Complete!"

