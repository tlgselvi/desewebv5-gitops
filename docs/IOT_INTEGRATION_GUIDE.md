# IoT Integration Guide - DESE EA PLAN v7.0

**Version:** 7.0.0  
**Last Updated:** 2025-01-27

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [MQTT Protocol](#mqtt-protocol)
3. [ESP32 Firmware](#esp32-firmware)
4. [Device Registration](#device-registration)
5. [Telemetry Data Format](#telemetry-data-format)
6. [Alerts & Automation](#alerts--automation)
7. [Testing with Simulator](#testing-with-simulator)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The DESE EA PLAN v7.0 IoT system uses **MQTT** (Message Queuing Telemetry Transport) for device communication. Devices (ESP32, sensors, controllers) publish telemetry data to an MQTT broker, and the backend subscribes to these topics to process and store the data.

### Architecture

```
ESP32 Device → MQTT Broker (Mosquitto) → Backend (MQTT Client) → PostgreSQL
```

### Components

- **MQTT Broker:** Mosquitto (Docker container)
- **Backend MQTT Client:** `src/services/iot/mqtt-client.ts`
- **Database Schema:** `src/db/schema/iot.ts`
- **API Endpoints:** `src/modules/iot/`

---

## MQTT Protocol

### Broker Configuration

**Default URL:** `mqtt://mosquitto:1883` (Docker network)  
**Public URL:** `mqtt://localhost:1883` (Development)

### Topic Structure

All topics follow this pattern:

```
devices/{organizationId}/{deviceId}/{type}
```

**Types:**
- `telemetry` - Sensor readings (temperature, pH, etc.)
- `alert` - Device alerts (critical, warning, info)
- `status` - Device status updates (online, offline, error)

### Example Topics

```
devices/org-123/dev-001/telemetry
devices/org-123/dev-001/alert
devices/org-123/dev-001/status
```

### Message Format

All messages must be **JSON**:

```json
{
  "temperature": 25.5,
  "ph": 7.4,
  "orp": 700,
  "tds": 450,
  "flowRate": 12.5,
  "timestamp": "2025-01-27T10:00:00Z"
}
```

---

## ESP32 Firmware

### Basic Setup

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker
const char* mqtt_server = "YOUR_MQTT_BROKER_IP";
const int mqtt_port = 1883;

// Device info
const char* organizationId = "org-123";
const char* deviceId = "dev-001";
const char* deviceType = "pool_controller";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  
  // Connect to MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  if (client.connect(deviceId)) {
    Serial.println("MQTT connected");
    publishStatus("online");
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Publish telemetry every 5 seconds
  static unsigned long lastTelemetry = 0;
  if (millis() - lastTelemetry > 5000) {
    publishTelemetry();
    lastTelemetry = millis();
  }
}

void publishTelemetry() {
  // Read sensors
  float temperature = readTemperature();
  float ph = readPH();
  int orp = readORP();
  int tds = readTDS();
  float flowRate = readFlowRate();
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["temperature"] = temperature;
  doc["ph"] = ph;
  doc["orp"] = orp;
  doc["tds"] = tds;
  doc["flowRate"] = flowRate;
  doc["timestamp"] = getISOTimestamp();
  
  // Publish to topic
  char topic[128];
  snprintf(topic, sizeof(topic), "devices/%s/%s/telemetry", organizationId, deviceId);
  
  char payload[256];
  serializeJson(doc, payload);
  
  client.publish(topic, payload);
  Serial.printf("Published: %s -> %s\n", topic, payload);
}

void publishStatus(const char* status) {
  char topic[128];
  snprintf(topic, sizeof(topic), "devices/%s/%s/status", organizationId, deviceId);
  
  StaticJsonDocument<64> doc;
  doc["status"] = status;
  doc["timestamp"] = getISOTimestamp();
  
  char payload[128];
  serializeJson(doc, payload);
  
  client.publish(topic, payload);
}

void publishAlert(const char* severity, const char* message) {
  char topic[128];
  snprintf(topic, sizeof(topic), "devices/%s/%s/alert", organizationId, deviceId);
  
  StaticJsonDocument<256> doc;
  doc["severity"] = severity; // "info", "warning", "critical"
  doc["message"] = message;
  doc["timestamp"] = getISOTimestamp();
  
  char payload[256];
  serializeJson(doc, payload);
  
  client.publish(topic, payload);
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect(deviceId)) {
      Serial.println("MQTT reconnected");
      publishStatus("online");
    } else {
      delay(5000);
    }
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  // Handle incoming commands (future feature)
  Serial.printf("Message received: %s\n", topic);
}
```

### Required Libraries

```cpp
// platformio.ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps = 
    knolleary/PubSubClient@^2.8
    bblanchon/ArduinoJson@^6.21.0
```

---

## Device Registration

### 1. Register Device via API

```bash
POST /api/v1/iot/devices
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Main Pool Controller",
  "serialNumber": "ESP32-001",
  "type": "pool_controller",
  "model": "ESP32-WROOM-32",
  "firmwareVersion": "1.0.0",
  "config": {
    "telemetryInterval": 5000,
    "mqttTopic": "devices/org-123/dev-001"
  }
}
```

### 2. Update Firmware with Device ID

After registration, update your ESP32 firmware with the returned `deviceId` and `organizationId`:

```cpp
const char* organizationId = "org-123"; // From API response
const char* deviceId = "dev-001"; // From API response
```

---

## Telemetry Data Format

### Pool Controller Telemetry

```json
{
  "temperature": 25.5,      // °C (decimal, precision: 2)
  "ph": 7.4,                // pH (decimal, precision: 2)
  "orp": 700,               // mV (integer)
  "tds": 450,               // ppm (integer)
  "flowRate": 12.5,         // L/min (decimal, precision: 2)
  "timestamp": "2025-01-27T10:00:00Z"
}
```

### Sensor Hub Telemetry

```json
{
  "temperature": 24.2,
  "humidity": 65.5,
  "pressure": 1013.25,
  "data": {
    "sensor1": 123,
    "sensor2": 456
  },
  "timestamp": "2025-01-27T10:00:00Z"
}
```

### Custom Data Fields

For custom sensors, use the `data` JSONB field:

```json
{
  "temperature": 25.0,
  "data": {
    "customSensor1": 123,
    "customSensor2": "value",
    "nested": {
      "field": "value"
    }
  },
  "timestamp": "2025-01-27T10:00:00Z"
}
```

---

## Alerts & Automation

### Publishing Alerts

```cpp
// Critical alert
publishAlert("critical", "pH level too high: 8.5");

// Warning alert
publishAlert("warning", "Temperature below threshold: 20°C");

// Info alert
publishAlert("info", "Maintenance scheduled for tomorrow");
```

### Automation Rules

Create automation rules via API:

```bash
POST /api/v1/iot/rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceId": "dev-001",
  "name": "Auto pH Correction",
  "condition": "ph > 7.6",
  "action": "activate_pump_ph_minus",
  "isActive": true
}
```

**Supported Conditions:**
- `ph > 7.6` - pH above threshold
- `ph < 7.2` - pH below threshold
- `temperature > 30` - Temperature above threshold
- `temperature < 20` - Temperature below threshold
- `orp < 650` - ORP below threshold

**Supported Actions:**
- `activate_pump_ph_minus` - Activate pH minus pump
- `activate_pump_ph_plus` - Activate pH plus pump
- `activate_chlorine_doser` - Activate chlorine doser
- `send_alert` - Send alert notification

---

## Testing with Simulator

### Run IoT Simulator

```bash
# Set environment variables
export MQTT_BROKER_URL=mqtt://localhost:1883
export MOCK_ORG_ID=org-123

# Run simulator
pnpm tsx scripts/iot-simulator.ts
```

The simulator will:
- Connect to MQTT broker
- Publish telemetry every 5 seconds
- Simulate 2 devices (pool_controller, sensor_hub)

### Simulator Output

```
Connected to MQTT Broker
Published to devices/org-123/dev-001/telemetry: {"temperature":"24.5","ph":"7.3","orp":675,"tds":425,"flowRate":"12.2","timestamp":"2025-01-27T10:00:00Z"}
Published to devices/org-123/dev-002/telemetry: {"temperature":"25.1","ph":"7.5","orp":700,"tds":450,"flowRate":"12.8","timestamp":"2025-01-27T10:00:05Z"}
```

---

## Troubleshooting

### Device Not Appearing in Dashboard

1. **Check MQTT Connection:**
   ```bash
   # Test MQTT broker
   mosquitto_pub -h localhost -p 1883 -t "test/topic" -m "test message"
   mosquitto_sub -h localhost -p 1883 -t "test/topic"
   ```

2. **Check Topic Format:**
   - Ensure topic follows: `devices/{orgId}/{deviceId}/telemetry`
   - Verify `organizationId` and `deviceId` match database

3. **Check Backend Logs:**
   ```bash
   docker compose logs -f app | grep MQTT
   ```

### Telemetry Not Stored

1. **Check Database Connection:**
   ```bash
   docker compose exec db psql -U dese -d dese_ea_plan_v5 -c "SELECT COUNT(*) FROM telemetry;"
   ```

2. **Check RLS Policies:**
   - Ensure `organizationId` is set correctly
   - Verify RLS policies are active

3. **Check Backend MQTT Client:**
   ```bash
   # Check if MQTT client is connected
   docker compose logs app | grep "MQTT Broker Connected"
   ```

### ESP32 Connection Issues

1. **WiFi Connection:**
   ```cpp
   // Add debug output
   Serial.println(WiFi.status());
   Serial.println(WiFi.localIP());
   ```

2. **MQTT Connection:**
   ```cpp
   // Check connection state
   if (!client.connected()) {
     Serial.println("MQTT disconnected");
     reconnect();
   }
   ```

3. **Network Issues:**
   - Ensure ESP32 and MQTT broker are on same network
   - Check firewall rules
   - Verify MQTT broker port (1883) is open

---

## Best Practices

### 1. **Error Handling**

Always handle connection failures gracefully:

```cpp
void publishTelemetry() {
  if (!client.connected()) {
    reconnect();
    return;
  }
  
  // ... publish telemetry
}
```

### 2. **Timestamp Format**

Always use ISO 8601 format:

```cpp
String getISOTimestamp() {
  time_t now = time(nullptr);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  
  char buffer[32];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}
```

### 3. **Data Validation**

Validate sensor readings before publishing:

```cpp
float readPH() {
  float ph = analogRead(PH_PIN) * 3.3 / 4095.0;
  // Validate range
  if (ph < 0 || ph > 14) {
    publishAlert("warning", "Invalid pH reading");
    return 7.0; // Default safe value
  }
  return ph;
}
```

### 4. **Power Management**

For battery-powered devices, implement sleep mode:

```cpp
void deepSleep(int seconds) {
  esp_sleep_enable_timer_wakeup(seconds * 1000000ULL);
  esp_deep_sleep_start();
}
```

---

## API Reference

### Device Management

- `GET /api/v1/iot/devices` - List devices
- `POST /api/v1/iot/devices` - Register device
- `GET /api/v1/iot/devices/:id` - Get device details
- `PUT /api/v1/iot/devices/:id` - Update device
- `DELETE /api/v1/iot/devices/:id` - Delete device

### Telemetry

- `GET /api/v1/iot/devices/:id/telemetry` - Get telemetry history
- `GET /api/v1/iot/devices/:id/telemetry/latest` - Get latest telemetry

### Alerts

- `GET /api/v1/iot/devices/:id/alerts` - Get device alerts
- `POST /api/v1/iot/devices/:id/alerts/:id/resolve` - Resolve alert

### Automation

- `GET /api/v1/iot/rules` - List automation rules
- `POST /api/v1/iot/rules` - Create rule
- `PUT /api/v1/iot/rules/:id` - Update rule
- `DELETE /api/v1/iot/rules/:id` - Delete rule

---

## Questions?

- Check `src/services/iot/mqtt-client.ts` for backend implementation
- See `src/db/schema/iot.ts` for database schema
- Review `scripts/iot-simulator.ts` for testing examples

