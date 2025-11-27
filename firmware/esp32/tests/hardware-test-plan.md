# ESP32 IoT Hardware Testing Plan

**Version:** 1.0  
**Last Updated:** 2025-01-27  
**Status:** Ready for Implementation

---

## 📋 Test Kapsamı

Bu doküman ESP32 IoT cihazları için hardware test planını içermektedir. Tüm testler production deployment öncesi yapılmalıdır.

---

## 🧪 Test Kategorileri

### 1. ESP32 Hardware Testleri

#### 1.1 Temel Hardware Testleri
- [ ] **CPU ve Memory Testleri**
  - CPU frekans kontrolü
  - RAM kullanımı testi
  - Flash memory okuma/yazma testi
  - Heap fragmentation testi

- [ ] **GPIO Testleri**
  - Digital I/O pin testleri
  - ADC (Analog-to-Digital) testleri
  - PWM çıkış testleri
  - Interrupt handling testleri

- [ ] **WiFi Hardware Testleri**
  - WiFi çip başlatma testi
  - Signal strength ölçümü
  - WiFi modları (STA/AP) testi
  - WiFi çevresel gürültü testi

- [ ] **Power Management Testleri**
  - Power consumption ölçümü (idle/active)
  - Deep sleep modu testi
  - Light sleep modu testi
  - Battery monitoring testi (ADC voltage reading)

#### 1.2 Test Senaryoları

**Test 1: CPU Stress Test**
```cpp
// tests/hardware/cpu_stress_test.cpp
void test_cpu_stress() {
  unsigned long startTime = millis();
  unsigned long iterations = 0;
  
  // Run for 60 seconds
  while (millis() - startTime < 60000) {
    float result = 0;
    for (int i = 0; i < 1000; i++) {
      result += sin(i) * cos(i);
    }
    iterations++;
  }
  
  Serial.printf("CPU Stress Test: %lu iterations in 60s\n", iterations);
  Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
}
```

**Test 2: Memory Leak Test**
```cpp
// tests/hardware/memory_leak_test.cpp
void test_memory_leak() {
  size_t initialHeap = ESP.getFreeHeap();
  
  for (int i = 0; i < 100; i++) {
    char* buffer = (char*)malloc(1024);
    // Simulate usage
    memset(buffer, 0, 1024);
    free(buffer);
  }
  
  size_t finalHeap = ESP.getFreeHeap();
  size_t leak = initialHeap - finalHeap;
  
  Serial.printf("Memory Leak Test:\n");
  Serial.printf("  Initial heap: %d bytes\n", initialHeap);
  Serial.printf("  Final heap: %d bytes\n", finalHeap);
  Serial.printf("  Leak: %d bytes\n", leak);
  
  assert(leak < 100); // Allow < 100 bytes for fragmentation
}
```

**Test 3: WiFi Stability Test**
```cpp
// tests/hardware/wifi_stability_test.cpp
void test_wifi_stability() {
  int disconnectCount = 0;
  unsigned long startTime = millis();
  
  WiFi.onEvent([](WiFiEvent_t event) {
    if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
      disconnectCount++;
    }
  });
  
  // Test for 30 minutes
  while (millis() - startTime < 1800000) {
    if (WiFi.status() != WL_CONNECTED) {
      WiFi.reconnect();
    }
    delay(1000);
  }
  
  Serial.printf("WiFi Stability Test:\n");
  Serial.printf("  Duration: 30 minutes\n");
  Serial.printf("  Disconnects: %d\n", disconnectCount);
  Serial.printf("  Signal strength: %d dBm\n", WiFi.RSSI());
}
```

---

### 2. Sensor Calibration Testleri

#### 2.1 pH Sensor Calibration
- [ ] **Buffer Solution Testleri**
  - pH 4.0 buffer testi
  - pH 7.0 buffer testi
  - pH 10.0 buffer testi
  - Calibration accuracy (±0.1 pH)

- [ ] **Temperature Compensation**
  - Farklı sıcaklıklarda pH ölçümü
  - Temperature compensation algoritması testi

#### 2.2 Temperature Sensor Calibration
- [ ] **Ice Point Test**
  - 0°C reference (ice bath)
  - Accuracy kontrolü

