/**
 * DESE ESP32 OTA (Over-The-Air) Update Implementation
 */

#include "ota.h"
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Update.h>
#include <ArduinoJson.h>

OTAUpdate::OTAUpdate() {
  updateServer = "";
  updatePath = "/firmware/update";
  currentVersion = FIRMWARE_VERSION;
  checkInterval = 3600000; // 1 hour default
  lastCheckTime = 0;
}

void OTAUpdate::begin(String serverUrl, String path) {
  updateServer = serverUrl;
  updatePath = path;
  
  Serial.println("OTA Update Manager initialized");
  Serial.print("Current firmware version: ");
  Serial.println(currentVersion);
}

bool OTAUpdate::checkForUpdate() {
  if (updateServer.length() == 0) {
    return false;
  }
  
  unsigned long now = millis();
  if (now - lastCheckTime < checkInterval) {
    return false; // Not time to check yet
  }
  
  lastCheckTime = now;
  
  HTTPClient http;
  String url = updateServer + updatePath + "?version=" + currentVersion + "&device=" + deviceId;
  
  http.begin(url);
  http.setTimeout(10000); // 10 second timeout
  
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    
    // Parse JSON response
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error && doc.containsKey("update_available") && doc["update_available"] == true) {
      String newVersion = doc["version"] | "";
      String firmwareUrl = doc["firmware_url"] | "";
      
      Serial.print("Update available: ");
      Serial.println(newVersion);
      
      http.end();
      return performUpdate(firmwareUrl);
    }
  }
  
  http.end();
  return false;
}

bool OTAUpdate::performUpdate(String firmwareUrl) {
  Serial.println("Starting OTA update...");
  Serial.print("Firmware URL: ");
  Serial.println(firmwareUrl);
  
  HTTPClient http;
  http.begin(firmwareUrl);
  http.setTimeout(30000); // 30 second timeout
  
  int httpCode = http.GET();
  
  if (httpCode != HTTP_CODE_OK) {
    Serial.print("Failed to download firmware. HTTP code: ");
    Serial.println(httpCode);
    http.end();
    return false;
  }
  
  int contentLength = http.getSize();
  if (contentLength <= 0) {
    Serial.println("Invalid content length");
    http.end();
    return false;
  }
  
  Serial.print("Firmware size: ");
  Serial.print(contentLength);
  Serial.println(" bytes");
  
  // Check if enough space available
  if (contentLength > (ESP.getFreeSketchSpace() - 0x1000)) {
    Serial.println("Not enough space for update");
    http.end();
    return false;
  }
  
  // Begin update
  if (!Update.begin(contentLength)) {
    Serial.print("Update begin failed: ");
    Serial.println(Update.errorString());
    http.end();
    return false;
  }
  
  // Write firmware data
  WiFiClient* stream = http.getStreamPtr();
  size_t written = Update.writeStream(*stream);
  
  if (written != contentLength) {
    Serial.print("Update write failed. Written: ");
    Serial.print(written);
    Serial.print(" / ");
    Serial.println(contentLength);
    Update.abort();
    http.end();
    return false;
  }
  
  // End update
  if (!Update.end()) {
    Serial.print("Update end failed: ");
    Serial.println(Update.errorString());
    http.end();
    return false;
  }
  
  if (!Update.isFinished()) {
    Serial.println("Update not finished");
    Update.abort();
    http.end();
    return false;
  }
  
  Serial.println("OTA update successful! Rebooting...");
  http.end();
  
  delay(1000);
  ESP.restart();
  
  return true;
}

void OTAUpdate::setDeviceId(String id) {
  deviceId = id;
}

void OTAUpdate::setCheckInterval(unsigned long interval) {
  checkInterval = interval;
}

bool OTAUpdate::forceUpdate(String firmwareUrl) {
  return performUpdate(firmwareUrl);
}

