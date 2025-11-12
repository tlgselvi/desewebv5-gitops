import { expect, test } from '@playwright/test';

test.describe('Observability MCP Dashboard', () => {
  test('renders live health and metric data without errors', async ({ page }) => {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response
            .url()
            .includes('/api/v1/mcp/dashboard/observability') &&
          response.request().method() === 'GET' &&
          response.ok(),
      ),
      page.goto('/mcp/observability'),
    ]);

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Observability MCP/i,
      }),
    ).toBeVisible();

    const healthSection = page
      .locator('section')
      .filter({
        has: page.getByRole('heading', {
          level: 2,
          name: /İzleme Altyapısı Sağlığı/i,
        }),
      });

    const metricsSection = page
      .locator('section')
      .filter({
        has: page.getByRole('heading', {
          level: 2,
          name: /Genel Metrikler/i,
        }),
      });

    await expect(healthSection.locator('.animate-pulse')).toHaveCount(0, {
      timeout: 20000,
    });
    await expect(metricsSection.locator('.animate-pulse')).toHaveCount(0, {
      timeout: 20000,
    });

    await expect(healthSection.locator('text=Son kontrol')).toBeVisible();
    await expect(metricsSection.locator('h3').first()).toBeVisible();

    await expect(page.getByText(/API isteği başarısız/i)).toHaveCount(0);
    await expect(
      page.getByText(/Veri yüklenirken bir hata oluştu/i),
    ).toHaveCount(0);
  });
});


