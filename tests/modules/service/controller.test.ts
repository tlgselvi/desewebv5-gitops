import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { ServiceController } from '@/modules/service/controller.js';
import { serviceService } from '@/modules/service/service.js';
import type { RequestWithUser } from '@/middleware/auth.js';

// Mock dependencies
vi.mock('@/modules/service/service.js', () => ({
  serviceService: {
    createServiceRequest: vi.fn(),
    getServiceRequests: vi.fn(),
    assignTechnician: vi.fn(),
    createTechnician: vi.fn(),
    getTechnicians: vi.fn(),
    createMaintenancePlan: vi.fn(),
    getMaintenancePlans: vi.fn(),
  },
}));

describe('Service Controller - Error Handling Branch Tests', () => {
  let controller: ServiceController;
  let mockReq: Partial<RequestWithUser>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ServiceController();

    mockReq = {
      params: {},
      body: {},
      query: {},
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

  describe('createServiceRequest', () => {
    it('should return 401 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.body = { title: 'Fix pool pump' };

      const result = await controller.createServiceRequest(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 401 when userId is missing', async () => {
      mockReq.user = { organizationId: 'org-1' } as any; // No id
      mockReq.body = { title: 'Fix pool pump' };

      const result = await controller.createServiceRequest(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service error', async () => {
      mockReq.body = { title: 'Fix pool pump' };
      vi.mocked(serviceService.createServiceRequest).mockRejectedValue(new Error('Service error'));

      await expect(
        controller.createServiceRequest(mockReq as RequestWithUser, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return 201 when request is created successfully', async () => {
      mockReq.body = { title: 'Fix pool pump' };
      const mockRequest = { id: 'req-1', title: 'Fix pool pump' };
      vi.mocked(serviceService.createServiceRequest).mockResolvedValue(mockRequest as any);

      await controller.createServiceRequest(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('getServiceRequests', () => {
    it('should return 401 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId

      const result = await controller.getServiceRequests(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service error', async () => {
      vi.mocked(serviceService.getServiceRequests).mockRejectedValue(new Error('Service error'));

      await expect(
        controller.getServiceRequests(mockReq as RequestWithUser, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return requests successfully', async () => {
      const mockRequests = [{ id: 'req-1', title: 'Fix pool pump' }];
      vi.mocked(serviceService.getServiceRequests).mockResolvedValue(mockRequests as any);

      await controller.getServiceRequests(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({ requests: mockRequests });
    });
  });

  describe('assignTechnician', () => {
    it('should return 401 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.params = { requestId: 'req-1' };
      mockReq.body = { technicianId: 'tech-1' };

      const result = await controller.assignTechnician(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 400 when requestId is missing', async () => {
      mockReq.params = {};
      mockReq.body = { technicianId: 'tech-1' };

      const result = await controller.assignTechnician(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'requestId and technicianId are required' });
    });

    it('should return 400 when technicianId is missing', async () => {
      mockReq.params = { requestId: 'req-1' };
      mockReq.body = {};

      const result = await controller.assignTechnician(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'requestId and technicianId are required' });
    });

    it('should handle service error', async () => {
      mockReq.params = { requestId: 'req-1' };
      mockReq.body = { technicianId: 'tech-1' };
      vi.mocked(serviceService.assignTechnician).mockRejectedValue(new Error('Technician not found'));

      await expect(
        controller.assignTechnician(mockReq as RequestWithUser, mockRes as Response)
      ).rejects.toThrow('Technician not found');
    });

    it('should return success when technician is assigned', async () => {
      mockReq.params = { requestId: 'req-1' };
      mockReq.body = { technicianId: 'tech-1' };
      const mockUpdated = { id: 'req-1', assignedTo: 'tech-1' };
      vi.mocked(serviceService.assignTechnician).mockResolvedValue(mockUpdated as any);

      await controller.assignTechnician(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockUpdated);
    });
  });

  describe('createTechnician', () => {
    it('should return 401 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.body = { userId: 'user-2' };

      const result = await controller.createTechnician(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service error', async () => {
      mockReq.body = { userId: 'user-2' };
      vi.mocked(serviceService.createTechnician).mockRejectedValue(new Error('Service error'));

      await expect(
        controller.createTechnician(mockReq as RequestWithUser, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return 201 when technician is created successfully', async () => {
      mockReq.body = { userId: 'user-2' };
      const mockTechnician = { id: 'tech-1', userId: 'user-2' };
      vi.mocked(serviceService.createTechnician).mockResolvedValue(mockTechnician as any);

      await controller.createTechnician(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockTechnician);
    });
  });

  describe('getTechnicians', () => {
    it('should return 401 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId

      const result = await controller.getTechnicians(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service error', async () => {
      vi.mocked(serviceService.getTechnicians).mockRejectedValue(new Error('Service error'));

      await expect(
        controller.getTechnicians(mockReq as RequestWithUser, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return technicians successfully', async () => {
      const mockTechnicians = [{ id: 'tech-1', userId: 'user-2' }];
      vi.mocked(serviceService.getTechnicians).mockResolvedValue(mockTechnicians as any);

      await controller.getTechnicians(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({ technicians: mockTechnicians });
    });

    it('should filter by availability when provided', async () => {
      mockReq.query = { availability: 'available' };
      const mockTechnicians = [{ id: 'tech-1', availability: 'available' }];
      vi.mocked(serviceService.getTechnicians).mockResolvedValue(mockTechnicians as any);

      await controller.getTechnicians(mockReq as RequestWithUser, mockRes as Response);

      expect(serviceService.getTechnicians).toHaveBeenCalledWith('org-1', { availability: 'available' });
    });

    it('should filter by isActive when true', async () => {
      mockReq.query = { isActive: 'true' };
      const mockTechnicians = [{ id: 'tech-1', isActive: true }];
      vi.mocked(serviceService.getTechnicians).mockResolvedValue(mockTechnicians as any);

      await controller.getTechnicians(mockReq as RequestWithUser, mockRes as Response);

      expect(serviceService.getTechnicians).toHaveBeenCalledWith('org-1', { isActive: true });
    });

    it('should filter by isActive when false', async () => {
      mockReq.query = { isActive: 'false' };
      const mockTechnicians = [{ id: 'tech-1', isActive: false }];
      vi.mocked(serviceService.getTechnicians).mockResolvedValue(mockTechnicians as any);

      await controller.getTechnicians(mockReq as RequestWithUser, mockRes as Response);

      expect(serviceService.getTechnicians).toHaveBeenCalledWith('org-1', { isActive: false });
    });
  });

  describe('createMaintenancePlan', () => {
    it('should return 401 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId
      mockReq.body = { name: 'Monthly Check', planType: 'preventive', frequency: 'monthly', startDate: '2024-01-01' };

      const result = await controller.createMaintenancePlan(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service error', async () => {
      mockReq.body = { name: 'Monthly Check', planType: 'preventive', frequency: 'monthly', startDate: '2024-01-01' };
      vi.mocked(serviceService.createMaintenancePlan).mockRejectedValue(new Error('Service error'));

      await expect(
        controller.createMaintenancePlan(mockReq as RequestWithUser, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return 201 when plan is created successfully', async () => {
      mockReq.body = { name: 'Monthly Check', planType: 'preventive', frequency: 'monthly', startDate: '2024-01-01' };
      const mockPlan = { id: 'plan-1', name: 'Monthly Check' };
      vi.mocked(serviceService.createMaintenancePlan).mockResolvedValue(mockPlan as any);

      await controller.createMaintenancePlan(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockPlan);
    });
  });

  describe('getMaintenancePlans', () => {
    it('should return 401 when organizationId is missing', async () => {
      mockReq.user = { id: 'user-1' } as any; // No organizationId

      const result = await controller.getMaintenancePlans(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle service error', async () => {
      vi.mocked(serviceService.getMaintenancePlans).mockRejectedValue(new Error('Service error'));

      await expect(
        controller.getMaintenancePlans(mockReq as RequestWithUser, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return plans successfully', async () => {
      const mockPlans = [{ id: 'plan-1', name: 'Monthly Check' }];
      vi.mocked(serviceService.getMaintenancePlans).mockResolvedValue(mockPlans as any);

      await controller.getMaintenancePlans(mockReq as RequestWithUser, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({ plans: mockPlans });
    });

    it('should filter by isActive when true', async () => {
      mockReq.query = { isActive: 'true' };
      const mockPlans = [{ id: 'plan-1', isActive: true }];
      vi.mocked(serviceService.getMaintenancePlans).mockResolvedValue(mockPlans as any);

      await controller.getMaintenancePlans(mockReq as RequestWithUser, mockRes as Response);

      expect(serviceService.getMaintenancePlans).toHaveBeenCalledWith('org-1', { isActive: true });
    });

    it('should filter by planType when provided', async () => {
      mockReq.query = { planType: 'preventive' };
      const mockPlans = [{ id: 'plan-1', planType: 'preventive' }];
      vi.mocked(serviceService.getMaintenancePlans).mockResolvedValue(mockPlans as any);

      await controller.getMaintenancePlans(mockReq as RequestWithUser, mockRes as Response);

      expect(serviceService.getMaintenancePlans).toHaveBeenCalledWith('org-1', { planType: 'preventive' });
    });
  });
});

