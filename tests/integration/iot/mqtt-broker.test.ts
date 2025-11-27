import { afterAll, beforeAll, describe, expect, it, beforeEach } from 'vitest';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import mqtt, { MqttClient } from 'mqtt';

const shouldRunTestcontainers = process.env.RUN_TESTCONTAINERS === 'true';

const testDescribe = shouldRunTestcontainers ? describe : describe.skip;

/**
 * MQTT Broker Integration Tests
 * Tests MQTT broker connectivity, topic subscriptions, and message publishing/receiving
 */
testDescribe('MQTT Broker Integration', () => {
  let container: StartedTestContainer | undefined;
  let brokerUrl: string;
  let client: MqttClient | undefined;

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

      console.log(`MQTT Broker started at ${brokerUrl}`);
    } catch (error) {
      console.warn('Could not start MQTT broker container, skipping tests.', error);
      container = undefined;
    }
  }, 60000); // 60s timeout for container startup

  afterAll(async () => {
    if (client) {
      client.end();
    }
    if (container) {
      await container.stop();
    }
  });

  beforeEach(() => {
    if (!brokerUrl) {
      return;
    }
  });

  it('should connect to MQTT broker', async ({ skip }) => {
    if (!brokerUrl || !container) {
      return skip('MQTT broker container not available');
    }

    return new Promise<void>((resolve, reject) => {
      client = mqtt.connect(brokerUrl, {
        clientId: 'test-client-connect',
        reconnectPeriod: 0, // Disable auto-reconnect for tests
      });

      client.on('connect', () => {
        expect(client?.connected).toBe(true);
        client?.end();
        resolve();
      });

      client.on('error', (err) => {
        client?.end();
        reject(err);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (client && !client.connected) {
          client.end();
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  });

  it('should subscribe to topic and receive messages', async ({ skip }) => {
    if (!brokerUrl || !container) {
      return skip('MQTT broker container not available');
    }

    return new Promise<void>((resolve, reject) => {
      const subscriber = mqtt.connect(brokerUrl, {
        clientId: 'test-client-subscriber',
        reconnectPeriod: 0,
      });

      const publisher = mqtt.connect(brokerUrl, {
        clientId: 'test-client-publisher',
        reconnectPeriod: 0,
      });

      const testTopic = 'test/topic/message';
      const testMessage = JSON.stringify({ test: 'data', timestamp: Date.now() });
      let messageReceived = false;

      subscriber.on('connect', () => {
        subscriber.subscribe(testTopic, (err) => {
          if (err) {
            subscriber.end();
            publisher.end();
            return reject(err);
          }

          // Wait a bit for subscription to be established
          setTimeout(() => {
            publisher.on('connect', () => {
              publisher.publish(testTopic, testMessage, (err) => {
                if (err) {
                  subscriber.end();
                  publisher.end();
                  return reject(err);
                }
              });
            });

            publisher.on('error', (err) => {
              subscriber.end();
              publisher.end();
              reject(err);
            });
          }, 500);
        });
      });

      subscriber.on('message', (topic, message) => {
        if (topic === testTopic && message.toString() === testMessage) {
          messageReceived = true;
          subscriber.end();
          publisher.end();
          expect(messageReceived).toBe(true);
          resolve();
        }
      });

      subscriber.on('error', (err) => {
        publisher.end();
        reject(err);
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!messageReceived) {
          subscriber.end();
          publisher.end();
          reject(new Error('Message reception timeout'));
        }
      }, 15000);
    });
  });

  it('should handle multi-level topic subscriptions', async ({ skip }) => {
    if (!brokerUrl || !container) {
      return skip('MQTT broker container not available');
    }

    return new Promise<void>((resolve, reject) => {
      const subscriber = mqtt.connect(brokerUrl, {
        clientId: 'test-client-multilevel',
        reconnectPeriod: 0,
      });

      const publisher = mqtt.connect(brokerUrl, {
        clientId: 'test-client-multilevel-pub',
        reconnectPeriod: 0,
      });

      const topicPattern = 'devices/+/+/telemetry';
      const specificTopic = 'devices/org-123/device-456/telemetry';
      const testMessage = JSON.stringify({
        device_id: 'device-456',
        organization_id: 'org-123',
        timestamp: new Date().toISOString(),
        sensors: { ph: 7.2, temperature: 25.5 },
      });

      let messagesReceived = 0;

      subscriber.on('connect', () => {
        subscriber.subscribe(topicPattern, (err) => {
          if (err) {
            subscriber.end();
            publisher.end();
            return reject(err);
          }

          setTimeout(() => {
            publisher.on('connect', () => {
              publisher.publish(specificTopic, testMessage, (err) => {
                if (err) {
                  subscriber.end();
                  publisher.end();
                  return reject(err);
                }
              });
            });

            publisher.on('error', (err) => {
              subscriber.end();
              publisher.end();
              reject(err);
            });
          }, 500);
        });
      });

      subscriber.on('message', (topic, message) => {
        if (topic === specificTopic) {
          const parsed = JSON.parse(message.toString());
          messagesReceived++;
          expect(parsed.device_id).toBe('device-456');
          expect(parsed.sensors).toBeDefined();
          subscriber.end();
          publisher.end();
          expect(messagesReceived).toBe(1);
          resolve();
        }
      });

      subscriber.on('error', (err) => {
        publisher.end();
        reject(err);
      });

      setTimeout(() => {
        if (messagesReceived === 0) {
          subscriber.end();
          publisher.end();
          reject(new Error('Multi-level subscription timeout'));
        }
      }, 15000);
    });
  });

  it('should handle QoS levels correctly', async ({ skip }) => {
    if (!brokerUrl || !container) {
      return skip('MQTT broker container not available');
    }

    return new Promise<void>((resolve, reject) => {
      const subscriber = mqtt.connect(brokerUrl, {
        clientId: 'test-client-qos',
        reconnectPeriod: 0,
      });

      const publisher = mqtt.connect(brokerUrl, {
        clientId: 'test-client-qos-pub',
        reconnectPeriod: 0,
      });

      const testTopic = 'test/qos/message';
      const testMessage = 'QoS 1 message';
      let messageReceived = false;

      subscriber.on('connect', () => {
        // Subscribe with QoS 1
        subscriber.subscribe(testTopic, { qos: 1 }, (err) => {
          if (err) {
            subscriber.end();
            publisher.end();
            return reject(err);
          }

          setTimeout(() => {
            publisher.on('connect', () => {
              // Publish with QoS 1
              publisher.publish(testTopic, testMessage, { qos: 1 }, (err) => {
                if (err) {
                  subscriber.end();
                  publisher.end();
                  return reject(err);
                }
              });
            });
          }, 500);
        });
      });

      subscriber.on('message', (topic, message) => {
        if (topic === testTopic && message.toString() === testMessage) {
          messageReceived = true;
          subscriber.end();
          publisher.end();
          expect(messageReceived).toBe(true);
          resolve();
        }
      });

      setTimeout(() => {
        if (!messageReceived) {
          subscriber.end();
          publisher.end();
          reject(new Error('QoS message timeout'));
        }
      }, 15000);
    });
  });
});
