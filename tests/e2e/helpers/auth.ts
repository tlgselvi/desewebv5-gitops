import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Sets up authentication for API requests by adding Authorization header
 * to all API routes using the token from storageState.json
 */
export async function setupAuthInterceptor(page: Page): Promise<void> {
  const storageStatePath = path.resolve(process.cwd(), 'tests/setup/storageState.json');
  let token: string | null = null;
  
  if (fs.existsSync(storageStatePath)) {
    const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf-8'));
    token = storageState?.origins?.[0]?.localStorage?.find(
      (item: { name: string }) => item.name === 'token'
    )?.value || null;
  }
  
  if (token) {
    // Intercept all API requests and add Authorization header
    await page.route('**/api/**', async (route) => {
      const headers = {
        ...route.request().headers(),
        'Authorization': `Bearer ${token}`,
      };
      await route.continue({ headers });
    });
  }
}

