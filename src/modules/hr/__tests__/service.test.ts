import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HRService } from '../service.js';
import { db } from '@/db/index.js';
import { employees, payrolls, departments } from '@/db/schema/hr.js';

// Mock database
vi.mock('@/db/index.js', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

describe('HRService', () => {
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
  });

  describe('getDepartments', () => {
    it('should get all departments for organization', async () => {
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
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe('createEmployee', () => {
    it('should create an employee successfully', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        firstName: 'Ali',
        lastName: 'Veli',
        tckn: '11111111111',
        email: 'ali@test.com',
        startDate: '2025-01-01',
        salaryAmount: '30000.00',
        salaryCurrency: 'TRY',
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      } as any);

      const result = await hrService.createEmployee({
        organizationId: 'org-1',
        firstName: 'Ali',
        lastName: 'Veli',
        tckn: '11111111111',
        email: 'ali@test.com',
        startDate: '2025-01-01',
        salaryAmount: 30000,
      });

      expect(result).toEqual(mockEmployee);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should create employee with optional fields', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        departmentId: 'dept-1',
        firstName: 'Ayşe',
        lastName: 'Yılmaz',
        tckn: '22222222222',
        email: 'ayse@test.com',
        phone: '+905551234567',
        title: 'Senior Developer',
        startDate: '2025-01-01',
        salaryAmount: '40000.00',
        salaryCurrency: 'USD',
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      } as any);

      const result = await hrService.createEmployee({
        organizationId: 'org-1',
        departmentId: 'dept-1',
        firstName: 'Ayşe',
        lastName: 'Yılmaz',
        tckn: '22222222222',
        email: 'ayse@test.com',
        phone: '+905551234567',
        title: 'Senior Developer',
        startDate: '2025-01-01',
        salaryAmount: 40000,
        salaryCurrency: 'USD',
      });

      expect(result).toEqual(mockEmployee);
    });

    it('should use default currency TRY when not provided', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        firstName: 'Mehmet',
        lastName: 'Demir',
        tckn: '33333333333',
        email: 'mehmet@test.com',
        startDate: '2025-01-01',
        salaryAmount: '25000.00',
        salaryCurrency: 'TRY',
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      } as any);

      const result = await hrService.createEmployee({
        organizationId: 'org-1',
        firstName: 'Mehmet',
        lastName: 'Demir',
        tckn: '33333333333',
        email: 'mehmet@test.com',
        startDate: '2025-01-01',
        salaryAmount: 25000,
      });

      expect(result.salaryCurrency).toBe('TRY');
    });
  });

  describe('getEmployees', () => {
    it('should get all employees for organization', async () => {
      const mockEmployees = [
        { id: 'emp-1', organizationId: 'org-1', firstName: 'Ali', lastName: 'Veli' },
        { id: 'emp-2', organizationId: 'org-1', firstName: 'Ayşe', lastName: 'Yılmaz' },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockEmployees),
        }),
      } as any);

      const result = await hrService.getEmployees('org-1');

      expect(result).toEqual(mockEmployees);
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe('getEmployee', () => {
    it('should get employee by id', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        firstName: 'Ali',
        lastName: 'Veli',
        tckn: '11111111111',
        email: 'ali@test.com',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockEmployee]),
        }),
      } as any);

      const result = await hrService.getEmployee('emp-1');

      expect(result).toEqual(mockEmployee);
      expect(db.select).toHaveBeenCalled();
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
  });

  describe('calculateSalary', () => {
    it('should calculate salary correctly (TR Logic)', () => {
      const salary = 30000;
      const result = hrService.calculateSalary(salary);

      // Manual Verification:
      // SGK Worker (14%): 4200
      // Unemployment Worker (1%): 300
      // Base for Tax: 30000 - 4500 = 25500
      // Income Tax (15%): 3825
      // Stamp Tax (0.00759): 227.7
      // Total Deductions: 4200 + 300 + 3825 + 227.7 = 8552.7
      // Net: 30000 - 8552.7 = 21447.3

      expect(result.grossSalary).toBe(30000);
      expect(result.sgkWorkerShare).toBeCloseTo(4200, 2);
      expect(result.unemploymentWorkerShare).toBeCloseTo(300, 2);
      expect(result.incomeTax).toBeCloseTo(3825, 2);
      expect(result.stampTax).toBeCloseTo(227.7, 1);
      expect(result.netSalary).toBeCloseTo(21447.3, 1);
      expect(result.sgkEmployerShare).toBeCloseTo(6150, 2); // 30000 * 0.205
      expect(result.unemploymentEmployerShare).toBeCloseTo(600, 2); // 30000 * 0.02
    });

    it('should handle zero salary', () => {
      const result = hrService.calculateSalary(0);

      expect(result.grossSalary).toBe(0);
      expect(result.netSalary).toBe(0);
      expect(result.sgkWorkerShare).toBe(0);
      expect(result.incomeTax).toBe(0);
    });

    it('should handle high salary', () => {
      const salary = 100000;
      const result = hrService.calculateSalary(salary);

      expect(result.grossSalary).toBe(100000);
      expect(result.netSalary).toBeLessThan(salary);
      expect(result.netSalary).toBeGreaterThan(0);
    });
  });

  describe('createPayroll', () => {
    it('should create payroll successfully', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        salaryAmount: '30000.00',
      };

      const mockPayroll = {
        id: 'payroll-1',
        organizationId: 'org-1',
        employeeId: 'emp-1',
        period: '2025-01',
        grossSalary: '30000.00',
        netSalary: '21447.30',
        status: 'draft',
      };

      // Mock getEmployee
      vi.mocked(db.select).mockReturnValue({
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
        period: '2025-01',
      });

      expect(result).toEqual(mockPayroll);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should create payroll with bonus and overtime', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        salaryAmount: '30000.00',
      };

      const mockPayroll = {
        id: 'payroll-1',
        organizationId: 'org-1',
        employeeId: 'emp-1',
        period: '2025-01',
        grossSalary: '35000.00',
        bonus: '3000.00',
        overtimePay: '2000.00',
        netSalary: '25000.00',
        status: 'draft',
      };

      vi.mocked(db.select).mockReturnValue({
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
        period: '2025-01',
        bonus: 3000,
        overtimePay: 2000,
      });

      expect(result).toEqual(mockPayroll);
    });

    it('should throw error when employee not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await expect(
        hrService.createPayroll({
          organizationId: 'org-1',
          employeeId: 'non-existent',
          period: '2025-01',
        })
      ).rejects.toThrow('Employee not found');
    });
  });

  describe('getPayrolls', () => {
    it('should get all payrolls for organization', async () => {
      const mockPayrolls = [
        { id: 'payroll-1', organizationId: 'org-1', period: '2025-01' },
        { id: 'payroll-2', organizationId: 'org-1', period: '2025-02' },
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
      expect(db.select).toHaveBeenCalled();
    });

    it('should filter payrolls by period', async () => {
      const mockPayrolls = [
        { id: 'payroll-1', organizationId: 'org-1', period: '2025-01' },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockPayrolls),
          }),
        }),
      } as any);

      const result = await hrService.getPayrolls('org-1', '2025-01');

      expect(result).toEqual(mockPayrolls);
      expect(db.select).toHaveBeenCalled();
    });
  });
});

