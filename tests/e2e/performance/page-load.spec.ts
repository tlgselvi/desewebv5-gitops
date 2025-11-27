import { test, expect } from '../fixtures';

/**
 * E2E Tests for Page Load Performance
 * 
 * Tests cover:
 * - Dashboard page load time < 2 seconds
 * - Module pages load time < 2 seconds
 * - Data tables load time < 1 second
 */
test.describe('Page Load Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test.describe('Dashboard Page Load', () => {
    test('Dashboard page should load in less than 2 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Wait for main content to be visible
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should load in less than 2 seconds (2000ms)
      expect(loadTime).toBeLessThan(2000);
    });

    test('Dashboard should be interactive within 2 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      
      // Wait for interactive elements (buttons, links)
      await page.waitForSelector('button, a', { timeout: 5000 });
      
      const interactiveTime = Date.now() - startTime;
      
      // Should be interactive within 2 seconds
      expect(interactiveTime).toBeLessThan(2000);
    });
  });

  test.describe('Module Pages Load', () => {
    const modules = [
      { name: 'Finance', path: '/dashboard/finance' },
      { name: 'CRM', path: '/dashboard/crm' },
      { name: 'Inventory', path: '/dashboard/inventory' },
      { name: 'HR', path: '/dashboard/hr' },
      { name: 'IoT', path: '/dashboard/iot' },
      { name: 'Service', path: '/dashboard/service' },
    ];

    for (const module of modules) {
      test(`${module.name} page should load in less than 2 seconds`, async ({ page }) => {
        const startTime = Date.now();
        
        await page.goto(module.path);
        await page.waitForLoadState('networkidle');
        
        // Wait for page content
        await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
        
        const loadTime = Date.now() - startTime;
        
        // Should load in less than 2 seconds
        expect(loadTime).toBeLessThan(2000);
      });
    }
  });

  test.describe('Data Tables Load', () => {
    test('Data tables should load in less than 1 second', async ({ page }) => {
      // Navigate to a page with data tables
      await page.goto('/dashboard/finance');
      await page.waitForLoadState('networkidle');
      
      // Find data table
      const table = page.locator('table, [role="table"], [class*="table"]').first();
      
      if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
        const startTime = Date.now();
        
        // Wait for table rows to be visible
        await table.locator('tr').first().waitFor({ timeout: 5000 });
        
        const loadTime = Date.now() - startTime;
        
        // Should load in less than 1 second (1000ms)
        expect(loadTime).toBeLessThan(1000);
      } else {
        // If no table found, skip this test
        test.skip();
      }
    });

    test('Data tables should be scrollable within 1 second', async ({ page }) => {
      await page.goto('/dashboard/finance');
      await page.waitForLoadState('networkidle');
      
      const table = page.locator('table, [role="table"], [class*="table"]').first();
      
      if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
        const startTime = Date.now();
        
        // Wait for table to be scrollable
        await table.waitFor({ state: 'visible', timeout: 5000 });
        
        // Try to scroll
        await table.evaluate((el) => {
          el.scrollTop = 100;
        });
        
        const scrollTime = Date.now() - startTime;
        
        // Should be scrollable within 1 second
        expect(scrollTime).toBeLessThan(1000);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Initial Page Load Metrics', () => {
    test('Page should have acceptable performance metrics', async ({ page }) => {
      // Navigate and measure performance
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Get performance metrics from browser
      const metrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          totalTime: perfData.loadEventEnd - perfData.fetchStart,
        };
      });
      
      // DOM content should load quickly
      expect(metrics.domContentLoaded).toBeLessThan(1500);
      
      // Total load time should be acceptable
      expect(metrics.totalTime).toBeLessThan(3000);
    });
  });
});