- [ ] **Boiling Point Test**
  - 100°C reference (at sea level)
  - Accuracy kontrolü

- [ ] **Range Test**
  - 0°C - 50°C aralığında doğruluk testi

#### 2.3 Chlorine Sensor Calibration
- [ ] **Known Concentration Test**
  - Standard chlorine solutions ile test
  - Linear response verification

#### 2.4 TDS Sensor Calibration
- [ ] **Conductivity Standard Test**
  - Known TDS solutions ile test
  - Calibration curve verification

#### 2.5 Sensor Failure Detection
- [ ] **Open Circuit Detection**
- [ ] **Short Circuit Detection**
- [ ] **Out of Range Detection**
- [ ] **Sensor Drift Detection**

---

### 3. Long-term Stability Testleri

#### 3.1 Continuous Operation Test
- [ ] **7 Günlük Kesintisiz Çalışma**
  - Uptime tracking
  - Memory leak monitoring
  - Watchdog reset sayısı
  - Crash log analizi

- [ ] **30 Günlük Endurance Test**
  - Long-term stability
  - Data integrity verification
  - Sensor drift analysis

#### 3.2 Test Protokolü

**Test Setup:**
```cpp
// tests/stability/endurance_test.cpp
void setup_endurance_test() {
  Serial.begin(115200);
  Serial.println("=== Endurance Test Started ===");
  
  // Initialize all sensors
  sensorManager.begin();
  
  // Initialize MQTT
  mqttClient.begin(&config);
  
  // Enable watchdog
  esp_task_wdt_init(30, true);
  esp_task_wdt_add(NULL);
  
  // Start logging
  logToFile("endurance_test.log");
}

void loop_endurance_test() {
  // Feed watchdog
  esp_task_wdt_reset();
  
  // Read sensors every 5 minutes
  static unsigned long lastRead = 0;
  if (millis() - lastRead >= 300000) {
    sendTelemetry();
    lastRead = millis();
    
    // Log memory stats
    logMemoryStats();
  }
  
  // Check system health every hour
  static unsigned long lastHealthCheck = 0;
  if (millis() - lastHealthCheck >= 3600000) {
    performHealthCheck();
    lastHealthCheck = millis();
  }
}
```

---

### 4. Power Consumption Testleri

#### 4.1 Test Senaryoları

- [ ] **Active Mode Power Consumption**
  - WiFi connected, sensors active
  - MQTT publishing every 5 minutes
  - Target: < 150mA @ 3.3V

- [ ] **Light Sleep Mode**
  - Periodic wake-up every 5 minutes
  - Target: < 5mA average

- [ ] **Deep Sleep Mode**
  - Wake-up every hour
  - Target: < 0.1mA

#### 4.2 Power Measurement Setup

**Equipment Required:**
- Digital multimeter with current measurement
- Power supply (3.3V regulated)
- ESP32 breakout board with current measurement points

**Test Procedure:**
1. Connect ESP32 to power supply through multimeter
2. Flash test firmware
3. Measure current consumption in different modes
4. Record measurements over 24 hours
5. Calculate average and peak power consumption

**Test Script:**
```bash
#!/bin/bash
# scripts/hardware/power_consumption_test.sh

echo "ESP32 Power Consumption Test"
echo "============================"

# Test modes
modes=("active" "light_sleep" "deep_sleep")

for mode in "${modes[@]}"; do
  echo "Testing $mode mode..."
  
  # Flash test firmware for mode
  pio run -e ${mode}_test -t upload
  
  echo "Measure current consumption and press Enter when done..."
  read
  
  # Log results
  echo "$mode: <measured_value> mA" >> power_consumption.log
done
```

---

### 5. Range ve Signal Strength Testleri

#### 5.1 WiFi Range Test

- [ ] **Indoor Range Test**
  - Measure RSSI at various distances
  - Test through walls/obstacles
  - Minimum acceptable: -80 dBm at 30m

- [ ] **Outdoor Range Test**
  - Line-of-sight range
  - Non-line-of-sight range
  - Interference analysis

