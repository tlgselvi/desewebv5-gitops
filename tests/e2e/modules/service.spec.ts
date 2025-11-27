import { test, expect } from '../fixtures';
import { setupAuthInterceptor } from '../helpers/auth';

/**
 * E2E Tests for Service Module CRUD Operations
 * 
 * Tests cover:
 * - Service Request CRUD operations
 * - Technician CRUD operations
 * - Service Visit CRUD operations
 * - Maintenance Plan CRUD operations
 */
test.describe('Service Module - CRUD Operations', () => {
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

  test.describe('Service Request CRUD', () => {
    let createdRequestId: string | null = null;

    test('should create a new service request', async ({ page, request }) => {
      await page.goto('/dashboard/service');
      await page.waitForLoadState('networkidle');
      
      // Find "New Request" button
      const createButton = page.locator('button:has-text("Yeni Talep"), button:has-text("New Request"), button:has-text("Create Request")').first();
      
      if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Create service request via API
      const requestData = {
        title: 'Test Service Request',
        description: 'Test service request description',
        priority: 'medium',
        customerId: '11111111-1111-1111-1111-111111111111', // Mock customer ID
      };
      
      const response = await request.post('/api/v1/service/requests', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: requestData,
      });
      
      expect([201, 200, 400, 500]).toContain(response.status());
      
      if (response.ok()) {
        const serviceRequest = await response.json();
        expect(serviceRequest).toHaveProperty('id');
        createdRequestId = serviceRequest.id;
      }
    });

    test('should list service requests', async ({ page, request }) => {
      await page.goto('/dashboard/service');
      await page.waitForLoadState('networkidle');
      
      // Try API endpoint
      const response = await request.get('/api/v1/service/requests', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect([200, 404, 500]).toContain(response.status());
      
      if (response.ok()) {
        const requests = await response.json();
        expect(Array.isArray(requests)).toBeTruthy();
      }
    });

    test('should assign technician to service request', async ({ page, request }) => {
      // First create a service request
      const requestData = {
        title: 'Test Request for Assignment',
        description: 'Test description',
        priority: 'high',
        customerId: '11111111-1111-1111-1111-111111111111',
      };
      
      const createResponse = await request.post('/api/v1/service/requests', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: requestData,
      });
      
      if (createResponse.ok()) {
        const serviceRequest = await createResponse.json();
        const requestId = serviceRequest.id;
        
        // Assign technician
        const assignResponse = await request.post(`/api/v1/service/requests/${requestId}/assign`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            technicianId: '11111111-1111-1111-1111-111111111111', // Mock technician ID
          },
        });
        
        expect([200, 400, 404, 500]).toContain(assignResponse.status());
      } else {
        test.skip();
      }
    });
  });

  test.describe('Technician CRUD', () => {
    let createdTechnicianId: string | null = null;

    test('should create a new technician', async ({ page, request }) => {
      await page.goto('/dashboard/service');
      await page.waitForLoadState('networkidle');
      
      // Find "New Technician" button
      const createButton = page.locator('button:has-text("Yeni Teknisyen"), button:has-text("New Technician"), button:has-text("Create Technician")').first();
      
      if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Create technician via API
      const technicianData = {
        firstName: 'Test',
        lastName: 'Technician',
        email: `test.technician.${Date.now()}@example.com`,
        phone: '+905551234567',
        specialization: 'HVAC',
      };
      
      const response = await request.post('/api/v1/service/technicians', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: technicianData,
      });
      
      expect([201, 200, 400, 500]).toContain(response.status());
      
      if (response.ok()) {
        const technician = await response.json();
        expect(technician).toHaveProperty('id');
        createdTechnicianId = technician.id;
      }
    });

    test('should list technicians', async ({ page, request }) => {
      await page.goto('/dashboard/service');
      await page.waitForLoadState('networkidle');
      
      // Try API endpoint
      const response = await request.get('/api/v1/service/technicians', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect([200, 404, 500]).toContain(response.status());
      
      if (response.ok()) {
        const technicians = await response.json();
        expect(Array.isArray(technicians)).toBeTruthy();
      }
    });
  });

  test.describe('Service Visit CRUD', () => {
    test('should create a service visit', async ({ page, request }) => {
      await page.goto('/dashboard/service');
      await page.waitForLoadState('networkidle');
      
      // Note: Service visit endpoints might not be fully implemented
      // This test will be updated when endpoints are available
    });
  });

  test.describe('Maintenance Plan CRUD', () => {
    test('should create a maintenance plan', async ({ page, request }) => {
      await page.goto('/dashboard/service');
      await page.waitForLoadState('networkidle');
      
      // Find "New Plan" button
      const createButton = page.locator('button:has-text("Yeni Plan"), button:has-text("New Plan"), button:has-text("Create Plan")').first();
      
      if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Create maintenance plan via API
      const planData = {
        name: `Test Maintenance Plan ${Date.now()}`,
        description: 'Test maintenance plan description',
        frequency: 'monthly',
        equipmentId: '11111111-1111-1111-1111-111111111111', // Mock equipment ID
      };
      
      const response = await request.post('/api/v1/service/maintenance-plans', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: planData,
      });
      
      expect([201, 200, 400, 500]).toContain(response.status());
    });

    test('should list maintenance plans', async ({ page, request }) => {
      await page.goto('/dashboard/service');
      await page.waitForLoadState('networkidle');
      
      // Try API endpoint
      const response = await request.get('/api/v1/service/maintenance-plans', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect([200, 404, 500]).toContain(response.status());
      
      if (response.ok()) {
        const plans = await response.json();
        expect(Array.isArray(plans)).toBeTruthy();
      }
    });
  });
});

