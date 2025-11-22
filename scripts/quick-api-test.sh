#!/bin/bash

# Quick API Test Script for Dese EA Plan v6.8.2
# Tests critical endpoints and validates expected responses

set -e

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:3000}"
API_URL="${BASE_URL}/api/v1"
ENVIRONMENT="${NODE_ENV:-development}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Helper function to print test results
print_test() {
    local test_name="$1"
    local status="$2"
    local details="${3:-}"
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $test_name"
        if [ -n "$details" ]; then
            echo -e "  ${RED}Details: $details${NC}"
        fi
        ((FAILED++))
    fi
}

# Helper function to check HTTP status
check_status() {
    local url="$1"
    local expected_status="$2"
    local method="${3:-GET}"
    local data="${4:-}"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo "$body"
        return 0
    else
        echo "Expected $expected_status, got $http_code" >&2
        echo "$body" >&2
        return 1
    fi
}

echo "=========================================="
echo "  Dese EA Plan API Quick Test Suite"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo "Environment: $ENVIRONMENT"
echo ""

# Test 1: GET /api/v1 (API Root)
echo "Test 1: GET /api/v1 (API Root)"
if check_status "$API_URL" 200 > /dev/null 2>&1; then
    body=$(check_status "$API_URL" 200)
    if echo "$body" | grep -q '"name"'; then
        print_test "GET /api/v1 returns 200 with valid JSON" "PASS"
    else
        print_test "GET /api/v1 returns 200 with valid JSON" "FAIL" "Missing 'name' field"
    fi
else
    print_test "GET /api/v1 returns 200" "FAIL" "HTTP status check failed"
fi
echo ""

# Test 2: GET /api/v1/auth/login (Method Not Allowed)
echo "Test 2: GET /api/v1/auth/login (Method Not Allowed)"
if check_status "$API_URL/auth/login" 405 > /dev/null 2>&1; then
    body=$(check_status "$API_URL/auth/login" 405)
    allow_header=$(curl -s -I -X GET "$API_URL/auth/login" | grep -i "Allow" | cut -d' ' -f2- | tr -d '\r')
    if echo "$body" | grep -q "method_not_allowed" && [ -n "$allow_header" ]; then
        print_test "GET /api/v1/auth/login returns 405 with Allow: POST" "PASS"
    else
        print_test "GET /api/v1/auth/login returns 405 with Allow: POST" "FAIL" "Missing Allow header or error message"
    fi
else
    print_test "GET /api/v1/auth/login returns 405" "FAIL" "HTTP status check failed"
fi
echo ""

# Test 3: POST /api/v1/auth/login (Mock Login)
echo "Test 3: POST /api/v1/auth/login (Mock Login)"
login_data='{"username":"admin@poolfab.com.tr"}'
if [ "$ENVIRONMENT" = "production" ]; then
    # Production: Should return 403
    if check_status "$API_URL/auth/login" 403 POST "$login_data" > /dev/null 2>&1; then
        body=$(check_status "$API_URL/auth/login" 403 POST "$login_data")
        if echo "$body" | grep -q "mock_login_disabled"; then
            print_test "POST /api/v1/auth/login returns 403 in production" "PASS"
        else
            print_test "POST /api/v1/auth/login returns 403 in production" "FAIL" "Missing mock_login_disabled error"
        fi
    else
        print_test "POST /api/v1/auth/login returns 403 in production" "FAIL" "HTTP status check failed"
    fi
else
    # Development: Should return 200
    if check_status "$API_URL/auth/login" 200 POST "$login_data" > /dev/null 2>&1; then
        body=$(check_status "$API_URL/auth/login" 200 POST "$login_data")
        if echo "$body" | grep -q "token"; then
            # Extract token for later tests
            TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
            print_test "POST /api/v1/auth/login returns 200 with token in development" "PASS"
        else
            print_test "POST /api/v1/auth/login returns 200 with token in development" "FAIL" "Missing token in response"
        fi
    else
        print_test "POST /api/v1/auth/login returns 200 in development" "FAIL" "HTTP status check failed"
    fi
fi
echo ""

# Test 4: GET /health/live (Liveness Probe)
echo "Test 4: GET /health/live (Liveness Probe)"
if check_status "$BASE_URL/health/live" 200 > /dev/null 2>&1; then
    body=$(check_status "$BASE_URL/health/live" 200)
    if echo "$body" | grep -q '"status"'; then
        print_test "GET /health/live returns 200 with status" "PASS"
    else
        print_test "GET /health/live returns 200 with status" "FAIL" "Missing status field"
    fi
else
    print_test "GET /health/live returns 200" "FAIL" "HTTP status check failed"
fi
echo ""

# Test 5: GET /metrics (Prometheus Metrics)
echo "Test 5: GET /metrics (Prometheus Metrics)"
metrics_response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/metrics" 2>&1)
http_code=$(echo "$metrics_response" | tail -n1)
metrics_body=$(echo "$metrics_response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    if echo "$metrics_body" | grep -q "^# HELP\|^# TYPE\|http_requests_total\|http_request_duration_seconds"; then
        print_test "GET /metrics returns 200 with Prometheus format" "PASS"
    else
        print_test "GET /metrics returns 200 with Prometheus format" "FAIL" "Response doesn't look like Prometheus metrics"
    fi
else
    print_test "GET /metrics returns 200" "FAIL" "HTTP status: $http_code"
fi
echo ""

# Test 6: GET /api/v1/auth/me (Authentication Test - if token available)
if [ -n "$TOKEN" ]; then
    echo "Test 6: GET /api/v1/auth/me (Authentication with JWT Token)"
    me_response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me" \
        -H "Authorization: Bearer $TOKEN" 2>&1)
    http_code=$(echo "$me_response" | tail -n1)
    me_body=$(echo "$me_response" | head -n-1)
    
    if [ "$http_code" -eq 200 ]; then
        if echo "$me_body" | grep -q '"user"'; then
            print_test "GET /api/v1/auth/me returns 200 with user info" "PASS"
        else
            print_test "GET /api/v1/auth/me returns 200 with user info" "FAIL" "Missing user field"
        fi
    else
        print_test "GET /api/v1/auth/me returns 200" "FAIL" "HTTP status: $http_code"
    fi
    echo ""
fi

# Test 7: WebSocket Authentication Example (Info only)
echo "Test 7: WebSocket Authentication (Info)"
echo -e "${YELLOW}⚠${NC} WebSocket test requires interactive client"
echo "   Example with wscat:"
echo "   1. Install: npm install -g wscat"
echo "   2. Connect: wscat -c ws://localhost:3000"
echo "   3. Send auth: {\"type\":\"auth\",\"token\":\"$TOKEN\"}"
echo "   4. Expected: {\"type\":\"auth_success\",\"userId\":\"...\",\"email\":\"...\"}"
echo ""

# Summary
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi

