import { db } from '@/db/index.js';
import { devices, telemetry, deviceAlerts, deviceCommands, deviceStatusHistory } from '@/db/schema/index.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { mqttClient } from '@/services/iot/mqtt-client.js';

export interface CreateDeviceDTO {
  name: string;
  serialNumber: string;
  type: string;
  model?: string;
}

export class IoTService {
  async getDevices(organizationId: string) {
    return await db.select().from(devices).where(eq(devices.organizationId, organizationId));
  }

  async createDevice(data: CreateDeviceDTO, organizationId: string) {
     const [newDevice] = await db.insert(devices).values({
        id: uuidv4(),
        ...data,
        organizationId,
        isActive: true,
        status: 'offline'
      }).returning();
      return newDevice;
  }

  /**
   * Get telemetry data for a device
   * Optimized: Supports pagination and date filtering
   */
  async getTelemetry(
    deviceId: string, 
    organizationId: string,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const limit = options?.limit || 100;
    const conditions = [
      eq(telemetry.organizationId, organizationId),
      eq(telemetry.deviceId, deviceId)
    ];

    if (options?.startDate) {
      conditions.push(sql`${telemetry.timestamp} >= ${options.startDate}`);
    }
    if (options?.endDate) {
      conditions.push(sql`${telemetry.timestamp} <= ${options.endDate}`);
    }

    return await db.select()
      .from(telemetry)
      .where(and(...conditions))
      .orderBy(desc(telemetry.timestamp))
      .limit(limit);
  }

  async getAlerts(organizationId: string) {
    return await db.select()
      .from(deviceAlerts)
      .where(eq(deviceAlerts.organizationId, organizationId))
      .orderBy(desc(deviceAlerts.createdAt));
  }

  /**
   * Get latest metrics for organization
   * Optimized: Uses single query with subquery for device count
   */
  async getLatestMetrics(organizationId: string) {
    // Optimized: Get latest telemetry and device count in parallel
    const [latest, deviceCountResult] = await Promise.all([
      db.select()
        .from(telemetry)
        .where(eq(telemetry.organizationId, organizationId))
        .orderBy(desc(telemetry.timestamp))
        .limit(1),
      db.select({ count: sql<number>`count(*)` })
        .from(devices)
        .where(eq(devices.organizationId, organizationId))
    ]);

    const deviceCount = Number(deviceCountResult[0]?.count || 0);

    if (!latest || latest.length === 0) {
      return {
        poolTemp: 0,
        phLevel: 0,
        chlorine: 0,
        deviceCount
      };
    }

    const latestTelemetry = latest[0];
    return {
      poolTemp: Number(latestTelemetry.temperature) || 0,
      phLevel: Number(latestTelemetry.ph) || 0,
      chlorine: Number(latestTelemetry.orp) || 0, // Using ORP as proxy for now
      deviceCount
    };
  }

  /**
   * Send command to device via MQTT
   */
  async sendCommand(
    deviceId: string,
    organizationId: string,
    command: string,
    parameters: Record<string, unknown>,
    timeoutSeconds: number = 30
  ) {
    // Verify device exists and belongs to organization
    const [device] = await db.select()
      .from(devices)
      .where(and(
        eq(devices.id, deviceId),
        eq(devices.organizationId, organizationId),
        eq(devices.isActive, true)
      ));

    if (!device) {
      throw new Error('Device not found or inactive');
    }

    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const timeoutAt = new Date(Date.now() + timeoutSeconds * 1000);

    // Create command record
    const [commandRecord] = await db.insert(deviceCommands).values({
      id: uuidv4(),
      organizationId,
      deviceId,
      commandId,
      command,
      parameters,
      status: 'pending',
      timeoutAt,
    }).returning();

    // Send command via MQTT
    const topic = `devices/${organizationId}/${deviceId}/commands`;
    const payload = JSON.stringify({
      command_id: commandId,
      device_id: deviceId,
      command,
      parameters,
      timestamp: new Date().toISOString(),
    });

    mqttClient.publish(topic, payload);

    // Update command status to sent
    await db.update(deviceCommands)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(deviceCommands.id, commandRecord.id));

