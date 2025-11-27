/**
 * DESE EA PLAN v7.0 - ESP32 IoT Firmware
 * 
 * Firmware for ESP32 devices connected to DESE IoT platform via MQTT
 * Features:
 * - WiFi connection management
 * - MQTT client with TLS support
 * - Sensor integration (pH, chlorine, temperature)
 * - OTA updates
 * - Device management and remote commands
 * 
 * Author: DESE Development Team
 * Version: 1.0.0
 * Date: 2025-01-27
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <time.h>
#include "sensors.h"
#include "ota.h"
#include "config.h"

// Configuration
#define FIRMWARE_VERSION "1.0.0"
#define DEVICE_TYPE "pool_controller"
#define MQTT_KEEPALIVE 60
#define TELEMETRY_INTERVAL 30000 // 30 seconds
#define STATUS_INTERVAL 60000    // 60 seconds

// WiFi Manager
WiFiManager wifiManager;

// MQTT Client
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// Preferences (Non-volatile storage)
Preferences preferences;

// Device configuration
struct DeviceConfig {
  char deviceId[64];
  char organizationId[64];
  char mqttBroker[128];
  int mqttPort;
  char mqttUsername[64];
  char mqttPassword[64];
  bool useTLS;
  int telemetryInterval;
  bool initialized;
};

DeviceConfig deviceConfig;

// Device state
struct DeviceState {
  bool wifiConnected;
  bool mqttConnected;
  unsigned long lastTelemetry;
  unsigned long lastStatus;
  int reconnectAttempts;
};

DeviceState deviceState;

// Sensor Manager
SensorManager sensorManager;

// OTA Update Manager
OTAUpdate otaUpdate;

/**
 * Initialize device configuration from preferences
 */
void loadConfig() {
  preferences.begin("dese", false);
  
  deviceConfig.initialized = preferences.getBool("init", false);
  
  if (deviceConfig.initialized) {
    preferences.getString("deviceId", deviceConfig.deviceId, sizeof(deviceConfig.deviceId));
    preferences.getString("orgId", deviceConfig.organizationId, sizeof(deviceConfig.organizationId));
    preferences.getString("mqttBroker", deviceConfig.mqttBroker, sizeof(deviceConfig.mqttBroker));
    deviceConfig.mqttPort = preferences.getInt("mqttPort", 1883);
    preferences.getString("mqttUser", deviceConfig.mqttUsername, sizeof(deviceConfig.mqttUsername));
    preferences.getString("mqttPass", deviceConfig.mqttPassword, sizeof(deviceConfig.mqttPassword));
    deviceConfig.useTLS = preferences.getBool("useTLS", false);
    deviceConfig.telemetryInterval = preferences.getInt("telInt", TELEMETRY_INTERVAL);
  } else {
    // Default configuration
    strcpy(deviceConfig.mqttBroker, "mqtt.yourdomain.com");
    deviceConfig.mqttPort = 1883;
    deviceConfig.useTLS = false;
    deviceConfig.telemetryInterval = TELEMETRY_INTERVAL;
  }
  
  preferences.end();
}

/**
 * Save device configuration to preferences
 */
void saveConfig() {
  preferences.begin("dese", false);
  
  preferences.putBool("init", true);
  preferences.putString("deviceId", deviceConfig.deviceId);
  preferences.putString("orgId", deviceConfig.organizationId);
  preferences.putString("mqttBroker", deviceConfig.mqttBroker);
  preferences.putInt("mqttPort", deviceConfig.mqttPort);
  preferences.putString("mqttUser", deviceConfig.mqttUsername);
  preferences.putString("mqttPass", deviceConfig.mqttPassword);
  preferences.putBool("useTLS", deviceConfig.useTLS);
  preferences.putInt("telInt", deviceConfig.telemetryInterval);
  
  preferences.end();
}

/**
 * Initialize WiFi connection
 */
void setupWiFi() {
  Serial.println("Connecting to WiFi...");
  
  // WiFiManager configuration
  wifiManager.setConfigPortalTimeout(180);
  wifiManager.setAPStaticIPConfig(IPAddress(192,168,4,1), IPAddress(192,168,4,1), IPAddress(255,255,255,0));
  
  if (!wifiManager.autoConnect("DESE-Device-AP")) {
    Serial.println("Failed to connect to WiFi, restarting...");
    delay(3000);
    ESP.restart();
  }
  
  deviceState.wifiConnected = true;
  Serial.print("WiFi connected! IP: ");
  Serial.println(WiFi.localIP());
}

