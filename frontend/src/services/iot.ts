import { authenticatedGet, authenticatedPost } from "@/lib/api";
import { Device, TelemetryData, Alert } from "@/types/iot";

export const iotService = {
  /**
   * Tüm IoT cihazlarını getir
   */
  getDevices: async (): Promise<Device[]> => {
    return await authenticatedGet<Device[]>("/api/v1/iot/devices");
  },

  createDevice: async (data: { name: string; serialNumber: string; type: string }): Promise<Device> => {
    return await authenticatedPost<Device>("/api/v1/iot/devices", data);
  },

  getTelemetry: async (deviceId: string): Promise<TelemetryData[]> => {
    try {
      return await authenticatedGet<TelemetryData[]>(`/api/v1/iot/telemetry/${deviceId}`);
    } catch (error) {
      return [];
    }
  },

  getAlerts: async (): Promise<Alert[]> => {
    try {
      return await authenticatedGet<Alert[]>("/api/v1/iot/alerts");
    } catch (error) {
      return [];
    }
  }
};

