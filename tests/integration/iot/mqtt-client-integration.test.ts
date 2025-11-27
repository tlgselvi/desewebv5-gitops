import { afterAll, beforeAll, describe, expect, it, beforeEach, vi } from 'vitest';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import mqtt, { MqttClient } from 'mqtt';
import { mqttClient } from '@/services/iot/mqtt-client.js';
import { db } from '@/db/index.js';
import { telemetry, devices, deviceCommands, deviceStatusHistory } from '@/db/schema/index.js';

const shouldRunTestcontainers = process.env.RUN_TESTCONTAINERS === 'true';

const testDescribe = shouldRunTestcontainers ? describe : describe.skip;

/**
 * Backend MQTT Client Integration Tests
 * Tests the MQTT client service integration with a real MQTT broker
 */
testDescribe('Backend MQTT Client Integration', () => {
  let container: StartedTestContainer | undefined;
  let brokerUrl: string;
  let testMqttClient: MqttClient | undefined;

  beforeAll(async () => {
    try {
      // Start Mosquitto MQTT broker container
      container = await new GenericContainer('eclipse-mosquitto:2.0')
        .withExposedPorts(1883)
        .withCommand(['mosquitto', '-c', '/mosquitto-no-auth.conf'])
        .start();

      const host = container.getHost();
      const port = container.getMappedPort(1883);
      brokerUrl = `mqtt://${host}:${port}`;

      // Override MQTT broker URL for testing
      process.env.MQTT_BROKER_URL = brokerUrl;

      console.log(`MQTT Broker started at ${brokerUrl}`);
    } catch (error) {
      console.warn('Could not start MQTT broker container, skipping tests.', error);
      container = undefined;
    }
  }, 60000);

  afterAll(async () => {
    if (testMqttClient) {
      testMqttClient.end();
    }
    delete process.env.MQTT_BROKER_URL;
    if (container) {
      await container.stop();
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    if (brokerUrl && !testMqttClient) {
      testMqttClient = mqtt.connect(brokerUrl, {
        clientId: `test-client-${Date.now()}`,
        reconnectPeriod: 0,
      });
    }
  });

  it('should publish messages to MQTT broker', async ({ skip }) => {
    if (!brokerUrl || !container) {
      return skip('MQTT broker container not available');
    }

    return new Promise<void>((resolve, reject) => {
      if (!testMqttClient) {
        return reject(new Error('MQTT client not initialized'));
      }

      const testTopic = 'devices/test-org/test-device/commands';
      const testMessage = JSON.stringify({
        command_id: 'test-cmd-123',
        device_id: 'test-device',
        command: 'test_command',
        parameters: { param1: 'value1' },
        timestamp: new Date().toISOString(),
      });

      // Subscribe to topic to verify message was published
      testMqttClient.subscribe(testTopic, (err) => {
        if (err) {
          return reject(err);
        }

        testMqttClient.on('message', (topic, message) => {
          if (topic === testTopic) {
            const parsed = JSON.parse(message.toString());
            expect(parsed.command_id).toBe('test-cmd-123');
            expect(parsed.command).toBe('test_command');
            resolve();
          }
        });

        // Publish using the service
        mqttClient.publish(testTopic, testMessage);
      });

      setTimeout(() => {
        reject(new Error('Message publish timeout'));
      }, 10000);
    });
  });

  it('should handle telemetry message processing', async ({ skip }) => {
    if (!brokerUrl || !container) {
      return skip('MQTT broker container not available');
    }

    // Mock database operations
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    } as any);

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    return new Promise<void>((resolve, reject) => {
      if (!testMqttClient) {
        return reject(new Error('MQTT client not initialized'));
      }

      const telemetryTopic = 'devices/org-123/device-456/telemetry';
      const telemetryData = {
        device_id: 'device-456',
        organization_id: 'org-123',
        timestamp: new Date().toISOString(),
        sensors: {
          ph: 7.2,
          temperature: 25.5,
          chlorine: 2.5,
        },
        metadata: {
          battery: 85,
          signal_strength: -65,
          firmware_version: '1.0.0',
        },
      };

      // Simulate receiving telemetry message
      testMqttClient.subscribe(telemetryTopic, () => {
        testMqttClient?.publish(telemetryTopic, JSON.stringify(telemetryData), () => {
          // Give time for processing
          setTimeout(() => {
            // Verify that database insert was called
            expect(db.insert).toHaveBeenCalled();
            resolve();
          }, 1000);
        });
      });

      setTimeout(() => {
        reject(new Error('Telemetry processing timeout'));
      }, 10000);
    });
  });

  it('should handle status update messages', async ({ skip }) => {
    if (!brokerUrl || !container) {
      return skip('MQTT broker container not available');
    }

    // Mock database operations
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    } as any);

    return new Promise<void>((resolve, reject) => {
      if (!testMqttClient) {
        return reject(new Error('MQTT client not initialized'));
      }

      const statusTopic = 'devices/org-123/device-456/status';
      const statusData = {
        device_id: 'device-456',
        status: 'online',
        battery: 85,
        signal_strength: -65,
        firmware_version: '1.0.0',
        timestamp: new Date().toISOString(),
      };

      testMqttClient.subscribe(statusTopic, () => {
        testMqttClient?.publish(statusTopic, JSON.stringify(statusData), () => {
          setTimeout(() => {
            // Verify database operations were called
            expect(db.update).toHaveBeenCalled();
            expect(db.insert).toHaveBeenCalled();
            resolve();
          }, 1000);
        });
      });

      setTimeout(() => {
        reject(new Error('Status update timeout'));
      }, 10000);
    });
  });

  it('should handle command response messages', async ({ skip }) => {
    if (!brokerUrl || !container) {
      return skip('MQTT broker container not available');
    }

    // Mock database operations
    const mockCommandRecord = {
      id: 'cmd-record-123',
      commandId: 'test-cmd-123',
      deviceId: 'device-456',
      organizationId: 'org-123',
      status: 'sent',
    };

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockCommandRecord]),
        }),
      }),
    } as any);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    return new Promise<void>((resolve, reject) => {
      if (!testMqttClient) {
        return reject(new Error('MQTT client not initialized'));
      }

      const responseTopic = 'devices/org-123/device-456/command_response';
      const responseData = {
        command_id: 'test-cmd-123',
        device_id: 'device-456',
        status: 'executed',
        result: { success: true },
        timestamp: new Date().toISOString(),
      };

      testMqttClient.subscribe(responseTopic, () => {
        testMqttClient?.publish(responseTopic, JSON.stringify(responseData), () => {
          setTimeout(() => {
            // Verify command was updated
            expect(db.select).toHaveBeenCalled();
            expect(db.update).toHaveBeenCalled();
            resolve();
          }, 1000);
        });
      });

      setTimeout(() => {
        reject(new Error('Command response timeout'));
      }, 10000);
    });
  });
});
