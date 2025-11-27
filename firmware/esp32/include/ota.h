/**
 * DESE ESP32 OTA Update Header
 */

#ifndef OTA_H
#define OTA_H

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Update.h>
#include "config.h"

class OTAUpdate {
public:
  OTAUpdate();
  void begin(String serverUrl, String path);
  bool checkForUpdate();
  bool performUpdate(String firmwareUrl);
  bool forceUpdate(String firmwareUrl);
  
  void setDeviceId(String id);
  void setCheckInterval(unsigned long interval);
  
private:
  String updateServer;
  String updatePath;
  String currentVersion;
  String deviceId;
  unsigned long checkInterval;
  unsigned long lastCheckTime;
};

#endif // OTA_H

