import { test, expect } from '../fixtures';

/**
 * E2E Tests for API Response Time
 * 
 * Tests cover:
 * - API response time < 500ms (p95)
 * - API response time < 200ms (p50)
 */
test.describe('API Response Time', () => {
  let authToken: string | null = null;

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    
    authToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(authToken).toBeTruthy();
  });

  test.describe('API Response Time - p50 (Median)', () => {
    test('Finance API endpoints should respond in less than 200ms (p50)', async ({ request }) => {
      const responseTimes: number[] = [];
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const response = await request.get('/api/v1/finance/invoices', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      
      // Calculate median (p50)
      responseTimes.sort((a, b) => a - b);
      const median = responseTimes[Math.floor(responseTimes.length / 2)];
      
      // Median should be less than 200ms
      expect(median).toBeLessThan(200);
    });

    test('CRM API endpoints should respond in less than 200ms (p50)', async ({ request }) => {
      const responseTimes: number[] = [];
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const response = await request.get('/api/v1/crm/kanban', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      
      responseTimes.sort((a, b) => a - b);
      const median = responseTimes[Math.floor(responseTimes.length / 2)];
      
      expect(median).toBeLessThan(200);
    });

    test('Inventory API endpoints should respond in less than 200ms (p50)', async ({ request }) => {
      const responseTimes: number[] = [];
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const response = await request.get('/api/v1/inventory/products', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      
      responseTimes.sort((a, b) => a - b);
      const median = responseTimes[Math.floor(responseTimes.length / 2)];
      
      expect(median).toBeLessThan(200);
    });
  });

  test.describe('API Response Time - p95 (95th Percentile)', () => {
    test('Finance API endpoints should respond in less than 500ms (p95)', async ({ request }) => {
      const responseTimes: number[] = [];
      const iterations = 20; // More iterations for better p95 calculation
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const response = await request.get('/api/v1/finance/invoices', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      
      // Calculate p95 (95th percentile)
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p95 = responseTimes[p95Index];
      
      // p95 should be less than 500ms
      expect(p95).toBeLessThan(500);
    });

    test('CRM API endpoints should respond in less than 500ms (p95)', async ({ request }) => {
      const responseTimes: number[] = [];
      const iterations = 20;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const response = await request.get('/api/v1/crm/kanban', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p95 = responseTimes[p95Index];
      
      expect(p95).toBeLessThan(500);
    });

    test('Multiple API endpoints should have consistent response times', async ({ request }) => {
      const endpoints = [
        '/api/v1/finance/invoices',
        '/api/v1/crm/kanban',
        '/api/v1/inventory/products',
        '/api/v1/hr/employees',
      ];
      
      const allResponseTimes: number[] = [];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        const response = await request.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });
        
        const responseTime = Date.now() - startTime;
        allResponseTimes.push(responseTime);
      }
      
      // Calculate average
      const average = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
      
      // Average should be reasonable (less than 300ms)
      expect(average).toBeLessThan(300);
    });
  });

  test.describe('API Response Time Under Load', () => {
    test('API should handle concurrent requests efficiently', async ({ request }) => {
      const concurrentRequests = 5;
      const startTime = Date.now();
      
      // Make concurrent requests
      const promises = Array.from({ length: concurrentRequests }, () =>
        request.get('/api/v1/finance/invoices', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        })
      );
      
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / concurrentRequests;
      
      // Average time per request should be reasonable
      expect(averageTime).toBeLessThan(500);
    });
  });
});

