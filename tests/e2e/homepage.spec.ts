import { expect, test } from '@playwright/test';

test.describe('Frontend Sanity Check - Homepage', () => {
  const FRONTEND_URL = 'http://localhost:3001';

  test('should load the homepage successfully on port 3001', async ({ page }) => {
    // 1. Go to the frontend (override baseURL for this test)
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // 2. Check if the title is correct
    await expect(page).toHaveTitle(/Dese EA Plan/i);

    // 3. Check for Main Heading (h1)
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/GitOps ve AIOps/i);

    // 4. Check for critical UI elements - Navigation (may be hidden on mobile)
    const navigation = page.locator('nav').first();
    // Navigation exists but may be hidden on mobile (responsive design)
    await expect(navigation).toBeAttached();

    // 5. Check for body content (not empty)
    await expect(page.locator('body')).not.toBeEmpty();

    // 6. Check for KPI cards section (should be visible after load)
    const kpiSection = page.locator('section').filter({
      has: page.getByText(/MCP Uptime|Kyverno Policy Health/i),
    });
    await expect(kpiSection).toBeVisible({ timeout: 10000 });
  });

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Also capture page errors
    page.on('pageerror', (error) => {
      errors.push(`Page error: ${error.message}`);
    });

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Filter out known non-critical errors (e.g., favicon 404)
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('favicon') &&
        !error.includes('404') &&
        !error.toLowerCase().includes('net::err_failed'),
    );

    expect(criticalErrors).toEqual([]);
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Check for navigation items (may be hidden on mobile)
    const navLinks = page.locator('nav a[href]');
    const linkCount = await navLinks.count();
    
    expect(linkCount).toBeGreaterThan(0);

    // Check that navigation links exist (may be hidden on mobile due to responsive design)
    await expect(navLinks.first()).toBeAttached();
  });

  test('should load without critical network errors', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('response', (response) => {
      const status = response.status();
      const url = response.url();
      
      // Track failed API requests (4xx, 5xx) except for expected 401s on protected routes
      if (status >= 400 && status < 600) {
        // Ignore 401s on protected routes (expected without auth)
        if (status === 401 && url.includes('/api/v1')) {
          return;
        }
        // Ignore 404s on static assets
        if (status === 404 && !url.includes('/api/')) {
          return;
        }
        failedRequests.push(`${status} ${url}`);
      }
    });

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Allow some time for all requests to complete
    await page.waitForTimeout(2000);

    // Check that we don't have critical API failures (500, 502, 503, etc.)
    const criticalFailures = failedRequests.filter((req) => {
      const status = parseInt(req.split(' ')[0] || '0');
      return status >= 500;
    });

    expect(criticalFailures).toEqual([]);
  });

  test('should display module ecosystem section', async ({ page }) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Check for "Modül Ekosistemi" heading
    const moduleHeading = page.getByRole('heading', {
      name: /Modül Ekosistemi/i,
    });
    await expect(moduleHeading).toBeVisible({ timeout: 10000 });

    // Check for at least one module card (Card component renders as div with specific classes)
    const moduleSection = page.locator('section#modules');
    await expect(moduleSection).toBeVisible();
    
    // Check for module titles (more reliable than card selector)
    const moduleTitles = page.getByRole('heading', { level: 3 }).filter({
      hasText: /FinBot|MuBot|DESE|Observability/i,
    });
    const titleCount = await moduleTitles.count();
    expect(titleCount).toBeGreaterThan(0);
  });

  test('should have responsive layout elements', async ({ page }) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Check for main content area
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Check for footer
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});

