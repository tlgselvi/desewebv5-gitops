# DESE ESP32 IoT Firmware

ESP32 firmware for DESE EA PLAN v7.0 IoT platform. This firmware enables ESP32 devices to connect to the DESE backend via MQTT protocol.

## Features

- ✅ WiFi connection management with WiFiManager
- ✅ MQTT client with TLS/SSL support
- ✅ Sensor integration (pH, chlorine, temperature)
- ✅ Remote command execution
- ✅ Configuration management
- ✅ Status reporting
- ✅ Telemetry data transmission
- ⏳ OTA (Over-The-Air) updates (planned)

## Hardware Requirements

- ESP32 development board
- Sensors (pH, chlorine, temperature)
- Power supply (USB or battery)

## Software Requirements

- PlatformIO IDE or VS Code with PlatformIO extension
- Python 3.7+ (for PlatformIO)

## Installation

1. Clone the repository and navigate to firmware directory:
```bash
cd firmware/esp32
```

2. Open the project in PlatformIO:
```bash
pio project init
```

3. Install dependencies:
```bash
pio lib install
```

4. Configure your device:
   - Edit `src/main.cpp` to set your MQTT broker details
   - Or use WiFiManager portal to configure (default AP: "DESE-Device-AP")

5. Build and upload:
```bash
pio run -t upload
```

## Configuration

The device can be configured via:
1. **WiFiManager Portal**: Connect to "DESE-Device-AP" WiFi network and configure via web portal
2. **MQTT Config Topic**: Send configuration update to `devices/{orgId}/{deviceId}/config`
3. **Preferences**: Stored in ESP32's non-volatile storage

## MQTT Topic Structure

### Topics Device Publishes To:
- `devices/{orgId}/{deviceId}/telemetry` - Sensor telemetry data
- `devices/{orgId}/{deviceId}/status` - Device status updates
- `devices/{orgId}/{deviceId}/command_response` - Command execution responses

### Topics Device Subscribes To:
- `devices/{orgId}/{deviceId}/commands` - Remote commands
- `devices/{orgId}/{deviceId}/config` - Configuration updates

## Telemetry Format

```json
{
  "device_id": "esp32-001",
  "timestamp": 1643299200,
  "organization_id": "org-123",
  "sensors": {
    "ph": 7.2,
    "chlorine": 2.5,
    "temperature": 25.5
  },
  "metadata": {
    "battery": 85,
    "signal_strength": -65,
    "firmware_version": "1.0.0"
  }
}
```

## Command Format

```json
{
  "command_id": "cmd-123",
  "device_id": "esp32-001",
  "command": "set_pump",
  "parameters": {
    "pump_id": 1,
    "state": "on",
    "duration": 3600
  },
  "timestamp": "2025-01-27T10:00:00Z"
}
```

## Development

### Building

```bash
pio run
```

### Uploading

```bash
pio run -t upload
```

### Monitoring Serial Output

```bash
pio device monitor
```

### Cleaning

```bash
pio run -t clean
```

## Environment Variables

Create a `platformio.ini` override file or use PlatformIO's environment variables for:
- MQTT broker URL
- MQTT credentials
- WiFi credentials (optional, uses WiFiManager)

## Troubleshooting

### WiFi Connection Issues
- Check WiFi credentials in WiFiManager portal
- Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Check signal strength

### MQTT Connection Issues
- Verify broker URL and port
- Check MQTT credentials
- Ensure TLS configuration matches broker settings
- Check firewall rules

### Sensor Reading Issues
- Verify sensor connections
- Check sensor power supply
- Calibrate sensors if needed

## License

Copyright (c) 2025 DESE Development Team. All rights reserved.

## Support

For issues and questions, please contact the DESE development team or create an issue in the repository.

