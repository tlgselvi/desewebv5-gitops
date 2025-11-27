#!/bin/bash

# ESP32 Hardware Test Suite
# This script runs all hardware tests for ESP32 IoT firmware

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIRMWARE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_RESULTS_DIR="$FIRMWARE_DIR/test-results"
LOG_DIR="$TEST_RESULTS_DIR/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$LOG_DIR"

echo "========================================="
echo "ESP32 Hardware Test Suite"
echo "========================================="
echo ""

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${YELLOW}[TEST]${NC} Running: $test_name"
    
    if eval "$test_command" > "$LOG_DIR/${test_name}.log" 2>&1; then
        echo -e "${GREEN}[PASS]${NC} $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "  See log: $LOG_DIR/${test_name}.log"
        return 1
    fi
}

# Check if PlatformIO is installed
if ! command -v pio &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} PlatformIO is not installed or not in PATH"
    echo "Please install PlatformIO: pip install platformio"
    exit 1
fi

# Check if ESP32 is connected
echo "Checking for connected ESP32 devices..."
if ! pio device list | grep -q "ESP32"; then
    echo -e "${YELLOW}[WARN]${NC} No ESP32 device detected"
    echo "Please connect an ESP32 device and try again"
    echo ""
    echo "Continuing with tests that don't require hardware..."
    echo ""
fi

# Change to firmware directory
cd "$FIRMWARE_DIR"

# Test 1: Build Test
run_test "build_test" "pio run"

# Test 2: Upload Test (if device connected)
if pio device list | grep -q "ESP32"; then
    echo ""
    echo "ESP32 device detected. Proceeding with upload tests..."
    echo ""
    
    # Note: These tests require user interaction for physical measurements
    echo -e "${YELLOW}[INFO]${NC} Hardware tests require manual verification"
    echo ""
    
    read -p "Upload test firmware to device? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_test "upload_test" "pio run -t upload"
        
        echo ""
        echo "After firmware upload, you can run:"
        echo "  pio device monitor  # Monitor serial output"
        echo ""
    fi
else
    echo -e "${YELLOW}[SKIP]${NC} Upload test skipped (no device connected)"
fi

# Test 3: Unit Test Compilation
if [ -d "$FIRMWARE_DIR/tests" ]; then
    run_test "unit_test_compilation" "pio test --skip-upload"
else
    echo -e "${YELLOW}[SKIP]${NC} Unit tests not found"
fi

# Test 4: Code Size Check
echo ""
echo "Checking firmware size..."
FIRMWARE_SIZE=$(pio run 2>&1 | grep "RAM:" | tail -1 | awk '{print $3}')
if [ -n "$FIRMWARE_SIZE" ]; then
    echo "  Firmware size: $FIRMWARE_SIZE"
    echo "$FIRMWARE_SIZE" > "$TEST_RESULTS_DIR/firmware_size.txt"
fi

# Generate test report
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check logs in $LOG_DIR${NC}"
    exit 1
fi