/**
 * MQTT callback for incoming messages
 */
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  // Parse JSON payload
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.print("JSON parsing failed: ");
    Serial.println(error.c_str());
    return;
  }
  
  // Extract topic parts: devices/{orgId}/{deviceId}/{type}
  String topicStr = String(topic);
  int firstSlash = topicStr.indexOf('/');
  int secondSlash = topicStr.indexOf('/', firstSlash + 1);
  int thirdSlash = topicStr.indexOf('/', secondSlash + 1);
  int fourthSlash = topicStr.indexOf('/', thirdSlash + 1);
  
  if (fourthSlash == -1) return;
  
  String type = topicStr.substring(fourthSlash + 1);
  
  if (type == "commands") {
    handleCommand(doc);
  } else if (type == "config") {
    handleConfigUpdate(doc);
  }
}

/**
 * Handle incoming MQTT command
 */
void handleCommand(JsonDocument& doc) {
  String commandId = doc["command_id"] | "";
  String command = doc["command"] | "";
  JsonObject params = doc["parameters"] | doc.createNestedObject();
  
  Serial.print("Command received: ");
  Serial.println(command);
  
  bool success = false;
  
  // Execute command based on type
  if (command == "set_pump") {
    // Implement pump control
    int pumpId = params["pump_id"] | 1;
    String state = params["state"] | "off";
    // TODO: Implement actual pump control
    success = true;
  } else if (command == "set_ph_target") {
    float targetPH = params["target_ph"] | 7.0;
    // TODO: Implement pH target setting
    success = true;
  } else if (command == "calibrate_sensor") {
    String sensorType = params["sensor_type"] | "";
    float knownValue = params["value"] | 0.0;
    float measuredValue = params["measured"] | 0.0;
    
    if (sensorType == "ph") {
      sensorManager.calibratePH(knownValue, measuredValue);
      success = true;
    } else if (sensorType == "temperature") {
      sensorManager.calibrateTemperature(knownValue, measuredValue);
      success = true;
    }
  } else if (command == "reboot") {
    success = true;
    delay(1000);
    ESP.restart();
  } else if (command == "update_firmware") {
    String firmwareUrl = params["firmware_url"] | "";
    if (firmwareUrl.length() > 0) {
      success = otaUpdate.forceUpdate(firmwareUrl);
    }
  }
  
  // Send command response
  sendCommandResponse(commandId, success);
}

/**
 * Handle configuration update
 */
void handleConfigUpdate(JsonDocument& doc) {
  JsonObject config = doc["config"] | doc.createNestedObject();
  
  if (config.containsKey("telemetry_interval")) {
    deviceConfig.telemetryInterval = config["telemetry_interval"];
    saveConfig();
  }
  
  Serial.println("Configuration updated");
}

/**
 * Send command response via MQTT
 */
void sendCommandResponse(String commandId, bool success) {
  String topic = String("devices/") + deviceConfig.organizationId + "/" + 
                 deviceConfig.deviceId + "/command_response";
  
  StaticJsonDocument<256> doc;
  doc["command_id"] = commandId;
  doc["success"] = success;
  doc["timestamp"] = time(nullptr);
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  mqttClient.publish(topic.c_str(), buffer);
}

/**
 * Reconnect to MQTT broker
 */
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    String clientId = "ESP32-" + String(deviceConfig.deviceId);
    
    if (mqttClient.connect(clientId.c_str(), deviceConfig.mqttUsername, deviceConfig.mqttPassword)) {
      Serial.println("connected");
      
      // Subscribe to command and config topics
      String commandsTopic = "devices/" + String(deviceConfig.organizationId) + "/" + 
                             deviceConfig.deviceId + "/commands";
      String configTopic = "devices/" + String(deviceConfig.organizationId) + "/" + 
                           deviceConfig.deviceId + "/config";
      
      mqttClient.subscribe(commandsTopic.c_str());
      mqttClient.subscribe(configTopic.c_str());
      
      deviceState.mqttConnected = true;
      deviceState.reconnectAttempts = 0;
      
      // Send status update
      sendStatusUpdate();
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" try again in 5 seconds");
      deviceState.reconnectAttempts++;
      delay(5000);
    }
  }
}

/**
 * Send telemetry data via MQTT
 */
