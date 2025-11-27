# DESE IoT Troubleshooting Guide

**Version:** 1.0.0  
**Date:** 2025-01-27

---

## Common Issues and Solutions

### Device Connection Issues

#### Device Not Appearing in Dashboard

**Symptoms:**
- Device not listed in device list
- No telemetry data received

**Solutions:**
1. Verify device is powered on
2. Check WiFi connection status
3. Verify MQTT broker connectivity
4. Check device logs via serial monitor
5. Verify device is registered in database

#### Device Shows as Offline

**Symptoms:**
- Device status shows "offline"
- Last seen timestamp is old

**Solutions:**
1. Check device power supply
2. Verify WiFi connection
3. Check MQTT broker status
4. Verify network connectivity
5. Check device firmware version

---

### MQTT Connection Issues

#### Cannot Connect to MQTT Broker

**Symptoms:**
- Device logs show connection errors
- No messages received/sent

**Solutions:**
1. Verify broker URL and port
2. Check MQTT credentials
3. Verify network firewall rules
4. Check broker status
5. For TLS: verify certificate configuration

#### Messages Not Received

**Symptoms:**
- Commands not reaching device
- Telemetry not reaching backend

**Solutions:**
1. Verify topic structure matches
2. Check subscription topics
3. Verify QoS levels
4. Check message payload format
5. Verify organization/device IDs

---

### Sensor Issues

#### Invalid Sensor Readings

**Symptoms:**
- Sensor values out of expected range
- Readings stuck at same value

**Solutions:**
1. Calibrate sensors
2. Check sensor connections
3. Verify power supply
4. Check for sensor failures
5. Verify ADC configuration

#### Sensor Not Detected

**Symptoms:**
- No readings from sensor
- Sensor value always null

**Solutions:**
1. Check sensor wiring
2. Verify sensor power
3. Check pin configuration
4. Test sensor independently
5. Verify sensor driver code

---

### Command Execution Issues

#### Commands Not Executing

**Symptoms:**
- Commands sent but not executed
- No command response received

**Solutions:**
1. Verify command format
2. Check device is online
3. Verify command topic subscription
4. Check command timeout settings
5. Review device logs

#### Command Timeout

**Symptoms:**
- Commands marked as timeout
- No response from device

**Solutions:**
1. Increase timeout duration
2. Check device processing time
3. Verify MQTT connection stability
4. Check device resource usage
5. Review command implementation

---

### Performance Issues

#### High Latency

**Symptoms:**
- Telemetry delay > 5 seconds
- Command execution delay > 2 seconds

**Solutions:**
1. Check network latency
2. Optimize telemetry interval
3. Reduce message payload size
4. Check MQTT broker performance
5. Optimize database queries

#### High Memory Usage

**Symptoms:**
- Device crashes
- Out of memory errors

**Solutions:**
1. Reduce message queue size
2. Optimize sensor reading frequency
3. Free unused resources
4. Check for memory leaks
5. Increase device memory if possible

---

### Alert Issues

#### Alerts Not Generated

**Symptoms:**
- Expected alerts not created
- Alert conditions not triggering

**Solutions:**
1. Verify alert rules configuration
2. Check sensor data validity
3. Verify alert thresholds
4. Check alert generation code
5. Review device logs

#### Too Many Alerts

**Symptoms:**
- Alert spam
- Duplicate alerts

**Solutions:**
1. Adjust alert thresholds
2. Implement alert deduplication
3. Add alert cooldown period
4. Review alert conditions
5. Optimize alert generation logic

---

## Diagnostic Tools

### Device Logs

Monitor device serial output:
```bash
pio device monitor --baud 115200
```

### MQTT Broker Logs

Check Mosquitto logs:
```bash
docker logs mosquitto
```

### Backend Logs

Check application logs:
```bash
docker logs app
```

### Database Queries

Check device status:
```sql
SELECT * FROM devices WHERE id = 'device-id';
SELECT * FROM telemetry WHERE device_id = 'device-id' ORDER BY timestamp DESC LIMIT 10;
SELECT * FROM device_alerts WHERE device_id = 'device-id' AND is_resolved = false;
```

---

## Support

For additional support:
1. Check documentation: `docs/IOT_MQTT_PROTOCOL.md`
2. Review firmware guide: `docs/IOT_FIRMWARE_GUIDE.md`
3. Contact DESE development team
4. Create issue in repository

---

**Last Updated:** 2025-01-27