#### 5.2 Test Procedure

**Test Setup:**
```cpp
// tests/hire/wifi_range_test.cpp
void test_wifi_range() {
  Serial.println("=== WiFi Range Test ===");
  
  int testDistances[] = {5, 10, 15, 20, 30, 50}; // meters
  int readingsPerDistance = 10;
  
  for (int dist : testDistances) {
    Serial.printf("\nTesting at %d meters:\n", dist);
    
    int rssiSum = 0;
    int successCount = 0;
    
    for (int i = 0; i < readingsPerDistance; i++) {
      if (WiFi.status() == WL_CONNECTED) {
        int rssi = WiFi.RSSI();
        rssiSum += rssi;
        successCount++;
        
        Serial.printf("  Reading %d: %d dBm\n", i+1, rssi);
      } else {
        Serial.println("  Connection lost!");
      }
      delay(1000);
    }
    
    int avgRssi = rssiSum / successCount;
    float successRate = (successCount / (float)readingsPerDistance) * 100;
    
    Serial.printf("  Average RSSI: %d dBm\n", avgRssi);
    Serial.printf("  Success Rate: %.1f%%\n", successRate);
  }
}
```

---

## 📊 Test Raporu Şablonu

### Hardware Test Raporu

**Test Tarihi:** [DATE]  
**Test Edilen Cihaz:** [DEVICE_ID]  
**Firmware Versiyonu:** [VERSION]  
**Test Ortamı:** [INDOOR/OUTDOOR]

#### Test Sonuçları

| Test Kategorisi | Test Adı | Sonuç | Notlar |
|----------------|----------|-------|--------|
| Hardware | CPU Stress Test | ✅/❌ | |
| Hardware | Memory Leak Test | ✅/❌ | |
| Hardware | WiFi Stability | ✅/❌ | |
| Hardware | Power Consumption | ✅/❌ | Measured: X mA |
| Sensor | pH Calibration | ✅/❌ | Accuracy: ±X |
| Sensor | Temperature Calibration | ✅/❌ | |
| Sensor | Sensor Failure Detection | ✅/❌ | |
| Stability | 7-Day Endurance | ✅/❌ | Uptime: X hours |
| Range | WiFi Range Test | ✅/❌ | Max range: X m |

#### Kritik Bulgular

- [List any critical issues found]

#### Öneriler

- [List recommendations for improvement]

---

## 🔧 Test Araçları

### Gerekli Ekipmanlar

1. **ESP32 Development Board**
   - ESP32-DevKitC veya benzeri
   - GPIO breakout board

2. **Power Supply**
   - 3.3V regulated power supply
   - Battery pack (for battery-powered tests)

3. **Measurement Equipment**
   - Digital multimeter (current measurement)
   - Oscilloscope (optional, for signal analysis)
   - WiFi analyzer (for signal strength)

4. **Calibration Standards**
   - pH buffer solutions (4.0, 7.0, 10.0)
   - Temperature reference (ice bath, boiling water)
   - Known TDS solutions

5. **Test Environment**
   - Temperature-controlled chamber (optional)
   - WiFi access point/router

---

## 📝 Test Checklist

### Pre-Production Checklist

- [ ] All hardware tests passed
- [ ] All sensors calibrated and verified
- [ ] 7-day stability test completed
- [ ] Power consumption within specifications
- [ ] WiFi range meets requirements
- [ ] All test reports documented
- [ ] Firmware version tagged and released

---

## 🚀 Test Otomasyonu

### Automated Test Scripts

Test scriptleri `scripts/hardware/` klasöründe bulunur:

- `run_all_tests.sh` - Tüm testleri çalıştır
- `power_consumption_test.sh` - Güç tüketimi testi
- `wifi_range_test.sh` - WiFi menzil testi
- `sensor_calibration_test.sh` - Sensor kalibrasyon testi

### CI/CD Integration

Hardware testleri manuel olarak yapılmalıdır (fiziksel cihaz gerektirir), ancak test sonuçları CI/CD pipeline'a entegre edilebilir.

---

**Son Güncelleme:** 2025-01-27  
**Sorumlu:** IoT Engineering Team