    return commandRecord;
  }

  /**
   * Get device commands
   */
  async getCommands(
    deviceId: string,
    organizationId: string,
    options?: {
      limit?: number;
      status?: string;
    }
  ) {
    const limit = options?.limit || 50;
    const conditions = [
      eq(deviceCommands.organizationId, organizationId),
      eq(deviceCommands.deviceId, deviceId)
    ];

    if (options?.status) {
      conditions.push(eq(deviceCommands.status, options.status));
    }

    return await db.select()
      .from(deviceCommands)
      .where(and(...conditions))
      .orderBy(desc(deviceCommands.createdAt))
      .limit(limit);
  }

  /**
   * Get device status history
   */
  async getStatusHistory(
    deviceId: string,
    organizationId: string,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const limit = options?.limit || 100;
    const conditions = [
      eq(deviceStatusHistory.organizationId, organizationId),
      eq(deviceStatusHistory.deviceId, deviceId)
    ];

    if (options?.startDate) {
      conditions.push(sql`${deviceStatusHistory.timestamp} >= ${options.startDate}`);
    }
    if (options?.endDate) {
      conditions.push(sql`${deviceStatusHistory.timestamp} <= ${options.endDate}`);
    }

    return await db.select()
      .from(deviceStatusHistory)
      .where(and(...conditions))
      .orderBy(desc(deviceStatusHistory.timestamp))
      .limit(limit);
  }

  /**
   * Update device configuration
   */
  async updateDeviceConfig(
    deviceId: string,
    organizationId: string,
    config: Record<string, unknown>
  ) {
    // Verify device exists and belongs to organization
    const [device] = await db.select()
      .from(devices)
      .where(and(
        eq(devices.id, deviceId),
        eq(devices.organizationId, organizationId)
      ));

    if (!device) {
      throw new Error('Device not found');
    }

    // Update device config in database
    const [updatedDevice] = await db.update(devices)
      .set({
        config: config,
        updatedAt: new Date()
      })
      .where(eq(devices.id, deviceId))
      .returning();

    // Send config update command via MQTT
    const topic = `devices/${organizationId}/${deviceId}/config`;
    const payload = JSON.stringify({
      device_id: deviceId,
      config,
      timestamp: new Date().toISOString(),
    });

    mqttClient.publish(topic, payload);

    return updatedDevice;
  }

  /**
   * Get device health metrics
   */
  async getDeviceHealth(deviceId: string, organizationId: string) {
    // Get latest status
    const [latestStatus] = await db.select()
      .from(deviceStatusHistory)
      .where(and(
        eq(deviceStatusHistory.deviceId, deviceId),
        eq(deviceStatusHistory.organizationId, organizationId)
      ))
      .orderBy(desc(deviceStatusHistory.timestamp))
      .limit(1);

    // Get device info
    const [device] = await db.select()
      .from(devices)
      .where(and(
        eq(devices.id, deviceId),
        eq(devices.organizationId, organizationId)
      ));

    if (!device) {
      throw new Error('Device not found');
    }

    // Calculate connection stability (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const statusHistory = await db.select()
      .from(deviceStatusHistory)
      .where(and(
        eq(deviceStatusHistory.deviceId, deviceId),
        eq(deviceStatusHistory.organizationId, organizationId),
        sql`${deviceStatusHistory.timestamp} >= ${oneDayAgo}`
      ));

    const onlineCount = statusHistory.filter(s => s.status === 'online').length;
    const connectionStability = statusHistory.length > 0 
      ? (onlineCount / statusHistory.length) * 100 
      : 0;

    // Get recent alerts
    const recentAlerts = await db.select()
      .from(deviceAlerts)
      .where(and(
        eq(deviceAlerts.deviceId, deviceId),
        eq(deviceAlerts.organizationId, organizationId),
        eq(deviceAlerts.isResolved, false)
      ))
      .orderBy(desc(deviceAlerts.createdAt))
      .limit(10);

    // Calculate uptime (time since last seen)
    const uptime = device.lastSeen 
      ? Math.floor((Date.now() - device.lastSeen.getTime()) / 1000)
      : 0;

    return {
      deviceId,
      status: device.status,
      firmwareVersion: device.firmwareVersion || 'unknown',
      batteryLevel: latestStatus?.batteryLevel || null,
      signalStrength: latestStatus?.signalStrength || null,
      connectionStability: Math.round(connectionStability * 100) / 100,
      uptime,
      lastSeen: device.lastSeen,
      activeAlerts: recentAlerts.length,
      alerts: recentAlerts,
    };
  }

  /**
   * Get dashboard summary for organization
   */
  async getDashboardSummary(organizationId: string) {
    // Get all devices
    const allDevices = await db.select()
      .from(devices)
      .where(eq(devices.organizationId, organizationId));

    // Get device counts by status
    const onlineCount = allDevices.filter(d => d.status === 'online').length;
    const offlineCount = allDevices.filter(d => d.status === 'offline').length;
    const errorCount = allDevices.filter(d => d.status === 'error').length;

    // Get active alerts
    const activeAlerts = await db.select()
      .from(deviceAlerts)
      .where(and(
        eq(deviceAlerts.organizationId, organizationId),
        eq(deviceAlerts.isResolved, false)
      ));

    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = activeAlerts.filter(a => a.severity === 'warning').length;

    // Get latest telemetry for each device
    const latestTelemetry = await Promise.all(
      allDevices.map(async (device) => {
        const [latest] = await db.select()
          .from(telemetry)
          .where(and(
            eq(telemetry.deviceId, device.id),
            eq(telemetry.organizationId, organizationId)
          ))
          .orderBy(desc(telemetry.timestamp))
          .limit(1);

        return {
          deviceId: device.id,
          deviceName: device.name,
          status: device.status,
          lastTelemetry: latest?.timestamp || null,
          latestReadings: latest ? {
            ph: latest.ph ? Number(latest.ph) : null,
            temperature: latest.temperature ? Number(latest.temperature) : null,
            chlorine: latest.orp ? Number(latest.orp) / 100 : null, // Approximate conversion
          } : null,
        };
      })
    );

    return {
      totalDevices: allDevices.length,
      onlineDevices: onlineCount,
      offlineDevices: offlineCount,
      errorDevices: errorCount,
      activeAlerts: activeAlerts.length,
      criticalAlerts,
      warningAlerts,
      devices: latestTelemetry,
    };
  }

  /**
   * Check and generate alerts for device health issues
   */
  async checkDeviceHealth(organizationId: string) {
    const deviceList = await db.select()
      .from(devices)
      .where(and(
        eq(devices.organizationId, organizationId),
        eq(devices.isActive, true)
      ));

    const alerts: Array<{ deviceId: string; severity: string; message: string }> = [];

    for (const device of deviceList) {
      // Check if device is offline for too long (5 minutes)
      if (device.status === 'offline' && device.lastSeen) {
        const offlineDuration = Date.now() - device.lastSeen.getTime();
        if (offlineDuration > 5 * 60 * 1000) {
          alerts.push({
            deviceId: device.id,
            severity: 'warning',
            message: `Device has been offline for ${Math.floor(offlineDuration / 60000)} minutes`,
          });
        }
      }

      // Check battery level
      const [latestStatus] = await db.select()
        .from(deviceStatusHistory)
        .where(eq(deviceStatusHistory.deviceId, device.id))
        .orderBy(desc(deviceStatusHistory.timestamp))
        .limit(1);

      if (latestStatus?.batteryLevel !== null && latestStatus.batteryLevel < 20) {
        alerts.push({
          deviceId: device.id,
          severity: latestStatus.batteryLevel < 10 ? 'critical' : 'warning',
          message: `Low battery: ${latestStatus.batteryLevel}%`,
        });
      }

      // Check signal strength
      if (latestStatus?.signalStrength !== null && latestStatus.signalStrength < -80) {
        alerts.push({
          deviceId: device.id,
          severity: 'warning',
          message: `Weak signal: ${latestStatus.signalStrength} dBm`,
        });
      }
    }

    // Create alerts in database
    for (const alert of alerts) {
      // Check if alert already exists
      const [existing] = await db.select()
        .from(deviceAlerts)
        .where(and(
          eq(deviceAlerts.deviceId, alert.deviceId),
          eq(deviceAlerts.organizationId, organizationId),
          eq(deviceAlerts.message, alert.message),
          eq(deviceAlerts.isResolved, false)
        ))
        .limit(1);

      if (!existing) {
        await db.insert(deviceAlerts).values({
          id: uuidv4(),
          organizationId,
          deviceId: alert.deviceId,
          severity: alert.severity as 'info' | 'warning' | 'critical',
          message: alert.message,
          isResolved: false,
        });
      }
    }

    return alerts;
  }
}

export const iotService = new IoTService();

