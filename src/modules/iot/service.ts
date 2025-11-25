import { db } from '@/db/index.js';
import { devices, telemetry, deviceAlerts } from '@/db/schema/index.js';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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

  async getTelemetry(deviceId: string, organizationId: string) {
    return await db.select()
      .from(telemetry)
      .where(and(eq(telemetry.organizationId, organizationId), eq(telemetry.deviceId, deviceId)))
      .orderBy(desc(telemetry.timestamp))
      .limit(100);
  }

  async getAlerts(organizationId: string) {
    return await db.select()
      .from(deviceAlerts)
      .where(eq(deviceAlerts.organizationId, organizationId))
      .orderBy(desc(deviceAlerts.createdAt));
  }

  async getLatestMetrics(organizationId: string) {
    // Get the most recent telemetry entry for the organization (across all devices)
    // Ideally we'd filter by device type = 'pool_controller'
    const [latest] = await db.select()
      .from(telemetry)
      .where(eq(telemetry.organizationId, organizationId))
      .orderBy(desc(telemetry.timestamp))
      .limit(1);

    // Get device count
    const deviceCount = await db.select()
      .from(devices)
      .where(eq(devices.organizationId, organizationId))
      .then(devices => devices.length);

    if (!latest) {
      return {
        poolTemp: 0,
        phLevel: 0,
        chlorine: 0,
        deviceCount
      };
    }

    return {
      poolTemp: Number(latest.temperature) || 0,
      phLevel: Number(latest.ph) || 0,
      chlorine: Number(latest.orp) || 0, // Using ORP as proxy for now
      deviceCount
    };
  }
}

export const iotService = new IoTService();

