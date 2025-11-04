#!/bin/bash
# MCP Server E2E Validation Script (Bash)
# Phase-5 Sprint 1: Task 1.2
# Tests MCP server health, service discovery, and load testing

set -euo pipefail

VERBOSE=false
LOAD_TEST_REQUESTS=100
CONCURRENT_REQUESTS=10

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --requests|-r)
      LOAD_TEST_REQUESTS="$2"
      shift 2
      ;;
    --concurrent|-c)
      CONCURRENT_REQUESTS="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# MCP Server Configuration
declare -A MCP_SERVERS=(
  ["FinBot"]="http://localhost:5555/finbot/health"
  ["MuBot"]="http://localhost:5556/mubot/health"
  ["DESE"]="http://localhost:5557/dese/health"
  ["Observability"]="http://localhost:5558/observability/health"
)

HEALTH_CHECK_PASSED=0
HEALTH_CHECK_FAILED=0
SERVICE_DISCOVERY_PASSED=0
SERVICE_DISCOVERY_FAILED=0

echo "=== MCP Server E2E Validation ==="
echo ""

# Step 1: Health Checks
echo "[1/3] Health Checks..."
for server_name in "${!MCP_SERVERS[@]}"; do
  url="${MCP_SERVERS[$server_name]}"
  
  if response=$(curl -s -w "\n%{http_code}" --max-time 3 "$url" 2>/dev/null); then
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
      status=$(echo "$body" | jq -r '.status' 2>/dev/null || echo "unknown")
      version=$(echo "$body" | jq -r '.version' 2>/dev/null || echo "unknown")
      
      if [ "$status" = "healthy" ]; then
        echo "  ✅ $server_name: Healthy (v$version)"
        ((HEALTH_CHECK_PASSED++))
      else
        echo "  ❌ $server_name: Unhealthy"
        ((HEALTH_CHECK_FAILED++))
      fi
    else
      echo "  ❌ $server_name: HTTP $http_code"
      ((HEALTH_CHECK_FAILED++))
    fi
  else
    echo "  ❌ $server_name: Not reachable"
    ((HEALTH_CHECK_FAILED++))
  fi
done

echo ""

# Step 2: Service Discovery
echo "[2/3] Service Discovery..."
for server_name in "${!MCP_SERVERS[@]}"; do
  base_url=$(echo "${MCP_SERVERS[$server_name]}" | sed 's|/health$||')
  query_url="${base_url}/query"
  
  if response=$(curl -s -w "\n%{http_code}" -X POST "$query_url" \
    -H "Content-Type: application/json" \
    -d '{"query":"test discovery"}' \
    --max-time 3 2>/dev/null); then
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 200 ]; then
      echo "  ✅ $server_name: Query endpoint responding"
      ((SERVICE_DISCOVERY_PASSED++))
    else
      echo "  ⚠️  $server_name: Query endpoint returned HTTP $http_code"
      ((SERVICE_DISCOVERY_FAILED++))
    fi
  else
    echo "  ⚠️  $server_name: Query endpoint not available"
    ((SERVICE_DISCOVERY_FAILED++))
  fi
done

total_servers=$((${#MCP_SERVERS[@]}))
echo "  Discovered: $SERVICE_DISCOVERY_PASSED/$total_servers servers"
echo ""

# Step 3: Load Testing
echo "[3/3] Load Testing ($LOAD_TEST_REQUESTS requests, $CONCURRENT_REQUESTS concurrent)..."
test_url="${MCP_SERVERS[FinBot]}"

success_count=0
failure_count=0
total_response_time=0
start_time=$(date +%s.%N)

# Run load test using parallel
if command -v parallel &> /dev/null; then
  results=$(seq 1 $LOAD_TEST_REQUESTS | parallel -j $CONCURRENT_REQUESTS \
    "curl -s -w '%{time_total}\t%{http_code}\n' -o /dev/null --max-time 5 '$test_url' 2>/dev/null || echo '0\t000'")
  
  while IFS=$'\t' read -r response_time http_code; do
    if [ "$http_code" -eq 200 ]; then
      ((success_count++))
      total_response_time=$(echo "$total_response_time + $response_time" | bc)
    else
      ((failure_count++))
    fi
  done <<< "$results"
else
  # Fallback: sequential testing
  for i in $(seq 1 $LOAD_TEST_REQUESTS); do
    if result=$(curl -s -w '%{time_total}\t%{http_code}\n' -o /dev/null --max-time 5 "$test_url" 2>/dev/null); then
      response_time=$(echo "$result" | cut -f1)
      http_code=$(echo "$result" | cut -f2)
      
      if [ "$http_code" -eq 200 ]; then
        ((success_count++))
        total_response_time=$(echo "$total_response_time + $response_time" | bc)
      else
        ((failure_count++))
      fi
    else
      ((failure_count++))
    fi
  done
fi

end_time=$(date +%s.%N)
total_duration=$(echo "$end_time - $start_time" | bc)
avg_response_time=$(if [ $success_count -gt 0 ]; then echo "scale=2; ($total_response_time * 1000) / $success_count" | bc; else echo "0"; fi)
success_rate=$(echo "scale=2; ($success_count * 100) / $LOAD_TEST_REQUESTS" | bc)

echo "  Results:"
printf "    Success Rate: %.2f%% (%d/%d)\n" "$success_rate" "$success_count" "$LOAD_TEST_REQUESTS"
printf "    Avg Response Time: %.2fms\n" "$avg_response_time"
printf "    Total Duration: %.2fs\n" "$total_duration"

# Determine overall status
overall_status="PASSED"
if [ $HEALTH_CHECK_FAILED -gt 0 ] || [ "$success_rate" -lt 95 ]; then
  overall_status="FAILED"
fi

echo ""
echo "=== Summary ==="
echo "Overall Status: $overall_status"
echo "Health Checks: $HEALTH_CHECK_PASSED passed, $HEALTH_CHECK_FAILED failed"
echo "Service Discovery: $SERVICE_DISCOVERY_PASSED/$total_servers servers discovered"
echo "Load Test: ${success_rate}% success rate"

# Save results
mkdir -p reports
cat > reports/mcp-e2e-validation.json <<EOF
{
  "overall": "$overall_status",
  "healthChecks": {
    "passed": $HEALTH_CHECK_PASSED,
    "failed": $HEALTH_CHECK_FAILED
  },
  "serviceDiscovery": {
    "passed": $SERVICE_DISCOVERY_PASSED,
    "failed": $SERVICE_DISCOVERY_FAILED,
    "total": $total_servers
  },
  "loadTest": {
    "totalRequests": $LOAD_TEST_REQUESTS,
    "successCount": $success_count,
    "failureCount": $failure_count,
    "successRate": $success_rate,
    "avgResponseTime": $avg_response_time,
    "totalDuration": $total_duration
  }
}
EOF

echo ""
echo "Results saved to: reports/mcp-e2e-validation.json"

exit $(if [ "$overall_status" = "PASSED" ]; then 0; else 1; fi)

