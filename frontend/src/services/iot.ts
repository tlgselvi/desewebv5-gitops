/**
 * IoT Service
 * 
 * Handles all IoT device and telemetry API operations.
 * Errors are properly propagated to allow React Query to handle them.
 */

import { authenticatedGet, authenticatedPost, ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { Device, TelemetryData, Alert } from "@/types/iot";

// =============================================================================
// TYPES
// =============================================================================

export interface CreateDevicePayload {
  name: string;
  serialNumber: string;
  type: string;
}

export interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  error: number;
}

// =============================================================================
// SERVICE
// =============================================================================

export const iotService = {
  /**
   * Get all IoT devices
   * @throws {ApiError} When request fails
   */
  getDevices: async (): Promise<Device[]> => {
    try {
      return await authenticatedGet<Device[]>("/api/v1/iot/devices");
    } catch (error) {
      logger.error("Failed to fetch IoT devices", error);
      throw error; // Re-throw for React Query to handle
    }
  },

  /**
   * Get a single device by ID
   * @throws {ApiError} When request fails or device not found
   */
  getDevice: async (deviceId: string): Promise<Device> => {
    try {
      return await authenticatedGet<Device>(`/api/v1/iot/devices/${deviceId}`);
    } catch (error) {
      logger.error("Failed to fetch device", error, { deviceId });
      throw error;
    }
  },

  /**
   * Create a new IoT device
   * @throws {ApiError} When request fails or validation error
   */
  createDevice: async (data: CreateDevicePayload): Promise<Device> => {
    try {
      return await authenticatedPost<Device>("/api/v1/iot/devices", data);
    } catch (error) {
      logger.error("Failed to create device", error, { data });
      throw error;
    }
  },

  /**
   * Get telemetry data for a device
   * @param deviceId - The device ID to get telemetry for
   * @param options - Optional query parameters
   * @throws {ApiError} When request fails
   */
  getTelemetry: async (
    deviceId: string,
    options?: { limit?: number; from?: string; to?: string }
  ): Promise<TelemetryData[]> => {
    try {
      let url = `/api/v1/iot/telemetry/${deviceId}`;
      
      // Add query parameters if provided
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.from) params.append('from', options.from);
      if (options?.to) params.append('to', options.to);
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      return await authenticatedGet<TelemetryData[]>(url);
    } catch (error) {
      // Log but re-throw - let the consumer decide how to handle
      logger.error("Failed to fetch telemetry", error, { deviceId });
      throw error;
    }
  },

  /**
   * Get all active alerts
   * @throws {ApiError} When request fails
   */
  getAlerts: async (): Promise<Alert[]> => {
    try {
      return await authenticatedGet<Alert[]>("/api/v1/iot/alerts");
    } catch (error) {
      logger.error("Failed to fetch alerts", error);
      throw error;
    }
  },

  /**
   * Get alerts for a specific device
   * @throws {ApiError} When request fails
   */
  getDeviceAlerts: async (deviceId: string): Promise<Alert[]> => {
    try {
      return await authenticatedGet<Alert[]>(`/api/v1/iot/devices/${deviceId}/alerts`);
    } catch (error) {
      logger.error("Failed to fetch device alerts", error, { deviceId });
      throw error;
    }
  },

  /**
   * Resolve an alert
   * @throws {ApiError} When request fails
   */
  resolveAlert: async (alertId: string): Promise<Alert> => {
    try {
      return await authenticatedPost<Alert>(`/api/v1/iot/alerts/${alertId}/resolve`, {});
    } catch (error) {
      logger.error("Failed to resolve alert", error, { alertId });
      throw error;
    }
  },

  /**
   * Calculate device statistics from a list of devices
   * This is a client-side utility, not an API call
   */
  calculateStats: (devices: Device[]): DeviceStats => {
    return {
      total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      offline: devices.filter(d => d.status === 'offline').length,
      error: devices.filter(d => d.status === 'error').length,
    };
  },
};

export default iotService;
