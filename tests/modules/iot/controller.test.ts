import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { IoTController } from '@/modules/iot/controller.js';
import { iotService } from '@/modules/iot/service.js';

// Mock dependencies
vi.mock('@/modules/iot/service.js', () => ({
  iotService: {
    getDevices: vi.fn(),
    createDevice: vi.fn(),
    getTelemetry: vi.fn(),
    getAlerts: vi.fn(),
  },
}));

describe('IoT Controller - Error Handling Branch Tests', () => {
  let controller: IoTController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new IoTController();

    mockReq = {
      params: {},
      body: {},
      user: {
        id: 'user-1',
        organizationId: 'org-1',
      } as any,
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('getDevices', () => {
    it('should handle service error', async () => {
      vi.mocked(iotService.getDevices).mockRejectedValue(new Error('Service error'));

      await expect(
        controller.getDevices(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return devices successfully', async () => {
      const mockDevices = [{ id: 'device-1', name: 'Sensor 1' }];
      vi.mocked(iotService.getDevices).mockResolvedValue(mockDevices as any);

      await controller.getDevices(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockDevices);
    });
  });

  describe('createDevice', () => {
    it('should return 400 when validation fails', async () => {
      mockReq.body = {
        // Missing required fields
        name: 'Sensor 1',
      };

      await expect(
        controller.createDevice(mockReq as Request, mockRes as Response)
      ).rejects.toThrow();
    });

    it('should handle service error', async () => {
      mockReq.body = {
        name: 'Sensor 1',
        serialNumber: 'SN001',
        type: 'sensor',
      };
      vi.mocked(iotService.createDevice).mockRejectedValue(new Error('Service error'));

      await expect(
        controller.createDevice(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return device when created successfully', async () => {
      mockReq.body = {
        name: 'Sensor 1',
        serialNumber: 'SN001',
        type: 'sensor',
      };
      const mockDevice = { id: 'device-1', name: 'Sensor 1' };
      vi.mocked(iotService.createDevice).mockResolvedValue(mockDevice as any);

      await controller.createDevice(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockDevice);
    });

    it('should include optional model field when provided', async () => {
      mockReq.body = {
        name: 'Sensor 1',
        serialNumber: 'SN001',
        type: 'sensor',
        model: 'Model-X',
      };
      const mockDevice = { id: 'device-1', name: 'Sensor 1', model: 'Model-X' };
      vi.mocked(iotService.createDevice).mockResolvedValue(mockDevice as any);

      await controller.createDevice(mockReq as Request, mockRes as Response);

      expect(iotService.createDevice).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'Model-X' }),
        'org-1'
      );
    });
  });

  describe('getTelemetry', () => {
    it('should return 400 when deviceId is missing', async () => {
      mockReq.params = {};

      await controller.getTelemetry(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Device ID required' });
    });

    it('should handle service error', async () => {
      mockReq.params = { deviceId: 'device-1' };
      vi.mocked(iotService.getTelemetry).mockRejectedValue(new Error('Service error'));

      await expect(
        controller.getTelemetry(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return telemetry successfully', async () => {
      mockReq.params = { deviceId: 'device-1' };
      const mockTelemetry = [{ timestamp: new Date(), value: 25.5 }];
      vi.mocked(iotService.getTelemetry).mockResolvedValue(mockTelemetry as any);

      await controller.getTelemetry(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockTelemetry);
    });
  });

  describe('getAlerts', () => {
    it('should handle service error', async () => {
      vi.mocked(iotService.getAlerts).mockRejectedValue(new Error('Service error'));

      await expect(
        controller.getAlerts(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return alerts successfully', async () => {
      const mockAlerts = [{ id: 'alert-1', severity: 'high' }];
      vi.mocked(iotService.getAlerts).mockResolvedValue(mockAlerts as any);

      await controller.getAlerts(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockAlerts);
    });
  });
});

