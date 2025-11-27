# DESE ESP32 IoT Firmware Development Guide

**Version:** 1.0.0  
**Date:** 2025-01-27

---

## Overview

This guide provides comprehensive instructions for developing, building, and deploying ESP32 firmware for the DESE IoT platform.

---

## Prerequisites

### Hardware
- ESP32 development board (ESP32-DevKitC recommended)
- USB cable for programming
- Sensors (pH, temperature, ORP/chlorine)
- Power supply (USB or battery)

### Software
- **PlatformIO IDE** or **VS Code** with PlatformIO extension
- **Python 3.7+** (required by PlatformIO)
- **Git** for version control

---

## Project Structure

```
firmware/esp32/
├── platformio.ini          # PlatformIO configuration
├── src/
│   ├── main.cpp            # Main firmware code
│   ├── sensors.cpp         # Sensor driver implementations
│   └── ota.cpp             # OTA update implementation
├── include/
│   ├── config.h            # Configuration constants
│   ├── sensors.h           # Sensor manager header
│   └── ota.h               # OTA update header
├── README.md               # Project documentation
└── .gitignore              # Git ignore rules
```

---

## Setup Instructions

### 1. Install PlatformIO

**VS Code Extension:**
1. Open VS Code
2. Install "PlatformIO IDE" extension
3. Restart VS Code

**Standalone:**
```bash
pip install platformio
```

### 2. Clone and Open Project

```bash
cd firmware/esp32
pio project init
```

### 3. Install Dependencies

```bash
pio lib install
```

This will install all required libraries defined in `platformio.ini`.

---

## Configuration

### WiFi Configuration

The firmware uses WiFiManager for WiFi setup. On first boot:

1. Device creates AP: `DESE-Device-AP`
2. Connect to this WiFi network
3. Open browser to `192.168.4.1`
4. Configure WiFi credentials
5. Device connects and saves credentials

### MQTT Configuration

Configure MQTT broker in `src/main.cpp` or via Preferences:

```cpp
deviceConfig.mqttBroker = "mqtt.yourdomain.com";
deviceConfig.mqttPort = 1883;
deviceConfig.mqttUsername = "your_username";
deviceConfig.mqttPassword = "your_password";
deviceConfig.useTLS = false; // Set to true for MQTTS
```

### Device Registration

Device ID is auto-generated on first boot:
- Format: `esp32-{CHIP_ID}`
- Stored in Preferences
- Can be set manually via config

---

## Building and Uploading

### Build Firmware

```bash
pio run
```

### Upload to Device

```bash
pio run -t upload
```

### Monitor Serial Output

```bash
pio device monitor
```

### Clean Build

```bash
pio run -t clean
```

---

## Sensor Integration

### Supported Sensors

- **pH Sensor:** Analog input (0-14 pH range)
- **Temperature Sensor:** DS18B20 or analog thermistor
- **ORP Sensor:** Analog input (mV range)
- **Chlorine:** Calculated from ORP

### Sensor Calibration

Calibrate sensors via MQTT command:

```json
{
  "command": "calibrate_sensor",
  "parameters": {
    "sensor_type": "ph",
    "value": 7.0,
    "measured": 6.8
  }
}
```

Or via code:

```cpp
sensorManager.calibratePH(7.0, 6.8);
```

### Adding New Sensors

1. Add sensor reading method in `sensors.cpp`
2. Update `SensorReadings` struct in `sensors.h`
3. Add to `readAll()` method
4. Update telemetry JSON format

---

## OTA Updates

### Automatic Updates

Firmware checks for updates every hour (configurable).

### Manual Update

Send command via MQTT:

```json
{
  "command": "update_firmware",
  "parameters": {
    "firmware_url": "https://yourdomain.com/firmware/esp32.bin"
  }
}
```

### Update Server Setup

Backend should provide endpoint:
- `GET /api/v1/iot/firmware/check?version={current}&device={deviceId}`
- Returns: `{ "update_available": true, "version": "1.0.1", "firmware_url": "..." }`

---

## Debugging

### Serial Monitor

```bash
pio device monitor --baud 115200
```

### Debug Logging

Enable debug mode in `platformio.ini`:

```ini
build_flags = -DDEBUG_ENABLED=1
```

### Common Issues

**WiFi Connection Fails:**
- Check WiFi credentials
- Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
- Check signal strength

**MQTT Connection Fails:**
- Verify broker URL and port
- Check credentials
- Ensure firewall allows connection
- For TLS: verify certificate

**Sensor Readings Invalid:**
- Check sensor connections
- Verify power supply
- Calibrate sensors
- Check ADC configuration

---

## Testing

### Unit Tests

```bash
pio test
```

### Hardware Testing

1. Connect sensors
2. Upload firmware
3. Monitor serial output
4. Verify MQTT messages
5. Test commands via backend

### Integration Testing

1. Connect device to test network
2. Verify telemetry transmission
3. Test command execution
4. Verify OTA updates
5. Test error recovery

---

## Deployment

### Production Build

```bash
pio run -e esp32dev
```

### Firmware Versioning

Update version in:
- `src/main.cpp`: `FIRMWARE_VERSION`
- `include/config.h`: `FIRMWARE_VERSION`

### Release Process

1. Update version number
2. Build firmware
3. Test on hardware
4. Upload to firmware server
5. Update backend firmware registry
6. Deploy OTA update

---

## Troubleshooting

### Device Not Connecting

1. Check WiFi credentials
2. Verify MQTT broker accessibility
3. Check device logs
4. Verify network configuration

### Sensor Readings Incorrect

1. Calibrate sensors
2. Check sensor connections
3. Verify power supply
4. Check ADC configuration

### OTA Update Fails

1. Verify firmware URL is accessible
2. Check available flash space
3. Verify firmware file integrity
4. Check update server logs

---

## Best Practices

1. **Always test on hardware** before deployment
2. **Use version control** for firmware code
3. **Document sensor calibration** procedures
4. **Monitor device logs** in production
5. **Implement error recovery** mechanisms
6. **Use OTA updates** for field updates
7. **Secure MQTT connections** with TLS
8. **Validate sensor data** before transmission

---

## References

- [ESP32 Arduino Documentation](https://docs.espressif.com/projects/arduino-esp32/en/latest/)
- [PlatformIO Documentation](https://docs.platformio.org/)
- [MQTT Protocol Specification](https://mqtt.org/mqtt-specification/)
- [ArduinoJson Documentation](https://arduinojson.org/)

---

**Last Updated:** 2025-01-27  
**Maintained By:** DESE Development Team

