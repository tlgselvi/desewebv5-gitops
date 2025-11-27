#!/bin/bash

# Sensor Calibration Test Script
# This script helps with sensor calibration procedures

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIRMWARE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "========================================="
echo "ESP32 Sensor Calibration Test"
echo "========================================="
echo ""

# Check if PlatformIO is installed
if ! command -v pio &> /dev/null; then
    echo "[ERROR] PlatformIO is not installed"
    exit 1
fi

# Check if ESP32 is connected
if ! pio device list | grep -q "ESP32"; then
    echo "[ERROR] No ESP32 device detected"
    exit 1
fi

cd "$FIRMWARE_DIR"

echo "This script will guide you through sensor calibration."
echo ""
echo "Required materials:"
echo "  - pH buffer solutions (4.0, 7.0, 10.0)"
echo "  - Temperature reference (ice bath, boiling water)"
echo "  - Known TDS solution (optional)"
echo ""

read -p "Continue with calibration? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

# Upload calibration firmware
echo ""
echo "Uploading calibration firmware..."
pio run -e calibration_test -t upload

echo ""
echo "Calibration firmware uploaded successfully!"
echo ""
echo "Next steps:"
echo "1. Open serial monitor: pio device monitor"
echo "2. Follow the calibration instructions on screen"
echo "3. Enter sensor readings when prompted"
echo ""
echo "Starting serial monitor..."
sleep 2

pio device monitor
