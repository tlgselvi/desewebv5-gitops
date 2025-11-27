/**
 * DESE ESP32 Sensor Drivers
 * 
 * Sensor driver implementations for pH, chlorine, temperature sensors
 */

#include "sensors.h"
#include <Arduino.h>

SensorManager::SensorManager() {
  // Initialize sensor pins (adjust based on your hardware)
  phPin = 34;  // ADC1_CH6
  tempPin = 35; // ADC1_CH7
  orpPin = 32;  // ADC1_CH4
  
  // Initialize calibration values
  phOffset = 0.0;
  phScale = 1.0;
  tempOffset = 0.0;
  tempScale = 1.0;
  orpOffset = 0.0;
  orpScale = 1.0;
  
  lastReadTime = 0;
  readInterval = 1000; // 1 second default
}

void SensorManager::begin() {
  // Configure ADC
  analogSetAttenuation(ADC_11db); // 0-3.3V range
  analogSetWidth(12); // 12-bit resolution
  
  // Load calibration from preferences
  loadCalibration();
  
  Serial.println("Sensor Manager initialized");
}

float SensorManager::readPH() {
  // Read pH sensor (analog input)
  // pH sensors typically output 0-2.5V for pH 0-14
  int rawValue = analogRead(phPin);
  float voltage = (rawValue / 4095.0) * 3.3; // Convert to voltage
  
  // Convert voltage to pH (adjust formula based on your sensor)
  // Typical formula: pH = (voltage - offset) * scale
  float ph = (voltage - phOffset) * phScale;
  
  // Validate range
  if (ph < 0.0) ph = 0.0;
  if (ph > 14.0) ph = 14.0;
  
  return ph;
}

float SensorManager::readTemperature() {
  // Read temperature sensor (DS18B20 or analog thermistor)
  // This is a placeholder - implement based on your sensor type
  int rawValue = analogRead(tempPin);
  float voltage = (rawValue / 4095.0) * 3.3;
  
  // Convert to temperature (adjust based on sensor type)
  // For thermistor: T = f(voltage, resistance)
  float temperature = (voltage - tempOffset) * tempScale;
  
  return temperature;
}

float SensorManager::readORP() {
  // Read ORP (Oxidation-Reduction Potential) sensor
  int rawValue = analogRead(orpPin);
  float voltage = (rawValue / 4095.0) * 3.3;
  
  // Convert to ORP in mV
  float orp = (voltage - orpOffset) * orpScale * 1000.0;
  
  return orp;
}

float SensorManager::readChlorine() {
  // Calculate chlorine from ORP reading
  // This is an approximation - actual conversion depends on sensor type
  float orp = readORP();
  
  // Approximate conversion: ORP to chlorine (ppm)
  // This is a simplified formula - adjust based on your sensor
  float chlorine = (orp - 650.0) / 50.0; // Approximate conversion
  
  if (chlorine < 0.0) chlorine = 0.0;
  if (chlorine > 10.0) chlorine = 10.0;
  
  return chlorine;
}

SensorReadings SensorManager::readAll() {
  SensorReadings readings;
  
  unsigned long now = millis();
  if (now - lastReadTime < readInterval) {
    // Return cached readings if interval not elapsed
    return cachedReadings;
  }
  
  // Read all sensors
  readings.ph = readPH();
  readings.temperature = readTemperature();
  readings.orp = readORP();
  readings.chlorine = readChlorine();
  readings.timestamp = now;
  
  // Validate readings
  if (!validateReadings(readings)) {
    // Use cached readings if validation fails
    return cachedReadings;
  }
  
  // Update cache
  cachedReadings = readings;
  lastReadTime = now;
  
  return readings;
}

bool SensorManager::validateReadings(SensorReadings& readings) {
  // Validate pH range
  if (readings.ph < 0.0 || readings.ph > 14.0) {
    Serial.println("Invalid pH reading");
    return false;
  }
  
  // Validate temperature range (reasonable for pool water)
  if (readings.temperature < -10.0 || readings.temperature > 50.0) {
    Serial.println("Invalid temperature reading");
    return false;
  }
  
  // Validate ORP range
  if (readings.orp < -1000.0 || readings.orp > 1000.0) {
    Serial.println("Invalid ORP reading");
    return false;
  }
  
  // Validate chlorine range
  if (readings.chlorine < 0.0 || readings.chlorine > 10.0) {
    Serial.println("Invalid chlorine reading");
    return false;
  }
  
  return true;
}

void SensorManager::calibratePH(float knownPH, float measuredValue) {
  // Calibration: adjust offset and scale
  // knownPH = (measuredValue - offset) * scale
  // This is a simplified calibration - implement proper 2-point calibration
  
  phOffset = measuredValue - (knownPH / phScale);
  phScale = knownPH / (measuredValue - phOffset);
  
  saveCalibration();
  Serial.println("pH sensor calibrated");
}

void SensorManager::calibrateTemperature(float knownTemp, float measuredValue) {
  tempOffset = measuredValue - (knownTemp / tempScale);
  tempScale = knownTemp / (measuredValue - tempOffset);
  
  saveCalibration();
  Serial.println("Temperature sensor calibrated");
}

void SensorManager::loadCalibration() {
  Preferences prefs;
  prefs.begin("sensors", true);
  
  phOffset = prefs.getFloat("phOffset", 0.0);
  phScale = prefs.getFloat("phScale", 1.0);
  tempOffset = prefs.getFloat("tempOffset", 0.0);
  tempScale = prefs.getFloat("tempScale", 1.0);
  orpOffset = prefs.getFloat("orpOffset", 0.0);
  orpScale = prefs.getFloat("orpScale", 1.0);
  
  prefs.end();
}

void SensorManager::saveCalibration() {
  Preferences prefs;
  prefs.begin("sensors", false);
  
  prefs.putFloat("phOffset", phOffset);
  prefs.putFloat("phScale", phScale);
  prefs.putFloat("tempOffset", tempOffset);
  prefs.putFloat("tempScale", tempScale);
  prefs.putFloat("orpOffset", orpOffset);
  prefs.putFloat("orpScale", orpScale);
  
  prefs.end();
}

bool SensorManager::detectFailure() {
  // Check for sensor failures
  SensorReadings readings = readAll();
  
  // Check if readings are stuck (same value multiple times)
  static float lastPH = -1.0;
  static float lastTemp = -1.0;
  static int stuckCount = 0;
  
  if (abs(readings.ph - lastPH) < 0.01 && abs(readings.temperature - lastTemp) < 0.1) {
    stuckCount++;
    if (stuckCount > 10) {
      return true; // Sensor appears stuck
    }
  } else {
    stuckCount = 0;
  }
  
  lastPH = readings.ph;
  lastTemp = readings.temperature;
  
  return false;
}

