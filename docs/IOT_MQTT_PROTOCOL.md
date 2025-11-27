# DESE IoT MQTT Protocol Documentation

**Version:** 1.0.0  
**Date:** 2025-01-27  
**Status:** Production Ready

---

## Overview

This document describes the MQTT protocol implementation for DESE EA PLAN v7.0 IoT module. The protocol enables bidirectional communication between ESP32 devices and the DESE backend.

---

## MQTT Broker Configuration

### Broker Details
- **Development:** `mqtt://mosquitto:1883` (Docker)
- **Production:** Configurable via environment variables
- **Protocol:** MQTT v3.1.1
- **TLS/SSL:** Optional (recommended for production)

### Connection Settings
- **Keepalive:** 60 seconds
- **QoS Level:** 1 (at least once delivery)
- **Retain Messages:** Disabled (except for device status)

---

## Topic Structure

All topics follow a multi-tenant structure:

```
devices/{organization_id}/{device_id}/{message_type}
```

### Topic Components

1. **Prefix:** `devices` - Fixed prefix for all device topics
2. **Organization ID:** UUID of the organization (tenant isolation)
3. **Device ID:** Unique device identifier (e.g., `esp32-001`)
4. **Message Type:** Type of message (see below)

---

## Message Types

### 1. Telemetry (`telemetry`)

**Direction:** Device → Backend  
**Topic:** `devices/{org_id}/{device_id}/telemetry`  
**QoS:** 1  
**Retain:** false

#### Payload Format

