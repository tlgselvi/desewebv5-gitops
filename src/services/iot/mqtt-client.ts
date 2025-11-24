import mqtt, { MqttClient } from 'mqtt';
import { logger } from '@/utils/logger.js';
import { db } from '@/db/index.js';
import { telemetry, deviceAlerts, automationRules, devices } from '@/db/schema/index.js';
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
      logger.error('MQTT Connection Error', { error: err.message });
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('MQTT Connection Closed');
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message.toString());
    });
  }

  private subscribeToTopics() {
    if (!this.client) return;

    // Subscribe to all telemetry and alert topics
    // Topic structure: devices/{organizationId}/{deviceId}/{type}
    // type: telemetry, alert, status
    const topics = [
      'devices/+/+/telemetry',
      'devices/+/+/alert',
      'devices/+/+/status'
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
      const payload = JSON.parse(messageStr);

      logger.debug('MQTT Message Received', { topic, type, deviceId });

      switch (type) {
        case 'telemetry':
          await this.processTelemetry(organizationId, deviceId, payload);
          break;
        case 'alert':
          await this.processAlert(organizationId, deviceId, payload);
          break;
        case 'status':
          await this.updateDeviceStatus(deviceId, payload.status);
          break;
      }

    } catch (error) {
      logger.error('Error handling MQTT message', { topic, error });
    }
  }

  private async processTelemetry(organizationId: string, deviceId: string, data: any) {
    // 1. Save telemetry to DB
    await db.insert(telemetry).values({
        id: uuidv4(),
        organizationId,
        deviceId,
        timestamp: new Date(),
        temperature: data.temperature?.toString(),
        ph: data.ph?.toString(),
        orp: data.orp,
        tds: data.tds,
        flowRate: data.flowRate?.toString(),
        data: data // Store full raw data as well
    });

    // 2. Check Automation Rules
    await this.checkAutomationRules(organizationId, deviceId, data);
  }

  private async checkAutomationRules(organizationId: string, deviceId: string, data: any) {
    // Simple rule engine
    const rules = await db.select().from(automationRules)
        .where(and(
            eq(automationRules.organizationId, organizationId),
            eq(automationRules.deviceId, deviceId),
            eq(automationRules.isActive, true)
        ));

    for (const rule of rules) {
        // Safe eval or parsing logic here. For MVP we support simple comparisons like "ph > 7.6"
        // This is a simplified example.
        try {
            const [metric, operator, value] = rule.condition.split(' ');
            const metricValue = data[metric];
            
            let triggered = false;
            if (operator === '>' && Number(metricValue) > Number(value)) triggered = true;
            if (operator === '<' && Number(metricValue) < Number(value)) triggered = true;
            
            if (triggered) {
                logger.info('Automation Rule Triggered', { ruleId: rule.id, action: rule.action });
                await this.executeAction(organizationId, deviceId, rule.action);
            }
        } catch (e) {
            logger.warn('Failed to evaluate rule', { ruleId: rule.id });
        }
    }
  }

  private async executeAction(organizationId: string, deviceId: string, action: string) {
      // Publish command back to device
      // Topic: devices/{orgId}/{deviceId}/command
      const topic = `devices/${organizationId}/${deviceId}/command`;
      const payload = JSON.stringify({ action, timestamp: new Date().toISOString() });
      
      this.publish(topic, payload);
      
      // Log action (could be a separate table 'actions_log')
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

  private async updateDeviceStatus(deviceId: string, status: string) {
      await db.update(devices)
        .set({ status, lastSeen: new Date() })
        .where(eq(devices.id, deviceId));
  }

  public publish(topic: string, message: string) {
    if (this.client && this.isConnected) {
      this.client.publish(topic, message);
    } else {
      logger.warn('Cannot publish, MQTT client not connected');
    }
  }
}

export const mqttClient = new MQTTClientService();

