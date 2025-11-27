import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceService } from '@/modules/service/service.js';
import { db } from '@/db/index.js';
import { serviceRequests, technicians, maintenancePlans } from '@/db/schema/service.js';
import { logger } from '@/utils/logger.js';

// Mock dependencies
vi.mock('@/db/index.js');
vi.mock('@/utils/logger.js');

describe('ServiceService', () => {
  let serviceService: ServiceService;
  const mockDb = db as any;

  beforeEach(() => {
    vi.clearAllMocks();
    serviceService = new ServiceService();
  });

  describe('createServiceRequest', () => {
    it('should create service request successfully', async () => {
      const mockRequest = {
        id: 'request-1',
        organizationId: 'org-1',
        requestNumber: 'SR-1234567890-ABC',
        title: 'Fix pool pump',
        status: 'open',
        priority: 'medium',
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRequest]),
        }),
      });

      const result = await serviceService.createServiceRequest({
        organizationId: 'org-1',
        title: 'Fix pool pump',
      });

      expect(result).toEqual(mockRequest);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it('should create service request with all optional fields', async () => {
      const mockRequest = {
        id: 'request-1',
        organizationId: 'org-1',
        contactId: 'contact-1',
        requestNumber: 'SR-1234567890-ABC',
        title: 'Fix pool pump',
        description: 'Pool pump is not working',
        priority: 'high',
        category: 'maintenance',
        requestedBy: 'user-1',
        scheduledDate: new Date(),
        location: { address: '123 Main St', latitude: 40.7128, longitude: -74.0060 },
        status: 'open',
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRequest]),
        }),
      });

      const result = await serviceService.createServiceRequest({
        organizationId: 'org-1',
        contactId: 'contact-1',
        title: 'Fix pool pump',
        description: 'Pool pump is not working',
        priority: 'high',
        category: 'maintenance',
        requestedBy: 'user-1',
        scheduledDate: new Date(),
        location: { address: '123 Main St', latitude: 40.7128, longitude: -74.0060 },
      });

      expect(result).toEqual(mockRequest);
    });

    it('should use default priority when not provided', async () => {
      const mockRequest = {
        id: 'request-1',
        organizationId: 'org-1',
        requestNumber: 'SR-1234567890-ABC',
        title: 'Fix pool pump',
        priority: 'medium',
        status: 'open',
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRequest]),
        }),
      });

      await serviceService.createServiceRequest({
        organizationId: 'org-1',
        title: 'Fix pool pump',
      });

      // Verify insert was called with correct priority
      expect(mockDb.insert).toHaveBeenCalled();
      const valuesFn = mockDb.insert.mock.results[0].value.values;
      const valuesCall = valuesFn.mock.calls[0][0];
      expect(valuesCall.priority).toBe('medium');
    });

    it('should throw error when creation fails', async () => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        serviceService.createServiceRequest({
          organizationId: 'org-1',
          title: 'Fix pool pump',
        })
      ).rejects.toThrow('Failed to create service request');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle database insert error', async () => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database insert error')),
        }),
      });

      await expect(
        serviceService.createServiceRequest({
          organizationId: 'org-1',
          title: 'Fix pool pump',
        })
      ).rejects.toThrow('Database insert error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getServiceRequests', () => {
    it('should get all service requests for organization', async () => {
      const mockRequests = [
        { id: 'request-1', organizationId: 'org-1', title: 'Request 1' },
        { id: 'request-2', organizationId: 'org-1', title: 'Request 2' },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockRequests),
          }),
        }),
      });

      const result = await serviceService.getServiceRequests('org-1');

      expect(result).toEqual(mockRequests);
    });

    it('should filter by status', async () => {
      const mockRequests = [
        { id: 'request-1', organizationId: 'org-1', status: 'open' },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockRequests),
          }),
        }),
      });

      const result = await serviceService.getServiceRequests('org-1', { status: 'open' });

      expect(result).toEqual(mockRequests);
    });

    it('should filter by assignedTo and priority', async () => {
      const mockRequests = [
        { id: 'request-1', organizationId: 'org-1', assignedTo: 'tech-1', priority: 'high' },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockRequests),
          }),
        }),
      });

      const result = await serviceService.getServiceRequests('org-1', {
        assignedTo: 'tech-1',
        priority: 'high',
      });

      expect(result).toEqual(mockRequests);
    });

    it('should handle database query error', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockRejectedValue(new Error('Database query error')),
          }),
        }),
      });

      await expect(serviceService.getServiceRequests('org-1')).rejects.toThrow('Database query error');
    });
  });

  describe('assignTechnician', () => {
    it('should assign technician to service request', async () => {
      const mockTechnician = {
        id: 'tech-1',
        organizationId: 'org-1',
        userId: 'user-1',
      };

      const mockUpdatedRequest = {
        id: 'request-1',
        organizationId: 'org-1',
        assignedTo: 'tech-1',
        status: 'assigned',
      };

      mockDb.query = {
        technicians: {
          findFirst: vi.fn().mockResolvedValue(mockTechnician),
        },
      };

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdatedRequest]),
          }),
        }),
      });

      const result = await serviceService.assignTechnician('request-1', 'tech-1', 'org-1');

      expect(result).toEqual(mockUpdatedRequest);
      expect(result.status).toBe('assigned');
      expect(result.assignedTo).toBe('tech-1');
    });

    it('should throw error when technician not found', async () => {
      mockDb.query = {
        technicians: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      };

      await expect(
        serviceService.assignTechnician('request-1', 'non-existent', 'org-1')
      ).rejects.toThrow('Technician not found or organization mismatch');
    });

    it('should handle database query error when fetching technician', async () => {
      mockDb.query = {
        technicians: {
          findFirst: vi.fn().mockRejectedValue(new Error('Database query error')),
        },
      };

      await expect(
        serviceService.assignTechnician('request-1', 'tech-1', 'org-1')
      ).rejects.toThrow('Database query error');
    });

    it('should handle database update failure (empty array)', async () => {
      const mockTechnician = {
        id: 'tech-1',
        organizationId: 'org-1',
      };

      mockDb.query = {
        technicians: {
          findFirst: vi.fn().mockResolvedValue(mockTechnician),
        },
      };

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await serviceService.assignTechnician('request-1', 'tech-1', 'org-1');

      expect(result).toBeUndefined();
    });

    it('should handle database update error', async () => {
      const mockTechnician = {
        id: 'tech-1',
        organizationId: 'org-1',
      };

      mockDb.query = {
        technicians: {
          findFirst: vi.fn().mockResolvedValue(mockTechnician),
        },
      };

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('Database update error')),
          }),
        }),
      });

      await expect(
        serviceService.assignTechnician('request-1', 'tech-1', 'org-1')
      ).rejects.toThrow('Database update error');
    });
  });

  describe('createTechnician', () => {
    it('should create technician successfully', async () => {
      const mockTechnician = {
        id: 'tech-1',
        organizationId: 'org-1',
        userId: 'user-1',
        employeeNumber: 'EMP001',
        specialization: ['pool_maintenance'],
        skillLevel: 'senior',
        hourlyRate: '50.00',
        availability: 'available',
        isActive: true,
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTechnician]),
        }),
      });

      const result = await serviceService.createTechnician({
        organizationId: 'org-1',
        userId: 'user-1',
        employeeNumber: 'EMP001',
        specialization: ['pool_maintenance'],
        skillLevel: 'senior',
        hourlyRate: 50,
      });

      expect(result).toEqual(mockTechnician);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should use default values when optional fields not provided', async () => {
      const mockTechnician = {
        id: 'tech-1',
        organizationId: 'org-1',
        userId: 'user-1',
        specialization: [],
        skillLevel: 'intermediate',
        availability: 'available',
        isActive: true,
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTechnician]),
        }),
      });

      await serviceService.createTechnician({
        organizationId: 'org-1',
        userId: 'user-1',
      });

      // Verify insert was called with correct defaults
      expect(mockDb.insert).toHaveBeenCalled();
      const valuesFn = mockDb.insert.mock.results[0].value.values;
      const valuesCall = valuesFn.mock.calls[0][0];
      expect(valuesCall.skillLevel).toBe('intermediate');
      expect(valuesCall.specialization).toEqual([]);
    });

    it('should throw error when creation fails', async () => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        serviceService.createTechnician({
          organizationId: 'org-1',
          userId: 'user-1',
        })
      ).rejects.toThrow('Failed to create technician');
    });

    it('should handle database insert error', async () => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database insert error')),
        }),
      });

      await expect(
        serviceService.createTechnician({
          organizationId: 'org-1',
          userId: 'user-1',
        })
      ).rejects.toThrow('Database insert error');
    });
  });

  describe('getTechnicians', () => {
    it('should get all technicians for organization', async () => {
      const mockTechnicians = [
        { id: 'tech-1', organizationId: 'org-1', userId: 'user-1' },
        { id: 'tech-2', organizationId: 'org-1', userId: 'user-2' },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockTechnicians),
          }),
        }),
      });

      const result = await serviceService.getTechnicians('org-1');

      expect(result).toEqual(mockTechnicians);
    });

    it('should filter by availability', async () => {
      const mockTechnicians = [
        { id: 'tech-1', organizationId: 'org-1', availability: 'available' },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockTechnicians),
          }),
        }),
      });

      const result = await serviceService.getTechnicians('org-1', { availability: 'available' });

      expect(result).toEqual(mockTechnicians);
    });

    it('should filter by isActive', async () => {
      const mockTechnicians = [
        { id: 'tech-1', organizationId: 'org-1', isActive: true },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockTechnicians),
          }),
        }),
      });

      const result = await serviceService.getTechnicians('org-1', { isActive: true });

      expect(result).toEqual(mockTechnicians);
    });

    it('should handle database query error', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockRejectedValue(new Error('Database query error')),
          }),
        }),
      });

      await expect(serviceService.getTechnicians('org-1')).rejects.toThrow('Database query error');
    });
  });

  describe('createMaintenancePlan', () => {
    it('should create maintenance plan successfully', async () => {
      const startDate = new Date('2025-01-01');
      const mockPlan = {
        id: 'plan-1',
        organizationId: 'org-1',
        name: 'Monthly Pool Maintenance',
        planType: 'preventive',
        frequency: 'monthly',
        startDate,
        nextScheduledDate: new Date('2025-02-01'),
        isActive: true,
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPlan]),
        }),
      });

      const result = await serviceService.createMaintenancePlan({
        organizationId: 'org-1',
        name: 'Monthly Pool Maintenance',
        planType: 'preventive',
        frequency: 'monthly',
        startDate,
      });

      expect(result).toEqual(mockPlan);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should calculate next scheduled date for different frequencies', async () => {
      const startDate = new Date('2025-01-01');
      const frequencies: Array<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'> = [
        'daily',
        'weekly',
        'monthly',
        'quarterly',
        'yearly',
      ];

      for (const frequency of frequencies) {
        const mockPlan = {
          id: `plan-${frequency}`,
          organizationId: 'org-1',
          name: `Test ${frequency}`,
          planType: 'preventive' as const,
          frequency,
          startDate,
          nextScheduledDate: new Date(),
          isActive: true,
        };

        mockDb.insert = vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockPlan]),
          }),
        });

        await serviceService.createMaintenancePlan({
          organizationId: 'org-1',
          name: `Test ${frequency}`,
          planType: 'preventive',
          frequency,
          startDate,
        });

        expect(mockDb.insert).toHaveBeenCalled();
      }
    });

    it('should create plan with all optional fields', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');
      const mockPlan = {
        id: 'plan-1',
        organizationId: 'org-1',
        contactId: 'contact-1',
        name: 'Comprehensive Maintenance',
        description: 'Full maintenance plan',
        planType: 'preventive',
        frequency: 'monthly',
        frequencyValue: 2,
        startDate,
        endDate,
        assignedTechnicianId: 'tech-1',
        estimatedDuration: 120,
        estimatedCost: '500.00',
        tasks: [{ id: 'task-1', title: 'Task 1', order: 1 }],
        isActive: true,
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPlan]),
        }),
      });

      const result = await serviceService.createMaintenancePlan({
        organizationId: 'org-1',
        contactId: 'contact-1',
        name: 'Comprehensive Maintenance',
        description: 'Full maintenance plan',
        planType: 'preventive',
        frequency: 'monthly',
        frequencyValue: 2,
        startDate,
        endDate,
        assignedTechnicianId: 'tech-1',
        estimatedDuration: 120,
        estimatedCost: 500,
        tasks: [{ id: 'task-1', title: 'Task 1', order: 1 }],
      });

      expect(result).toEqual(mockPlan);
    });

    it('should throw error when creation fails', async () => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        serviceService.createMaintenancePlan({
          organizationId: 'org-1',
          name: 'Test Plan',
          planType: 'preventive',
          frequency: 'monthly',
          startDate: new Date(),
        })
      ).rejects.toThrow('Failed to create maintenance plan');
    });

    it('should handle database insert error', async () => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database insert error')),
        }),
      });

      await expect(
        serviceService.createMaintenancePlan({
          organizationId: 'org-1',
          name: 'Test Plan',
          planType: 'preventive',
          frequency: 'monthly',
          startDate: new Date(),
        })
      ).rejects.toThrow('Database insert error');
    });

    it('should handle custom frequency with default fallback', async () => {
      const startDate = new Date('2025-01-01');
      const mockPlan = {
        id: 'plan-1',
        organizationId: 'org-1',
        name: 'Custom Plan',
        planType: 'preventive' as const,
        frequency: 'custom' as const,
        startDate,
        nextScheduledDate: new Date('2025-01-31'), // Default to 30 days
        isActive: true,
      };

      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPlan]),
        }),
      });

      const result = await serviceService.createMaintenancePlan({
        organizationId: 'org-1',
        name: 'Custom Plan',
        planType: 'preventive',
        frequency: 'custom',
        startDate,
      });

      expect(result).toEqual(mockPlan);
    });
  });

  describe('getMaintenancePlans', () => {
    it('should get all maintenance plans for organization', async () => {
      const mockPlans = [
        { id: 'plan-1', organizationId: 'org-1', name: 'Plan 1' },
        { id: 'plan-2', organizationId: 'org-1', name: 'Plan 2' },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockPlans),
          }),
        }),
      });

      const result = await serviceService.getMaintenancePlans('org-1');

      expect(result).toEqual(mockPlans);
    });

    it('should filter by isActive', async () => {
      const mockPlans = [
        { id: 'plan-1', organizationId: 'org-1', isActive: true },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockPlans),
          }),
        }),
      });

      const result = await serviceService.getMaintenancePlans('org-1', { isActive: true });

      expect(result).toEqual(mockPlans);
    });

    it('should filter by planType', async () => {
      const mockPlans = [
        { id: 'plan-1', organizationId: 'org-1', planType: 'preventive' },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockPlans),
          }),
        }),
      });

      const result = await serviceService.getMaintenancePlans('org-1', { planType: 'preventive' });

      expect(result).toEqual(mockPlans);
    });

    it('should handle database query error', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockRejectedValue(new Error('Database query error')),
          }),
        }),
      });

      await expect(serviceService.getMaintenancePlans('org-1')).rejects.toThrow('Database query error');
    });
  });
});