```json
{
  "device_id": "esp32-001",
  "timestamp": "2025-01-27T10:00:00Z",
  "organization_id": "org-123",
  "sensors": {
    "ph": 7.2,
    "chlorine": 2.5,
    "temperature": 25.5,
    "orp": 650,
    "tds": 1200,
    "flow_rate": 45.5
  },
  "metadata": {
    "battery": 85,
    "signal_strength": -65,
    "firmware_version": "1.0.0"
  }
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `device_id` | string | ✅ | Device unique identifier |
| `timestamp` | ISO 8601 | ✅ | Message timestamp (UTC) |
| `organization_id` | string | ✅ | Organization UUID |
| `sensors` | object | ✅ | Sensor readings |
| `sensors.ph` | float | ✅ | pH level (0-14) |
| `sensors.chlorine` | float | ✅ | Chlorine level (ppm) |
| `sensors.temperature` | float | ✅ | Temperature (°C) |
| `sensors.orp` | integer | ❌ | ORP level (mV) |
| `sensors.tds` | integer | ❌ | TDS level (ppm) |
| `sensors.flow_rate` | float | ❌ | Flow rate (L/min) |
| `metadata` | object | ✅ | Device metadata |
| `metadata.battery` | integer | ❌ | Battery level (0-100%) |
| `metadata.signal_strength` | integer | ❌ | WiFi RSSI (dBm) |
| `metadata.firmware_version` | string | ✅ | Firmware version |

---

### 2. Commands (`commands`)

**Direction:** Backend → Device  
**Topic:** `devices/{org_id}/{device_id}/commands`  
**QoS:** 1  
**Retain:** false

#### Payload Format

```json
{
  "command_id": "cmd-1234567890-abc",
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

#### Supported Commands

| Command | Description | Parameters |
|---------|-------------|------------|
| `set_pump` | Control pump state | `pump_id` (int), `state` ("on"/"off"), `duration` (int, seconds) |
| `set_ph_target` | Set pH target level | `target_ph` (float) |
| `set_chlorine_target` | Set chlorine target | `target_chlorine` (float) |
| `reboot` | Reboot device | None |
| `reset_config` | Reset to default config | None |
| `calibrate_sensor` | Calibrate sensor | `sensor_type` (string), `value` (float) |

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `command_id` | string | ✅ | Unique command identifier |
| `device_id` | string | ✅ | Target device ID |
| `command` | string | ✅ | Command name |
| `parameters` | object | ❌ | Command-specific parameters |
| `timestamp` | ISO 8601 | ✅ | Command timestamp |

---

### 3. Command Response (`command_response`)

**Direction:** Device → Backend  
**Topic:** `devices/{org_id}/{device_id}/command_response`  
**QoS:** 1  
**Retain:** false

#### Payload Format

```json
{
  "command_id": "cmd-1234567890-abc",
  "success": true,
  "response": {
    "pump_state": "on",
    "pump_duration": 3600
  },
  "error": null,
  "timestamp": "2025-01-27T10:00:05Z"
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `command_id` | string | ✅ | Original command ID |
| `success` | boolean | ✅ | Command execution success |
| `response` | object | ❌ | Command response data |
| `error` | string | ❌ | Error message if failed |
| `timestamp` | ISO 8601 | ✅ | Response timestamp |

---

### 4. Status (`status`)

**Direction:** Device → Backend  
**Topic:** `devices/{org_id}/{device_id}/status`  
**QoS:** 1  
**Retain:** true

#### Payload Format

```json
{
  "status": "online",
  "battery": 85,
  "signal_strength": -65,
  "firmware_version": "1.0.0",
  "timestamp": "2025-01-27T10:00:00Z"
}
```

#### Status Values

- `online` - Device is online and operational
- `offline` - Device is offline
- `error` - Device has an error
- `maintenance` - Device is in maintenance mode

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | ✅ | Device status |
| `battery` | integer | ❌ | Battery level (0-100%) |
| `signal_strength` | integer | ❌ | WiFi RSSI (dBm) |
| `firmware_version` | string | ✅ | Firmware version |
| `timestamp` | ISO 8601 | ✅ | Status timestamp |

---

### 5. Configuration Update (`config`)

**Direction:** Backend → Device  
**Topic:** `devices/{org_id}/{device_id}/config`  
**QoS:** 1  
**Retain:** false

#### Payload Format

```json
{
  "device_id": "esp32-001",
  "config": {
    "telemetry_interval": 30000,
    "mqtt_keepalive": 60,
    "sensor_calibration": {
      "ph": {
        "offset": 0.2,
        "scale": 1.0
      }
    }
  },
  "timestamp": "2025-01-27T10:00:00Z"
}
```

#### Configurable Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `telemetry_interval` | integer | Telemetry transmission interval (ms) |
| `mqtt_keepalive` | integer | MQTT keepalive interval (seconds) |
| `sensor_calibration` | object | Sensor calibration values |
| `alert_thresholds` | object | Alert threshold values |

---

### 6. Alerts (`alert`)

**Direction:** Device → Backend  
**Topic:** `devices/{org_id}/{device_id}/alert`  
**QoS:** 1  
**Retain:** false

#### Payload Format

```json
{
  "severity": "warning",
  "message": "pH level below threshold",
  "sensor": "ph",
  "value": 6.8,
  "threshold": 7.0,
  "timestamp": "2025-01-27T10:00:00Z"
}
```

#### Severity Levels

- `info` - Informational alert
- `warning` - Warning condition
- `critical` - Critical condition requiring attention

---

## Multi-Tenant Topic Isolation

The topic structure ensures tenant isolation by including the organization ID in every topic. Devices should:

1. Subscribe only to topics for their organization
2. Publish only to topics for their organization
3. Validate organization ID in all messages

### Example Topic Patterns

**Device Subscriptions:**
```
devices/org-123/esp32-001/commands
devices/org-123/esp32-001/config
```

**Device Publications:**
```
devices/org-123/esp32-001/telemetry
devices/org-123/esp32-001/status
devices/org-123/esp32-001/command_response
devices/org-123/esp32-001/alert
```

---

## Message Flow Examples

### 1. Telemetry Transmission

```
Device → MQTT Broker → Backend
Topic: devices/{org_id}/{device_id}/telemetry
```

### 2. Remote Command Execution

```
Backend → MQTT Broker → Device (commands)
Device → MQTT Broker → Backend (command_response)
```

### 3. Status Updates

```
Device → MQTT Broker → Backend
Topic: devices/{org_id}/{device_id}/status
(Retained message for last known status)
```

---

## Error Handling

### Connection Errors

If a device loses connection:
1. Device should attempt reconnection with exponential backoff
2. Queue telemetry data locally if possible
3. Send status update immediately upon reconnection

### Command Timeouts

Commands have a default timeout of 30 seconds. If no response is received:
1. Backend marks command as `timeout`
2. Device should still send response if command was processed
3. Backend can retry command if needed

### Message Validation

Both device and backend should:
1. Validate JSON schema before processing
2. Validate required fields
3. Log and discard invalid messages

---

## Security Considerations

### Authentication

- Use MQTT username/password authentication
- Consider certificate-based authentication for production
- Use TLS/SSL encryption for all connections

### Authorization

- Implement ACL (Access Control List) rules on broker
- Devices should only access their own topics
- Backend validates organization ID in all messages

### Data Privacy

- Sensitive data should be encrypted at application level if needed
- Use secure MQTT connections (MQTTS)
- Implement rate limiting to prevent abuse

---

## Performance Considerations

### Message Size

- Keep telemetry messages under 1KB
- Use compression for larger payloads if needed
- Batch multiple sensor readings when possible

### Publish Frequency

- Telemetry: Every 30 seconds (configurable)
- Status: Every 60 seconds
- Alerts: On-demand

### QoS Levels

- Telemetry: QoS 1 (at least once)
- Commands: QoS 1 (at least once)
- Status: QoS 1 with retain (for offline recovery)

---

## Testing

### Test Scenarios

1. **Normal Operation:**
   - Device sends telemetry regularly
   - Backend sends commands
   - Device responds to commands

2. **Connection Loss:**
   - Device reconnects automatically
   - Queued messages are sent
   - Status updates on reconnection

3. **Invalid Messages:**
   - Invalid JSON is rejected
   - Missing fields are handled gracefully
   - Invalid commands return error responses

---

## References

- [MQTT Specification v3.1.1](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html)
- [ESP32 Arduino Documentation](https://docs.espressif.com/projects/arduino-esp32/en/latest/)
- [ArduinoJson Documentation](https://arduinojson.org/)

---

**Last Updated:** 2025-01-27  
**Maintained By:** DESE Development Team

