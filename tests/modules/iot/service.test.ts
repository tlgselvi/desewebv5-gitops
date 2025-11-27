import { describe, it, expect, beforeEach, vi } from 'vitest';
import { iotService } from '@/modules/iot/service.js';
import { db } from '@/db/index.js';
import { devices, telemetry, deviceCommands, deviceStatusHistory } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';

// Mock dependencies
vi.mock('@/db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/services/iot/mqtt-client.js', () => ({
  mqttClient: {
    publish: vi.fn(),
  },
}));

describe('IoTService', () => {
  const mockOrgId = 'org-123';
  const mockDeviceId = 'device-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDevices', () => {
    it('should return devices for organization', async () => {
      const mockDevices = [
        { id: mockDeviceId, organizationId: mockOrgId, name: 'Test Device' },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDevices),
        }),
      } as any);

      const result = await iotService.getDevices(mockOrgId);
      expect(result).toEqual(mockDevices);
    });
  });

  describe('sendCommand', () => {
    it('should send command to device via MQTT', async () => {
      const mockDevice = {
        id: mockDeviceId,
        organizationId: mockOrgId,
        isActive: true,
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockDevice]),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'cmd-123' }]),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await iotService.sendCommand(
        mockDeviceId,
        mockOrgId,
        'set_pump',
        { pump_id: 1, state: 'on' },
        30
      );

      expect(result).toBeDefined();
      expect(db.insert).toHaveBeenCalled();
    });

    it('should throw error if device not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await expect(
        iotService.sendCommand(mockDeviceId, mockOrgId, 'set_pump', {})
      ).rejects.toThrow('Device not found or inactive');
    });
  });

  describe('getCommands', () => {
    it('should return commands for device', async () => {
      const mockCommands = [
        {
          id: 'cmd-1',
          deviceId: mockDeviceId,
          command: 'set_pump',
          status: 'executed',
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockCommands),
            }),
          }),
        }),
      } as any);

      const result = await iotService.getCommands(mockDeviceId, mockOrgId);
      expect(result).toEqual(mockCommands);
    });
  });

  describe('getStatusHistory', () => {
    it('should return status history for device', async () => {
      const mockHistory = [
        {
          id: 'hist-1',
          deviceId: mockDeviceId,
          status: 'online',
          timestamp: new Date(),
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockHistory),
            }),
          }),
        }),
      } as any);

      const result = await iotService.getStatusHistory(mockDeviceId, mockOrgId);
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getDeviceHealth', () => {
    it('should return device health metrics', async () => {
      const mockDevice = {
        id: mockDeviceId,
        organizationId: mockOrgId,
        status: 'online',
        lastSeen: new Date(),
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockDevice]),
            }),
          }),
        }),
      } as any);

      const result = await iotService.getDeviceHealth(mockDeviceId, mockOrgId);
      expect(result).toBeDefined();
      expect(result.deviceId).toBe(mockDeviceId);
    });
  });

  describe('getDashboardSummary', () => {
    it('should return dashboard summary', async () => {
      const mockDevices = [
        { id: mockDeviceId, organizationId: mockOrgId, status: 'online' },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDevices),
        }),
      } as any);

      const result = await iotService.getDashboardSummary(mockOrgId);
      expect(result).toBeDefined();
      expect(result.totalDevices).toBeGreaterThanOrEqual(0);
    });
  });
});
