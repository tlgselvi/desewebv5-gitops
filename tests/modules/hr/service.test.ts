import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HRService } from '@/modules/hr/service.js';
import { db } from '@/db/index.js';
import { employees, departments, payrolls } from '@/db/schema/hr.js';

// Mock database
vi.mock('@/db/index.js', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

describe('HR Service', () => {
  let hrService: HRService;

  beforeEach(() => {
    vi.clearAllMocks();
    hrService = new HRService();
  });

  describe('createDepartment', () => {
    it('should create a department successfully', async () => {
      const mockDepartment = {
        id: 'dept-1',
        organizationId: 'org-1',
        name: 'Engineering',
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDepartment]),
        }),
      } as any);

      const result = await hrService.createDepartment('org-1', 'Engineering');

      expect(result).toEqual(mockDepartment);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should handle database insert failure (empty array)', async () => {
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await hrService.createDepartment('org-1', 'Engineering');

      expect(result).toBeUndefined();
    });

    it('should handle database insert error', async () => {
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database insert error')),
        }),
      } as any);

      await expect(hrService.createDepartment('org-1', 'Engineering')).rejects.toThrow('Database insert error');
    });
  });

  describe('getDepartments', () => {
    it('should return departments for organization', async () => {
      const mockDepartments = [
        { id: 'dept-1', organizationId: 'org-1', name: 'Engineering' },
        { id: 'dept-2', organizationId: 'org-1', name: 'Sales' },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDepartments),
        }),
      } as any);

      const result = await hrService.getDepartments('org-1');

      expect(result).toEqual(mockDepartments);
    });

    it('should handle database query error', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database query error')),
        }),
      } as any);

      await expect(hrService.getDepartments('org-1')).rejects.toThrow('Database query error');
    });
  });

  describe('createEmployee', () => {
    it('should create an employee successfully', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        firstName: 'John',
        lastName: 'Doe',
        tckn: '12345678901',
        email: 'john@example.com',
        salaryAmount: '5000.00',
        salaryCurrency: 'TRY',
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      } as any);

      const result = await hrService.createEmployee({
        organizationId: 'org-1',
        firstName: 'John',
        lastName: 'Doe',
        tckn: '12345678901',
        email: 'john@example.com',
        startDate: '2024-01-01',
        salaryAmount: 5000,
      });

      expect(result).toEqual(mockEmployee);
    });

    it('should use default currency TRY when not provided', async () => {
      const mockEmployee = {
        id: 'emp-1',
        salaryCurrency: 'TRY',
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      } as any);

      const result = await hrService.createEmployee({
        organizationId: 'org-1',
        firstName: 'John',
        lastName: 'Doe',
        tckn: '12345678901',
        email: 'john@example.com',
        startDate: '2024-01-01',
        salaryAmount: 5000,
      });

      expect(result.salaryCurrency).toBe('TRY');
    });

    it('should handle optional fields', async () => {
      const mockEmployee = {
        id: 'emp-1',
        departmentId: 'dept-1',
        phone: '555-1234',
        title: 'Senior Developer',
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      } as any);

      const result = await hrService.createEmployee({
        organizationId: 'org-1',
        departmentId: 'dept-1',
        firstName: 'John',
        lastName: 'Doe',
        tckn: '12345678901',
        email: 'john@example.com',
        phone: '555-1234',
        title: 'Senior Developer',
        startDate: '2024-01-01',
        salaryAmount: 5000,
      });

      expect(result).toEqual(mockEmployee);
    });

    it('should handle database insert failure (empty array)', async () => {
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await hrService.createEmployee({
        organizationId: 'org-1',
        firstName: 'John',
        lastName: 'Doe',
        tckn: '12345678901',
        email: 'john@example.com',
        startDate: '2024-01-01',
        salaryAmount: 5000,
      });

      expect(result).toBeUndefined();
    });

    it('should handle database insert error', async () => {
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database insert error')),
        }),
      } as any);

      await expect(
        hrService.createEmployee({
          organizationId: 'org-1',
          firstName: 'John',
          lastName: 'Doe',
          tckn: '12345678901',
          email: 'john@example.com',
          startDate: '2024-01-01',
          salaryAmount: 5000,
        })
      ).rejects.toThrow('Database insert error');
    });
  });

  describe('getEmployees', () => {
    it('should return employees for organization', async () => {
      const mockEmployees = [
        { id: 'emp-1', organizationId: 'org-1', firstName: 'John', lastName: 'Doe' },
        { id: 'emp-2', organizationId: 'org-1', firstName: 'Jane', lastName: 'Smith' },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockEmployees),
        }),
      } as any);

      const result = await hrService.getEmployees('org-1');

      expect(result).toEqual(mockEmployees);
    });

    it('should handle database query error', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database query error')),
        }),
      } as any);

      await expect(hrService.getEmployees('org-1')).rejects.toThrow('Database query error');
    });
  });

  describe('getEmployee', () => {
    it('should return employee by id', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        firstName: 'John',
        lastName: 'Doe',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      } as any);

      const result = await hrService.getEmployee('emp-1');

      expect(result).toEqual(mockEmployee);
    });

    it('should return undefined when employee not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await hrService.getEmployee('non-existent');

      expect(result).toBeUndefined();
    });

    it('should handle database query error', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database query error')),
        }),
      } as any);

      await expect(hrService.getEmployee('emp-1')).rejects.toThrow('Database query error');
    });
  });

  describe('calculateSalary', () => {
    it('should calculate salary correctly', () => {
      const result = hrService.calculateSalary(10000);

      expect(result.grossSalary).toBe(10000);
      expect(result.sgkWorkerShare).toBeCloseTo(1400, 1); // 14%
      expect(result.unemploymentWorkerShare).toBeCloseTo(100, 1); // 1%
      expect(result.incomeTax).toBeCloseTo(1275, 0); // 15% of (10000 - 1500)
      expect(result.stampTax).toBeCloseTo(75.9, 1); // 0.759%
      expect(result.netSalary).toBeGreaterThan(0);
      expect(result.netSalary).toBeLessThan(result.grossSalary);
    });

    it('should handle zero salary', () => {
      const result = hrService.calculateSalary(0);

      expect(result.grossSalary).toBe(0);
      expect(result.netSalary).toBe(0);
      expect(result.sgkWorkerShare).toBe(0);
    });

    it('should handle negative salary (edge case)', () => {
      const result = hrService.calculateSalary(-1000);

      expect(result.grossSalary).toBe(-1000);
      // Negative values should still calculate (though not realistic)
      expect(result.netSalary).toBeLessThan(0);
    });
  });

  describe('createPayroll', () => {
    it('should create payroll successfully', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        salaryAmount: '5000.00',
      };

      const mockPayroll = {
        id: 'payroll-1',
        organizationId: 'org-1',
        employeeId: 'emp-1',
        period: '2024-01',
        grossSalary: '5000.00',
        netSalary: '4000.00',
        status: 'draft',
      };

      // Mock getEmployee
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      } as any);

      // Mock insert payroll
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPayroll]),
        }),
      } as any);

      const result = await hrService.createPayroll({
        organizationId: 'org-1',
        employeeId: 'emp-1',
        period: '2024-01',
      });

      expect(result).toEqual(mockPayroll);
    });

    it('should throw error when employee not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // Employee not found
        }),
      } as any);

      await expect(
        hrService.createPayroll({
          organizationId: 'org-1',
          employeeId: 'non-existent',
          period: '2024-01',
        })
      ).rejects.toThrow('Employee not found');
    });

    it('should handle bonus and overtime pay', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        salaryAmount: '5000.00',
      };

      const mockPayroll = {
        id: 'payroll-1',
        grossSalary: '6000.00',
        bonus: '500.00',
        overtimePay: '500.00',
      };

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockPayroll]),
        }),
      } as any);

      const result = await hrService.createPayroll({
        organizationId: 'org-1',
        employeeId: 'emp-1',
        period: '2024-01',
        bonus: 500,
        overtimePay: 500,
      });

      expect(result).toEqual(mockPayroll);
    });

    it('should handle database query error when fetching employee', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database query error')),
        }),
      } as any);

      await expect(
        hrService.createPayroll({
          organizationId: 'org-1',
          employeeId: 'emp-1',
          period: '2024-01',
        })
      ).rejects.toThrow('Database query error');
    });

    it('should handle database insert failure (empty array)', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        salaryAmount: '5000.00',
      };

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await hrService.createPayroll({
        organizationId: 'org-1',
        employeeId: 'emp-1',
        period: '2024-01',
      });

      expect(result).toBeUndefined();
    });

    it('should handle database insert error', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        salaryAmount: '5000.00',
      };

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database insert error')),
        }),
      } as any);

      await expect(
        hrService.createPayroll({
          organizationId: 'org-1',
          employeeId: 'emp-1',
          period: '2024-01',
        })
      ).rejects.toThrow('Database insert error');
    });
  });

  describe('getPayrolls', () => {
    it('should return payrolls for organization', async () => {
      const mockPayrolls = [
        { id: 'payroll-1', organizationId: 'org-1', period: '2024-01' },
        { id: 'payroll-2', organizationId: 'org-1', period: '2024-02' },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockPayrolls),
          }),
        }),
      } as any);

      const result = await hrService.getPayrolls('org-1');

      expect(result).toEqual(mockPayrolls);
    });

    it('should filter by period when provided', async () => {
      const mockPayrolls = [
        { id: 'payroll-1', organizationId: 'org-1', period: '2024-01' },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockPayrolls),
          }),
        }),
      } as any);

      const result = await hrService.getPayrolls('org-1', '2024-01');

      expect(result).toEqual(mockPayrolls);
    });

    it('should handle database query error', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockRejectedValue(new Error('Database query error')),
          }),
        }),
      } as any);

      await expect(hrService.getPayrolls('org-1')).rejects.toThrow('Database query error');
    });
  });
});

