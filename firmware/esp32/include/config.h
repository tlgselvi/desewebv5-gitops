/**
 * DESE ESP32 Firmware Configuration
 * 
 * Device-specific configuration header
 */

#ifndef CONFIG_H
#define CONFIG_H

// Firmware Information
#define FIRMWARE_VERSION "1.0.0"
#define FIRMWARE_BUILD_DATE __DATE__ " " __TIME__
#define DEVICE_TYPE "pool_controller"
#define MANUFACTURER "DESE"

// WiFi Configuration
#define WIFI_AP_SSID "DESE-Device-AP"
#define WIFI_AP_PASSWORD ""  // Leave empty for open AP
#define WIFI_CONFIG_PORTAL_TIMEOUT 180  // seconds

// MQTT Configuration
#define MQTT_KEEPALIVE 60  // seconds
#define MQTT_QOS 1
#define MQTT_RETAIN false

// Timing Configuration
#define TELEMETRY_INTERVAL_DEFAULT 30000  // 30 seconds (ms)
#define STATUS_INTERVAL 60000              // 60 seconds (ms)
#define COMMAND_TIMEOUT 30000              // 30 seconds (ms)
#define RECONNECT_DELAY 5000               // 5 seconds (ms)
#define MAX_RECONNECT_ATTEMPTS 10

// Sensor Configuration
#define SENSOR_READ_INTERVAL 1000  // 1 second (ms)
#define SENSOR_CALIBRATION_ENABLED true

// Battery Configuration
#define BATTERY_MIN_LEVEL 10  // Minimum battery level percentage
#define BATTERY_LOW_ALERT 20  // Low battery alert threshold

// Network Configuration
#define NTP_SERVER1 "pool.ntp.org"
#define NTP_SERVER2 "time.nist.gov"
#define TIMEZONE_OFFSET 0  // UTC offset in seconds

// Debug Configuration
#ifdef DEBUG_ENABLED
  #define DEBUG_SERIAL Serial
  #define DEBUG_BAUD 115200
  #define DEBUG_PRINT(x) Serial.print(x)
  #define DEBUG_PRINTLN(x) Serial.println(x)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
#endif

// Storage Configuration
#define PREFERENCES_NAMESPACE "dese"
#define DEVICE_ID_LENGTH 64
#define ORG_ID_LENGTH 64
#define MQTT_BROKER_LENGTH 128

// Error Handling
#define MAX_ERROR_COUNT 5
#define ERROR_RESET_DELAY 60000  // 1 minute

#endif // CONFIG_H

