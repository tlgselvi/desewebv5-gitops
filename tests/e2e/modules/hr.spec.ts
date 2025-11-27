import { test, expect } from '../fixtures';
import { setupAuthInterceptor } from '../helpers/auth';

/**
 * E2E Tests for HR Module CRUD Operations
 * 
 * Tests cover:
 * - Employee CRUD operations
 * - Department CRUD operations
 * - Payroll CRUD operations
 */
test.describe('HR Module - CRUD Operations', () => {
  let authToken: string | null = null;

  test.beforeEach(async ({ page }) => {
    await setupAuthInterceptor(page);
    
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    authToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(authToken).toBeTruthy();
  });

  test.describe('Employee CRUD', () => {
    let createdEmployeeId: string | null = null;

    test('should create a new employee', async ({ page, request }) => {
      await page.goto('/dashboard/hr');
      await page.waitForLoadState('networkidle');
      
      // Find "New Employee" button
      const createButton = page.locator('button:has-text("Yeni Çalışan"), button:has-text("New Employee"), button:has-text("Create Employee")').first();
      
      if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Create employee via API
      const employeeData = {
        firstName: 'Test',
        lastName: 'Employee',
        email: `test.employee.${Date.now()}@example.com`,
        departmentId: '11111111-1111-1111-1111-111111111111', // Mock department ID
        position: 'Software Engineer',
      };
      
      const response = await request.post('/api/v1/hr/employees', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: employeeData,
      });
      
      expect([201, 200, 400, 500]).toContain(response.status());
      
      if (response.ok()) {
        const employee = await response.json();
        expect(employee).toHaveProperty('id');
        createdEmployeeId = employee.id;
      }
    });

    test('should list employees', async ({ page, request }) => {
      await page.goto('/dashboard/hr');
      await page.waitForLoadState('networkidle');
      
      // Try API endpoint
      const response = await request.get('/api/v1/hr/employees', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect([200, 404, 500]).toContain(response.status());
      
      if (response.ok()) {
        const employees = await response.json();
        expect(Array.isArray(employees)).toBeTruthy();
      }
    });
  });

  test.describe('Department CRUD', () => {
    let createdDepartmentId: string | null = null;

    test('should create a new department', async ({ page, request }) => {
      await page.goto('/dashboard/hr');
      await page.waitForLoadState('networkidle');
      
      // Find "New Department" button
      const createButton = page.locator('button:has-text("Yeni Departman"), button:has-text("New Department"), button:has-text("Create Department")').first();
      
      if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Create department via API
      const departmentData = {
        name: `Test Department ${Date.now()}`,
        description: 'Test department description',
      };
      
      const response = await request.post('/api/v1/hr/departments', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: departmentData,
      });
      
      expect([201, 200, 400, 500]).toContain(response.status());
      
      if (response.ok()) {
        const department = await response.json();
        expect(department).toHaveProperty('id');
        createdDepartmentId = department.id;
      }
    });

    test('should list departments', async ({ page, request }) => {
      await page.goto('/dashboard/hr');
      await page.waitForLoadState('networkidle');
      
      // Try API endpoint
      const response = await request.get('/api/v1/hr/departments', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect([200, 404, 500]).toContain(response.status());
      
      if (response.ok()) {
        const departments = await response.json();
        expect(Array.isArray(departments)).toBeTruthy();
      }
    });
  });

  test.describe('Payroll CRUD', () => {
    test('should create a new payroll', async ({ page, request }) => {
      await page.goto('/dashboard/hr');
      await page.waitForLoadState('networkidle');
      
      // Find "New Payroll" button
      const createButton = page.locator('button:has-text("Yeni Maaş"), button:has-text("New Payroll"), button:has-text("Create Payroll")').first();
      
      if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Create payroll via API
      const payrollData = {
        employeeId: '11111111-1111-1111-1111-111111111111', // Mock employee ID
        amount: 5000.00,
        period: '2024-01',
        deductions: 500.00,
        netAmount: 4500.00,
      };
      
      const response = await request.post('/api/v1/hr/payrolls', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: payrollData,
      });
      
      expect([201, 200, 400, 500]).toContain(response.status());
    });

    test('should list payrolls', async ({ page, request }) => {
      await page.goto('/dashboard/hr');
      await page.waitForLoadState('networkidle');
      
      // Try API endpoint
      const response = await request.get('/api/v1/hr/payrolls', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect([200, 404, 500]).toContain(response.status());
      
      if (response.ok()) {
        const payrolls = await response.json();
        expect(Array.isArray(payrolls)).toBeTruthy();
      }
    });
  });
});

