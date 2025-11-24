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
}

export const iotService = new IoTService();

