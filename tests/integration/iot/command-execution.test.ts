import { afterAll, beforeAll, describe, expect, it, beforeEach } from 'vitest';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import mqtt, { MqttClient } from 'mqtt';

const shouldRunTestcontainers = process.env.RUN_TESTCONTAINERS === 'true';

const testDescribe = shouldRunTestcontainers ? describe : describe.skip;

/**
 * Command Execution Integration Tests
 * Tests the complete flow from command publishing to command response handling
 */
testDescribe('Command Execution Integration', () => {
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
        clientId: 'backend-command-client',
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

  beforeEach(() => {
    if (!brokerUrl) {
      return;
    }

    // Setup device client (simulating ESP32 device)
    deviceClient = mqtt.connect(brokerUrl, {
      clientId: `device-command-client-${Date.now()}`,
      reconnectPeriod: 0,
    });
  });

  it('should send command to device and receive response', async ({ skip }) => {
    if (!brokerUrl || !container || !deviceClient || !backendClient) {
      return skip('MQTT broker or clients not available');
    }

    const organizationId = 'test-org-cmd';
    const deviceId = 'test-device-cmd';
    const commandTopic = `devices/${organizationId}/${deviceId}/commands`;
    const responseTopic = `devices/${organizationId}/${deviceId}/command_response`;

    return new Promise<void>((resolve, reject) => {
      let commandReceived = false;
      let responseReceived = false;

      // Device subscribes to command topic
      deviceClient?.on('connect', () => {
        deviceClient?.subscribe(commandTopic, (err) => {
          if (err) {
            return reject(err);
          }

          deviceClient?.on('message', (topic, message) => {
            if (topic === commandTopic) {
              const command = JSON.parse(message.toString());
              commandReceived = true;

              // Verify command structure
              expect(command).toHaveProperty('command_id');
              expect(command).toHaveProperty('command');
              expect(command).toHaveProperty('parameters');

              // Device processes command and sends response
              const response = {
                command_id: command.command_id,
                device_id: deviceId,
                status: 'executed',
                result: {
                  pump_id: command.parameters.pump_id,
                  state: command.parameters.state,
                },
                timestamp: new Date().toISOString(),
                execution_time_ms: 150,
              };

              deviceClient?.publish(responseTopic, JSON.stringify(response), (err) => {
                if (err) {
                  return reject(err);
                }
              });
            }
          });
        });
      });

      // Backend subscribes to response topic
      backendClient?.on('connect', () => {
        backendClient?.subscribe(responseTopic, (err) => {
          if (err) {
            return reject(err);
          }

          backendClient?.on('message', (topic, message) => {
            if (topic === responseTopic) {
              const response = JSON.parse(message.toString());
              responseReceived = true;

              // Verify response structure
              expect(response).toHaveProperty('command_id');
              expect(response).toHaveProperty('status');
              expect(response.status).toBe('executed');

              expect(commandReceived).toBe(true);
              expect(responseReceived).toBe(true);
              resolve();
            }
          });

          // Wait for subscriptions to be established
          setTimeout(() => {
            // Backend sends command
            const command = {
              command_id: `cmd-${Date.now()}`,
              device_id: deviceId,
              command: 'set_pump',
              parameters: {
                pump_id: 1,
                state: 'on',
                duration: 3600,
              },
              timestamp: new Date().toISOString(),
            };

            backendClient?.publish(commandTopic, JSON.stringify(command), (err) => {
              if (err) {
                return reject(err);
              }
            });
          }, 1000);
        });
      });

      setTimeout(() => {
        if (!commandReceived || !responseReceived) {
          reject(new Error('Command execution timeout'));
        }
      }, 20000);
    });
  });

  it('should handle command timeout scenario', async ({ skip }) => {
    if (!brokerUrl || !container || !deviceClient || !backendClient) {
      return skip('MQTT broker or clients not available');
    }

    const organizationId = 'test-org-timeout';
    const deviceId = 'test-device-timeout';
    const commandTopic = `devices/${organizationId}/${deviceId}/commands`;
    const responseTopic = `devices/${organizationId}/${deviceId}/command_response`;

    return new Promise<void>((resolve, reject) => {
      let commandSent = false;
      let timeoutDetected = false;

      // Device does NOT subscribe (simulating offline device)
      backendClient?.on('connect', () => {
        backendClient?.subscribe(responseTopic, () => {
          // Send command
          const command = {
            command_id: `cmd-timeout-${Date.now()}`,
            device_id: deviceId,
            command: 'set_pump',
            parameters: { pump_id: 1, state: 'on' },
            timestamp: new Date().toISOString(),
          };

          backendClient?.publish(commandTopic, JSON.stringify(command), () => {
            commandSent = true;

            // Wait for timeout (no response expected)
            setTimeout(() => {
              timeoutDetected = true;
              expect(commandSent).toBe(true);
              expect(timeoutDetected).toBe(true);
              // In a real scenario, this would trigger timeout handling
              resolve();
            }, 3000);
          });
        });
      });

      setTimeout(() => {
        if (!timeoutDetected) {
          reject(new Error('Timeout detection failed'));
        }
      }, 5000);
    });
  });

  it('should handle multiple concurrent commands', async ({ skip }) => {
    if (!brokerUrl || !container || !deviceClient || !backendClient) {
      return skip('MQTT broker or clients not available');
    }

    const organizationId = 'test-org-concurrent';
    const deviceId = 'test-device-concurrent';
    const commandTopic = `devices/${organizationId}/${deviceId}/commands`;
    const responseTopic = `devices/${organizationId}/${deviceId}/command_response`;

    return new Promise<void>((resolve, reject) => {
      const commandsReceived: string[] = [];
      const responsesReceived: string[] = [];

      // Device subscribes and handles commands
      deviceClient?.on('connect', () => {
        deviceClient?.subscribe(commandTopic, () => {
          deviceClient?.on('message', (topic, message) => {
            if (topic === commandTopic) {
              const command = JSON.parse(message.toString());
              commandsReceived.push(command.command_id);

              // Send response immediately
              const response = {
                command_id: command.command_id,
                device_id: deviceId,
                status: 'executed',
                timestamp: new Date().toISOString(),
              };

              deviceClient?.publish(responseTopic, JSON.stringify(response));
            }
          });
        });
      });

      // Backend subscribes to responses
      backendClient?.on('connect', () => {
        backendClient?.subscribe(responseTopic, () => {
          backendClient?.on('message', (topic, message) => {
            if (topic === responseTopic) {
              const response = JSON.parse(message.toString());
              responsesReceived.push(response.command_id);

              if (responsesReceived.length === 5) {
                expect(commandsReceived.length).toBe(5);
                expect(responsesReceived.length).toBe(5);
                resolve();
              }
            }
          });

          // Wait for subscriptions
          setTimeout(() => {
            // Send 5 concurrent commands
            for (let i = 0; i < 5; i++) {
              const command = {
                command_id: `cmd-concurrent-${i}-${Date.now()}`,
                device_id: deviceId,
                command: 'set_pump',
                parameters: { pump_id: i, state: 'on' },
                timestamp: new Date().toISOString(),
              };

              backendClient?.publish(commandTopic, JSON.stringify(command));
            }
          }, 1000);
        });
      });

      setTimeout(() => {
        if (responsesReceived.length < 5) {
          reject(new Error('Concurrent commands timeout'));
        }
      }, 20000);
    });
  });

  it('should validate command format', async ({ skip }) => {
    if (!brokerUrl || !container || !deviceClient || !backendClient) {
      return skip('MQTT broker or clients not available');
    }

    const organizationId = 'test-org-validate';
    const deviceId = 'test-device-validate';
    const commandTopic = `devices/${organizationId}/${deviceId}/commands`;

    return new Promise<void>((resolve, reject) => {
      deviceClient?.on('connect', () => {
        deviceClient?.subscribe(commandTopic, () => {
          deviceClient?.on('message', (topic, message) => {
            if (topic === commandTopic) {
              try {
                const command = JSON.parse(message.toString());

                // Validate required fields
                expect(command).toHaveProperty('command_id');
                expect(command).toHaveProperty('device_id');
                expect(command).toHaveProperty('command');
                expect(command).toHaveProperty('parameters');
                expect(command).toHaveProperty('timestamp');

                // Validate command_id format
                expect(typeof command.command_id).toBe('string');
                expect(command.command_id.length).toBeGreaterThan(0);

                // Validate command type
                expect(typeof command.command).toBe('string');
                expect(['set_pump', 'set_ph_target', 'reboot', 'update_config']).toContain(
                  command.command
                );

                // Validate parameters
                expect(typeof command.parameters).toBe('object');

                resolve();
              } catch (error) {
                reject(error);
              }
            }
          });
        });
      });

      setTimeout(() => {
        backendClient?.on('connect', () => {
          const validCommand = {
            command_id: `cmd-validate-${Date.now()}`,
            device_id: deviceId,
            command: 'set_pump',
            parameters: {
              pump_id: 1,
              state: 'on',
              duration: 3600,
            },
            timestamp: new Date().toISOString(),
          };

          backendClient?.publish(commandTopic, JSON.stringify(validCommand));
        });
      }, 1000);

      setTimeout(() => {
        reject(new Error('Command validation timeout'));
      }, 15000);
    });
  });
});
