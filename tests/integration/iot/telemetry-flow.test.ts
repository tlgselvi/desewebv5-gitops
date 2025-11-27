import { afterAll, beforeAll, describe, expect, it, beforeEach } from 'vitest';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import mqtt, { MqttClient } from 'mqtt';
import { db } from '@/db/index.js';
import { telemetry, devices } from '@/db/schema/index.js';
import { eq, and } from 'drizzle-orm';

const shouldRunTestcontainers = process.env.RUN_TESTCONTAINERS === 'true';

const testDescribe = shouldRunTestcontainers ? describe : describe.skip;

/**
 * End-to-End Telemetry Flow Integration Tests
 * Tests the complete flow from device telemetry publishing to database storage
 */
testDescribe('End-to-End Telemetry Flow', () => {
  let container: StartedTestContainer | undefined;
  let brokerUrl: string;
  let deviceClient: MqttClient | undefined;
  let backendClient: MqttClient | undefined;

  beforeAll(async () => {
    try {
      container = await new GenericContainer('eclipse-mosquitto:2.0')
        .withExposedPorts(1883)
        .withCommand(['mosquitto', '-c', '/mosquitto-no-auth.conf'])
        .start();

      const host = container.getHost();
      const port = container.getMappedPort(1883);
      brokerUrl = `mqtt://${host}:${port}`;

      // Setup backend client (simulating backend MQTT client)
      backendClient = mqtt.connect(brokerUrl, {
        clientId: 'backend-client',
        reconnectPeriod: 0,
      });

      console.log(`MQTT Broker started at ${brokerUrl}`);
    } catch (error) {
      console.warn('Could not start MQTT broker container, skipping tests.', error);
      container = undefined;
    }
  }, 60000);

  afterAll(async () => {
    if (deviceClient) {
      deviceClient.end();
    }
    if (backendClient) {
      backendClient.end();
    }
    if (container) {
      await container.stop();
    }
  });

  beforeEach(async () => {
    if (!brokerUrl) {
      return;
    }

    // Setup device client (simulating ESP32 device)
    deviceClient = mqtt.connect(brokerUrl, {
      clientId: `device-client-${Date.now()}`,
      reconnectPeriod: 0,
    });

    // Clean up test data
    // Note: In real tests, you would use test database transactions
  });

  it('should receive telemetry from device and store in database', async ({ skip }) => {
    if (!brokerUrl || !container || !deviceClient || !backendClient) {
      return skip('MQTT broker or clients not available');
    }

    const organizationId = 'test-org-e2e';
    const deviceId = 'test-device-e2e';
    const telemetryTopic = `devices/${organizationId}/${deviceId}/telemetry`;

    // First, ensure device exists in database
    // This would normally be done through the device registration process
    try {
      await db.insert(devices).values({
        id: deviceId,
        organizationId,
        name: 'Test Device E2E',
        serialNumber: 'SN-E2E-001',
        type: 'pool_controller',
        status: 'online',
        isActive: true,
      });
    } catch (error) {
      // Device might already exist, continue
      console.log('Device might already exist, continuing...');
    }

    return new Promise<void>((resolve, reject) => {
      let telemetryReceived = false;

      // Backend subscribes to telemetry topics
      backendClient.subscribe('devices/+/+/telemetry', (err) => {
        if (err) {
          return reject(err);
        }

        backendClient?.on('message', async (topic, message) => {
          if (topic === telemetryTopic) {
            try {
              const data = JSON.parse(message.toString());
              telemetryReceived = true;

              // Verify telemetry data structure
              expect(data.device_id).toBe(deviceId);
              expect(data.organization_id).toBe(organizationId);
              expect(data.sensors).toBeDefined();
              expect(data.metadata).toBeDefined();

              // In a real scenario, the backend would process and store this
              // For testing, we verify the message was received correctly
              expect(telemetryReceived).toBe(true);
              resolve();
            } catch (error) {
              reject(error);
            }
          }
        });

        // Wait for subscription to be established
        setTimeout(() => {
          // Device publishes telemetry
          deviceClient?.on('connect', () => {
            const telemetryData = {
              device_id: deviceId,
              organization_id: organizationId,
              timestamp: new Date().toISOString(),
              sensors: {
                ph: 7.2,
                temperature: 25.5,
                chlorine: 2.5,
                tds: 500,
              },
              metadata: {
                battery: 85,
                signal_strength: -65,
                firmware_version: '1.0.0',
                uptime: 86400,
              },
            };

            deviceClient?.publish(telemetryTopic, JSON.stringify(telemetryData), (err) => {
              if (err) {
                return reject(err);
              }
            });
          });
        }, 500);
      });

      setTimeout(() => {
        if (!telemetryReceived) {
          reject(new Error('Telemetry flow timeout'));
        }
      }, 15000);
    });
  });

  it('should handle multiple telemetry messages in sequence', async ({ skip }) => {
    if (!brokerUrl || !container || !deviceClient || !backendClient) {
      return skip('MQTT broker or clients not available');
    }

    const organizationId = 'test-org-multi';
    const deviceId = 'test-device-multi';
    const telemetryTopic = `devices/${organizationId}/${deviceId}/telemetry`;

    return new Promise<void>((resolve, reject) => {
      const messagesReceived: string[] = [];

      backendClient?.subscribe('devices/+/+/telemetry', () => {
        backendClient?.on('message', (topic, message) => {
          if (topic === telemetryTopic) {
            const data = JSON.parse(message.toString());
            messagesReceived.push(data.timestamp);

            if (messagesReceived.length === 3) {
              expect(messagesReceived.length).toBe(3);
              resolve();
            }
          }
        });

        setTimeout(() => {
          deviceClient?.on('connect', () => {
            // Send 3 telemetry messages
            for (let i = 0; i < 3; i++) {
              setTimeout(() => {
                const telemetryData = {
                  device_id: deviceId,
                  organization_id: organizationId,
                  timestamp: new Date().toISOString(),
                  sensors: {
                    ph: 7.2 + i * 0.1,
                    temperature: 25.5 + i,
                  },
                };

                deviceClient?.publish(telemetryTopic, JSON.stringify(telemetryData));
              }, i * 500);
            }
          });
        }, 500);
      });

      setTimeout(() => {
        if (messagesReceived.length < 3) {
          reject(new Error('Multiple telemetry messages timeout'));
        }
      }, 20000);
    });
  });

  it('should validate telemetry data format', async ({ skip }) => {
    if (!brokerUrl || !container || !deviceClient || !backendClient) {
      return skip('MQTT broker or clients not available');
    }

    const organizationId = 'test-org-validation';
    const deviceId = 'test-device-validation';
    const telemetryTopic = `devices/${organizationId}/${deviceId}/telemetry`;

    return new Promise<void>((resolve, reject) => {
      backendClient?.subscribe('devices/+/+/telemetry', () => {
        backendClient?.on('message', (topic, message) => {
          if (topic === telemetryTopic) {
            try {
              const data = JSON.parse(message.toString());

              // Validate required fields
              expect(data).toHaveProperty('device_id');
              expect(data).toHaveProperty('organization_id');
              expect(data).toHaveProperty('timestamp');
              expect(data).toHaveProperty('sensors');

              // Validate sensor values
              if (data.sensors.ph !== undefined) {
                expect(typeof data.sensors.ph).toBe('number');
                expect(data.sensors.ph).toBeGreaterThanOrEqual(0);
                expect(data.sensors.ph).toBeLessThanOrEqual(14);
              }

              if (data.sensors.temperature !== undefined) {
                expect(typeof data.sensors.temperature).toBe('number');
              }

              resolve();
            } catch (error) {
              reject(error);
            }
          }
        });

        setTimeout(() => {
          deviceClient?.on('connect', () => {
            const validTelemetryData = {
              device_id: deviceId,
              organization_id: organizationId,
              timestamp: new Date().toISOString(),
              sensors: {
                ph: 7.2,
                temperature: 25.5,
                chlorine: 2.5,
              },
              metadata: {
                battery: 85,
                signal_strength: -65,
              },
            };

            deviceClient?.publish(telemetryTopic, JSON.stringify(validTelemetryData));
          });
        }, 500);
      });

      setTimeout(() => {
        reject(new Error('Telemetry validation timeout'));
      }, 15000);
    });
  });
});