void sendTelemetry() {
  String topic = String("devices/") + deviceConfig.organizationId + "/" + 
                 deviceConfig.deviceId + "/telemetry";
  
  // Read sensors
  SensorReadings readings = sensorManager.readAll();
  
  // Check for sensor failures
  if (sensorManager.detectFailure()) {
    // Send alert
    String alertTopic = String("devices/") + deviceConfig.organizationId + "/" + 
                        deviceConfig.deviceId + "/alert";
    StaticJsonDocument<256> alertDoc;
    alertDoc["severity"] = "warning";
    alertDoc["message"] = "Sensor failure detected";
    alertDoc["timestamp"] = time(nullptr);
    
    char alertBuffer[256];
    serializeJson(alertDoc, alertBuffer);
    mqttClient.publish(alertTopic.c_str(), alertBuffer);
  }
  
  // Get battery level (placeholder - implement actual battery reading)
  int batteryLevel = 85; // TODO: Read from battery sensor
  
  StaticJsonDocument<512> doc;
  doc["device_id"] = deviceConfig.deviceId;
  doc["timestamp"] = time(nullptr);
  doc["organization_id"] = deviceConfig.organizationId;
  
  JsonObject sensors = doc.createNestedObject("sensors");
  sensors["ph"] = readings.ph;
  sensors["chlorine"] = readings.chlorine;
  sensors["temperature"] = readings.temperature;
  sensors["orp"] = readings.orp;
  
  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["battery"] = batteryLevel;
  metadata["signal_strength"] = WiFi.RSSI();
  metadata["firmware_version"] = FIRMWARE_VERSION;
  
  char buffer[512];
  serializeJson(doc, buffer);
  
  mqttClient.publish(topic.c_str(), buffer);
  
  Serial.println("Telemetry sent");
}

/**
 * Send device status update
 */
void sendStatusUpdate() {
  String topic = String("devices/") + deviceConfig.organizationId + "/" + 
                 deviceConfig.deviceId + "/status";
  
  // Get battery level (placeholder)
  int batteryLevel = 85; // TODO: Read from battery sensor
  
  StaticJsonDocument<256> doc;
  doc["status"] = "online";
  doc["battery"] = batteryLevel;
  doc["signal_strength"] = WiFi.RSSI();
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["timestamp"] = time(nullptr);
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  mqttClient.publish(topic.c_str(), buffer);
}

/**
 * Setup function
 */
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=== DESE ESP32 IoT Firmware ===");
  Serial.print("Version: ");
  Serial.println(FIRMWARE_VERSION);
  
  // Load configuration
  loadConfig();
  
  // Generate device ID if not set
  if (!deviceConfig.initialized) {
    uint64_t chipid = ESP.getEfuseMac();
    sprintf(deviceConfig.deviceId, "esp32-%08X", (uint32_t)chipid);
    Serial.print("Generated Device ID: ");
    Serial.println(deviceConfig.deviceId);
    saveConfig();
  }
  
  // Setup WiFi
  setupWiFi();
  
  // Initialize sensors
  sensorManager.begin();
  
  // Setup OTA
  String otaServer = String(deviceConfig.mqttBroker);
  otaServer.replace("mqtt://", "http://");
  otaUpdate.begin(otaServer, "/api/v1/iot/firmware/check");
  otaUpdate.setDeviceId(deviceConfig.deviceId);
  
  // Setup MQTT
  if (deviceConfig.useTLS) {
    espClient.setInsecure(); // For self-signed certificates
    mqttClient.setServer(deviceConfig.mqttBroker, deviceConfig.mqttPort);
  } else {
    mqttClient.setServer(deviceConfig.mqttBroker, deviceConfig.mqttPort);
  }
  mqttClient.setCallback(mqttCallback);
  
  // Setup time (for timestamps)
  configTime(0, 0, NTP_SERVER1, NTP_SERVER2);
  
  deviceState.lastTelemetry = 0;
  deviceState.lastStatus = 0;
  
  Serial.println("Setup complete!");
}

/**
 * Main loop
 */
void loop() {
  // Maintain WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    deviceState.wifiConnected = false;
    setupWiFi();
  }
  
  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    deviceState.mqttConnected = false;
    reconnectMQTT();
  }
  mqttClient.loop();
  
  // Send telemetry periodically
  unsigned long now = millis();
  if (now - deviceState.lastTelemetry >= deviceConfig.telemetryInterval) {
    if (mqttClient.connected()) {
      sendTelemetry();
      deviceState.lastTelemetry = now;
    }
  }
  
  // Send status update periodically
  if (now - deviceState.lastStatus >= STATUS_INTERVAL) {
    if (mqttClient.connected()) {
      sendStatusUpdate();
      deviceState.lastStatus = now;
    }
  }
  
  // Check for OTA updates periodically
  otaUpdate.checkForUpdate();
  
  delay(100);
}
