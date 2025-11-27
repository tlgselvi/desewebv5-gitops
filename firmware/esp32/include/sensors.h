/**
 * DESE ESP32 Sensor Manager Header
 */

#ifndef SENSORS_H
#define SENSORS_H

#include <Arduino.h>
#include <Preferences.h>

struct SensorReadings {
  float ph;
  float temperature;
  float chlorine;
  float orp;
  unsigned long timestamp;
};

class SensorManager {
public:
  SensorManager();
  void begin();
  
  // Sensor reading methods
  float readPH();
  float readTemperature();
  float readORP();
  float readChlorine();
  SensorReadings readAll();
  
  // Calibration methods
  void calibratePH(float knownPH, float measuredValue);
  void calibrateTemperature(float knownTemp, float measuredValue);
  
  // Validation and failure detection
  bool validateReadings(SensorReadings& readings);
  bool detectFailure();
  
  // Configuration
  void setReadInterval(unsigned long interval) { readInterval = interval; }
  
private:
  // Sensor pins
  int phPin;
  int tempPin;
  int orpPin;
  
  // Calibration values
  float phOffset;
  float phScale;
  float tempOffset;
  float tempScale;
  float orpOffset;
  float orpScale;
  
  // Reading cache
  SensorReadings cachedReadings;
  unsigned long lastReadTime;
  unsigned long readInterval;
  
  // Calibration persistence
  void loadCalibration();
  void saveCalibration();
};

#endif // SENSORS_H

