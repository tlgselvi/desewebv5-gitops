import mqtt, { MqttClient } from 'mqtt';
import { logger } from '@/utils/logger.js';
import { db } from '@/db/index.js';
import { telemetry, deviceAlerts, automationRules, devices, deviceCommands, deviceStatusHistory } from '@/db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

class MQTTClientService {
  private client: MqttClient | null = null;
  private isConnected = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://mosquitto:1883';
    
    logger.info('Connecting to MQTT Broker', { url: brokerUrl });
    
    // In a real scenario, credentials should be loaded from env
    this.client = mqtt.connect(brokerUrl, {
      reconnectPeriod: 5000, // Reconnect every 5 seconds
      clientId: `dese-backend-${Math.random().toString(16).substr(2, 8)}`,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('MQTT Broker Connected');
      this.subscribeToTopics();
    });

    this.client.on('error', (err) => {
      // Suppress verbose connection errors during dev if broker is offline
      if (process.env.NODE_ENV === 'development') {
        console.warn('MQTT Connection Error:', err.message);
      } else {
        logger.error('MQTT Connection Error', { error: err.message });
      }
    });

    this.client.on('close', () => {
      this.isConnected = false;
      // logger.warn('MQTT Connection Closed'); // Too noisy if broker is down
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message.toString());
    });
  }

  private subscribeToTopics() {
    if (!this.client) return;

    // Subscribe to all telemetry and alert topics
    // Topic structure: devices/{orgId}/{deviceId}/{type}
    // type: telemetry, alert, status, command_response
    const topics = [
      'devices/+/+/telemetry',
      'devices/+/+/alert',
      'devices/+/+/status',
      'devices/+/+/command_response'
    ];

    this.client.subscribe(topics, (err) => {
      if (err) {
        logger.error('Failed to subscribe to topics', { error: err.message });
      } else {
        logger.info('Subscribed to MQTT topics', { topics });
      }
    });
  }

  private async handleMessage(topic: string, messageStr: string) {
    try {
      const parts = topic.split('/');
      // devices/{orgId}/{deviceId}/{type}
      if (parts.length !== 4) return;

      const [prefix, organizationId, deviceId, type] = parts;
      if (!organizationId || !deviceId || !type) {
        logger.warn('Invalid MQTT topic format', { topic });
        return;
      }

      const payload = JSON.parse(messageStr);

      // Verbose logging only in debug mode
      // logger.debug('MQTT Message Received', { topic, type, deviceId });

      switch (type) {
        case 'telemetry':
          await this.processTelemetry(organizationId, deviceId, payload);
          break;
        case 'alert':
          await this.processAlert(organizationId, deviceId, payload);
          break;
        case 'status':
          await this.updateDeviceStatus(organizationId, deviceId, payload);
          break;
        case 'command_response':
          await this.processCommandResponse(organizationId, deviceId, payload);
          break;
      }

    } catch (error) {
      logger.error('Error handling MQTT message', { topic, error });
    }
  }

  private async processTelemetry(organizationId: string, deviceId: string, data: any) {
    // 1. Validate telemetry data
    if (!this.validateTelemetryData(data)) {
        logger.warn('Invalid telemetry data received', { deviceId, data });
        return;
    }

    // 2. Ensure device exists (auto-create for simulation convenience if dev mode)
    if (process.env.NODE_ENV === 'development') {
        await this.ensureDeviceExists(organizationId, deviceId);
    }

    // 3. Extract sensor data from sensors object or direct fields
    const sensors = data.sensors || {};
    const metadata = data.metadata || {};

    // 4. Save telemetry to DB
    await db.insert(telemetry).values({
        id: uuidv4(),
        organizationId,
        deviceId,
        timestamp: new Date(data.timestamp || new Date()),
        temperature: sensors.temperature?.toString() || data.temperature?.toString(),
        ph: sensors.ph?.toString() || data.ph?.toString(),
        orp: sensors.orp?.toString() || data.orp?.toString(),
        tds: sensors.tds?.toString() || data.tds?.toString(),
        flowRate: sensors.flow_rate?.toString() || data.flowRate?.toString(),
        data: data // Store full raw data as well
    });

    // 5. Check Automation Rules (pass full data including sensors object)
    await this.checkAutomationRules(organizationId, deviceId, { ...data, sensors });

    // 6. Check for alert conditions
    await this.checkAlertConditions(organizationId, deviceId, sensors, metadata);
  }

  private validateTelemetryData(data: any): boolean {
    // Validate required fields
    if (!data.device_id && !data.deviceId) {
        return false;
    }
    if (!data.organization_id && !data.organizationId) {
        return false;
    }
    if (!data.timestamp) {
        return false;
    }

    // Validate sensor data exists
    const sensors = data.sensors || data;
    if (!sensors.ph && !sensors.temperature && !sensors.chlorine) {
        // At least one sensor reading should be present
        return false;
    }

    return true;
  }

  private async checkAlertConditions(organizationId: string, deviceId: string, sensors: any, metadata: any) {
    // Check for critical sensor values
    if (sensors.ph !== undefined) {
        const ph = Number(sensors.ph);
        if (ph < 6.5 || ph > 8.5) {
            await db.insert(deviceAlerts).values({
                id: uuidv4(),
                organizationId,
                deviceId,
                severity: ph < 6.0 || ph > 9.0 ? 'critical' : 'warning',
                message: `pH level out of range: ${ph.toFixed(2)}`,
                isResolved: false
            });
        }
    }

    if (sensors.temperature !== undefined) {
        const temp = Number(sensors.temperature);
        if (temp < 10 || temp > 40) {
            await db.insert(deviceAlerts).values({
                id: uuidv4(),
                organizationId,
                deviceId,
                severity: temp < 5 || temp > 45 ? 'critical' : 'warning',
                message: `Temperature out of range: ${temp.toFixed(2)}°C`,
                isResolved: false
            });
        }
    }

    // Check battery level
    if (metadata.battery !== undefined) {
        const battery = Number(metadata.battery);
        if (battery < 20) {
            await db.insert(deviceAlerts).values({
                id: uuidv4(),
                organizationId,
                deviceId,
                severity: battery < 10 ? 'critical' : 'warning',
                message: `Low battery: ${battery}%`,
                isResolved: false
            });
        }
    }
  }

  private async ensureDeviceExists(organizationId: string, deviceId: string) {
      const [existing] = await db.select().from(devices).where(eq(devices.id, deviceId));
      if (!existing) {
          logger.info(`[Auto-Discovery] Creating new device: ${deviceId}`);
          await db.insert(devices).values({
              id: deviceId,
              organizationId,
              name: `New Device (${deviceId.substring(0,6)})`,
              serialNumber: deviceId, // Use ID as serial for simplicity
              type: 'pool_controller',
              status: 'online',
              isActive: true
          });
      } else {
          // Update last seen
          await db.update(devices).set({ lastSeen: new Date(), status: 'online' }).where(eq(devices.id, deviceId));
      }
  }

  private async checkAutomationRules(organizationId: string, deviceId: string, data: any) {
    // Enhanced rule engine with better condition parsing
    const rules = await db.select().from(automationRules)
        .where(and(
            eq(automationRules.organizationId, organizationId),
            eq(automationRules.deviceId, deviceId),
            eq(automationRules.isActive, true)
        ));

    for (const rule of rules) {
        try {
            // Parse condition - support: "ph > 7.6", "temperature < 25", "ph >= 7.0", etc.
            const condition = rule.condition.trim();
            const operators = ['>=', '<=', '==', '!=', '>', '<'];
            let operator = '';
            let parts: string[] = [];

            for (const op of operators) {
                if (condition.includes(op)) {
                    operator = op;
                    parts = condition.split(op).map(p => p.trim());
                    break;
                }
            }

            if (!operator || parts.length !== 2) {
                logger.warn('Invalid rule condition format', { ruleId: rule.id, condition });
                continue;
            }

            const metric = parts[0];
            const threshold = Number(parts[1]);

            if (isNaN(threshold)) {
                logger.warn('Invalid threshold value in rule', { ruleId: rule.id, threshold: parts[1] });
                continue;
            }

            // Get metric value from sensors object or direct data
            let metricValue: number | undefined;
            if (data.sensors && data.sensors[metric]) {
                metricValue = Number(data.sensors[metric]);
            } else if (data[metric]) {
                metricValue = Number(data[metric]);
            }

            if (metricValue === undefined) {
                continue; // Metric not available in this reading
            }

            // Evaluate condition
            let triggered = false;
            switch (operator) {
                case '>':
                    triggered = metricValue > threshold;
                    break;
                case '<':
                    triggered = metricValue < threshold;
                    break;
                case '>=':
                    triggered = metricValue >= threshold;
                    break;
                case '<=':
                    triggered = metricValue <= threshold;
                    break;
                case '==':
                    triggered = Math.abs(metricValue - threshold) < 0.01; // Float comparison
                    break;
                case '!=':
                    triggered = Math.abs(metricValue - threshold) >= 0.01;
                    break;
            }

            if (triggered) {
                logger.info('Automation Rule Triggered', { 
                    ruleId: rule.id, 
                    action: rule.action,
                    condition: rule.condition,
                    metricValue,
                    threshold
                });
                await this.executeAction(organizationId, deviceId, rule.action, rule.id);
            }
        } catch (e) {
            logger.warn('Failed to evaluate rule', { 
                ruleId: rule.id, 
                error: e instanceof Error ? e.message : String(e) 
            });
        }
    }
  }

  private async executeAction(organizationId: string, deviceId: string, action: string, ruleId?: string) {
      // Parse action - format: "command_name:param1=value1,param2=value2"
      const actionParts = action.split(':');
      const command = actionParts[0];
      const params: Record<string, unknown> = {};

      if (actionParts.length > 1) {
          const paramString = actionParts[1];
          const paramPairs = paramString.split(',');
          for (const pair of paramPairs) {
              const [key, value] = pair.split('=');
              if (key && value) {
                  // Try to parse as number, otherwise keep as string
                  const numValue = Number(value);
                  params[key] = isNaN(numValue) ? value : numValue;
              }
          }
      }

      // Publish command to device via MQTT
      const topic = `devices/${organizationId}/${deviceId}/commands`;
      const commandId = `auto-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const payload = JSON.stringify({
          command_id: commandId,
          device_id: deviceId,
          command,
          parameters: params,
          timestamp: new Date().toISOString(),
          source: 'automation',
          rule_id: ruleId
      });
      
      this.publish(topic, payload);
      
      logger.info('Automation action executed', {
          organizationId,
          deviceId,
          command,
          params,
          ruleId,
          commandId
      });
  }

  private async processAlert(organizationId: string, deviceId: string, data: any) {
      await db.insert(deviceAlerts).values({
          id: uuidv4(),
          organizationId,
          deviceId,
          severity: data.severity || 'info',
          message: data.message,
          isResolved: false
      });
  }

  private async updateDeviceStatus(organizationId: string, deviceId: string, payload: any) {
      const status = payload.status || 'online';
      const batteryLevel = payload.battery;
      const signalStrength = payload.signal_strength;
      const firmwareVersion = payload.firmware_version;

      // Update device status
      await db.update(devices)
        .set({ 
          status, 
          lastSeen: new Date(),
          firmwareVersion: firmwareVersion || undefined
        })
        .where(eq(devices.id, deviceId));

      // Save status history
      await db.insert(deviceStatusHistory).values({
        id: uuidv4(),
        organizationId,
        deviceId,
        status,
        batteryLevel: batteryLevel ? parseInt(String(batteryLevel)) : undefined,
        signalStrength: signalStrength ? parseInt(String(signalStrength)) : undefined,
        firmwareVersion,
        metadata: payload,
        timestamp: new Date()
      });
  }

  private async processCommandResponse(organizationId: string, deviceId: string, payload: any) {
      const commandId = payload.command_id;
      if (!commandId) {
        logger.warn('Command response missing command_id', { deviceId, payload });
        return;
      }

      // Find command record
      const [command] = await db.select()
        .from(deviceCommands)
        .where(and(
          eq(deviceCommands.commandId, commandId),
          eq(deviceCommands.deviceId, deviceId),
          eq(deviceCommands.organizationId, organizationId)
        ))
        .limit(1);

      if (!command) {
        logger.warn('Command not found for response', { commandId, deviceId });
        return;
      }

      // Update command status
      const status = payload.success ? 'executed' : 'failed';
      await db.update(deviceCommands)
        .set({
          status,
          response: payload.response || payload,
          error: payload.error || null,
          executedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(deviceCommands.id, command.id));

      logger.info('Command response processed', { commandId, status, deviceId });
  }

  public publish(topic: string, message: string) {
    if (this.client && this.isConnected) {
      this.client.publish(topic, message);
    } else {
      // logger.warn('Cannot publish, MQTT client not connected');
    }
  }
}

export const mqttClient = new MQTTClientService();
