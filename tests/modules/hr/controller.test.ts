import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import * as hrController from '@/modules/hr/controller.js';
import { hrService } from '@/modules/hr/service.js';

// Mock dependencies
vi.mock('@/modules/hr/service.js', () => ({
  hrService: {
    createDepartment: vi.fn(),
    getDepartments: vi.fn(),
    createEmployee: vi.fn(),
    getEmployees: vi.fn(),
    createPayroll: vi.fn(),
    getPayrolls: vi.fn(),
  },
}));

vi.mock('@/utils/asyncHandler.js', () => ({
  asyncHandler: (fn: any) => fn,
}));

describe('HR Controller - Error Handling Branch Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

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

  describe('createDepartment', () => {
    it('should handle service error', async () => {
      mockReq.body = { name: 'Engineering' };
      vi.mocked(hrService.createDepartment).mockRejectedValue(new Error('Service error'));

      await expect(
        hrController.createDepartment(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return 201 when department is created successfully', async () => {
      mockReq.body = { name: 'Engineering' };
      const mockDepartment = { id: 'dept-1', name: 'Engineering' };
      vi.mocked(hrService.createDepartment).mockResolvedValue(mockDepartment as any);

      await hrController.createDepartment(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockDepartment);
    });
  });

  describe('getDepartments', () => {
    it('should handle service error', async () => {
      vi.mocked(hrService.getDepartments).mockRejectedValue(new Error('Service error'));

      await expect(
        hrController.getDepartments(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return departments successfully', async () => {
      const mockDepartments = [{ id: 'dept-1', name: 'Engineering' }];
      vi.mocked(hrService.getDepartments).mockResolvedValue(mockDepartments as any);

      await hrController.getDepartments(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockDepartments);
    });
  });

  describe('createEmployee', () => {
    it('should handle service error', async () => {
      mockReq.body = { name: 'John Doe', email: 'john@example.com' };
      vi.mocked(hrService.createEmployee).mockRejectedValue(new Error('Service error'));

      await expect(
        hrController.createEmployee(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return 201 when employee is created successfully', async () => {
      mockReq.body = { name: 'John Doe', email: 'john@example.com' };
      const mockEmployee = { id: 'emp-1', name: 'John Doe' };
      vi.mocked(hrService.createEmployee).mockResolvedValue(mockEmployee as any);

      await hrController.createEmployee(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockEmployee);
    });
  });

  describe('getEmployees', () => {
    it('should handle service error', async () => {
      vi.mocked(hrService.getEmployees).mockRejectedValue(new Error('Service error'));

      await expect(
        hrController.getEmployees(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return employees successfully', async () => {
      const mockEmployees = [{ id: 'emp-1', name: 'John Doe' }];
      vi.mocked(hrService.getEmployees).mockResolvedValue(mockEmployees as any);

      await hrController.getEmployees(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockEmployees);
    });
  });

  describe('createPayroll', () => {
    it('should handle service error', async () => {
      mockReq.body = { employeeId: 'emp-1', period: '2024-01', grossAmount: 10000 };
      vi.mocked(hrService.createPayroll).mockRejectedValue(new Error('Employee not found'));

      await expect(
        hrController.createPayroll(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Employee not found');
    });

    it('should return 201 when payroll is created successfully', async () => {
      mockReq.body = { employeeId: 'emp-1', period: '2024-01', grossAmount: 10000 };
      const mockPayroll = { id: 'payroll-1', employeeId: 'emp-1' };
      vi.mocked(hrService.createPayroll).mockResolvedValue(mockPayroll as any);

      await hrController.createPayroll(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockPayroll);
    });
  });

  describe('getPayrolls', () => {
    it('should handle service error', async () => {
      vi.mocked(hrService.getPayrolls).mockRejectedValue(new Error('Service error'));

      await expect(
        hrController.getPayrolls(mockReq as Request, mockRes as Response)
      ).rejects.toThrow('Service error');
    });

    it('should return payrolls successfully', async () => {
      const mockPayrolls = [{ id: 'payroll-1', employeeId: 'emp-1' }];
      vi.mocked(hrService.getPayrolls).mockResolvedValue(mockPayrolls as any);

      await hrController.getPayrolls(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockPayrolls);
    });

    it('should pass period query parameter to service', async () => {
      mockReq.query = { period: '2024-01' };
      const mockPayrolls = [{ id: 'payroll-1', period: '2024-01' }];
      vi.mocked(hrService.getPayrolls).mockResolvedValue(mockPayrolls as any);

      await hrController.getPayrolls(mockReq as Request, mockRes as Response);

      expect(hrService.getPayrolls).toHaveBeenCalledWith('org-1', '2024-01');
    });
  });
});

