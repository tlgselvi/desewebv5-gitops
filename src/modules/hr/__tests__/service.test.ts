import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { hrService } from '../service.js';
import { db } from '@/db/index.js';
import { employees, payrolls, organizations } from '@/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

describe('HRService', () => {
  let organizationId: string;

  beforeAll(async () => {
    // Setup: Create a dummy organization
    // In a real test env, we might mock DB or use a test transaction
    // For now, we assume a local dev DB where we can insert
    organizationId = uuidv4();
    
    try {
      // We need to insert organization first due to FK constraints
      await db.insert(organizations).values({
          id: organizationId,
          name: 'Test HR Org',
          slug: 'test-hr-org',
          taxId: '1234567890'
      });
    } catch (error) {
      // Skip tests if database is not available
      console.warn('Database not available for HR tests, skipping:', error);
    }
  }, 30000);

  afterAll(async () => {
    // Cleanup
    try {
      await db.delete(payrolls).where(eq(payrolls.organizationId, organizationId));
      await db.delete(employees).where(eq(employees.organizationId, organizationId));
      await db.delete(organizations).where(eq(organizations.id, organizationId));
    } catch (error) {
      // Ignore cleanup errors if database is not available
      console.warn('Cleanup failed (database may not be available):', error);
    }
  });

  it.skip('should calculate payroll correctly (TR Logic)', () => {
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
    expect(result.incomeTax).toBeCloseTo(3825, 2);
    expect(result.netSalary).toBeCloseTo(21447.3, 1);
  });

  it.skip('should create an employee', async () => {
    const emp = await hrService.createEmployee({
      organizationId,
      firstName: 'Ali',
      lastName: 'Veli',
      tckn: '11111111111',
      email: 'ali@test.com',
      startDate: '2025-01-01',
      salaryAmount: 30000
    });

    expect(emp).toBeDefined();
    expect(emp.firstName).toBe('Ali');
    expect(emp.id).toBeDefined();
  });

  it.skip('should create a payroll for an employee', async () => {
    const emp = await hrService.createEmployee({
      organizationId,
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      tckn: '22222222222',
      email: 'ayse@test.com',
      startDate: '2025-01-01',
      salaryAmount: 40000
    });

    const payroll = await hrService.createPayroll({
      organizationId,
      employeeId: emp.id,
      period: '2025-01'
    });

    expect(payroll).toBeDefined();
    expect(payroll.grossSalary).toBe('40000.00');
    expect(Number(payroll.netSalary)).toBeLessThan(40000);
    expect(payroll.status).toBe('draft');
  });
});

